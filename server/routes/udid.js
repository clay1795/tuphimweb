const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');
const signing = require('../utils/signing');
const manifestGen = require('../utils/manifest');
const plist = require('plist');

// ============================================================
// GET /api/udid/profile?session=xxx
// Returns a .mobileconfig profile that iPhone downloads.
// When iPhone installs the profile, Apple POSTs the UDID back.
// ============================================================
router.get('/profile', (req, res) => {
    const session = req.query.session || uuidv4();
    const domain = process.env.APP_DOMAIN || 'https://tuphim.online';

    // Create session record in DB
    db.createSession(session);

    // Build the mobileconfig plist
    const profileData = {
        PayloadContent: [
            {
                PayloadType: 'com.apple.managed-client.preferences',
                PayloadUUID: uuidv4(),
                PayloadIdentifier: `com.tophim.udid.${session}`,
                PayloadOrganization: 'TuPhim',
                PayloadDisplayName: 'TuPhim Device Registration',
                PayloadDescription: 'Đăng ký thiết bị để cài TuPhim',
                PayloadVersion: 1,
                URL: `${domain}/api/udid/callback?session=${session}`,
                DeviceAttributes: ['UDID', 'VERSION', 'PRODUCT']
            }
        ],
        PayloadDisplayName: 'TuPhim - Đăng ký thiết bị',
        PayloadIdentifier: `com.tophim.profile.${session}`,
        PayloadOrganization: 'TuPhim',
        PayloadRemovalDisallowed: false,
        PayloadType: 'Configuration',
        PayloadUUID: uuidv4(),
        PayloadVersion: 1
    };

    const plistXML = plist.build(profileData);

    res.set({
        'Content-Type': 'application/x-apple-aspen-config',
        'Content-Disposition': `attachment; filename="TuPhim-register.mobileconfig"`,
        'Cache-Control': 'no-cache'
    });
    res.send(plistXML);
});

// ============================================================
// POST /api/udid/callback
// Apple iOS POSTs device info here after profile install.
// Body is URL-encoded plist XML.
// ============================================================
router.post('/callback', async (req, res) => {
    try {
        // iOS sends a plist as the raw body (application/x-www-form-urlencoded)
        let rawBody = '';
        req.on('data', chunk => { rawBody += chunk.toString(); });
        req.on('end', async () => {
            // Decode URL-encoded plist
            const decoded = decodeURIComponent(rawBody.replace(/^UDID=|^[^=]+=/, ''));
            let deviceInfo = {};
            try {
                deviceInfo = plist.parse(decoded);
            } catch (e) {
                // Try parsing the full raw body if not plist
                deviceInfo = { UDID: rawBody.match(/[0-9a-f]{8}-[0-9a-f]{16}/i)?.[0] || 'unknown' };
            }

            const udid = deviceInfo.UDID || deviceInfo.DeviceUDID || 'unknown';
            const version = deviceInfo.VERSION || 'unknown';
            const product = deviceInfo.PRODUCT || 'iPhone';
            const session = req.query.session || 'unknown';

            console.log(`[UDID] Received: ${udid} | Product: ${product} | iOS: ${version} | Session: ${session}`);

            // Save to DB
            const device = db.addDevice({ udid, version, product, session, status: 'pending' });

            // Update session status
            db.updateSession(session, { status: 'udid_received', udid });

            // Auto-sign IPA for this device
            triggerAutoSign(session, udid).catch(e => console.error('[SIGN ERROR]', e.message));

            // Respond with a nice HTML page (required by Apple)
            res.set('Content-Type', 'text/html');
            res.send(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>TuPhim — Đăng ký thành công</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:-apple-system,sans-serif; background:#060818; color:#f1f5f9; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
    .card { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:20px; padding:40px 32px; text-align:center; max-width:360px; }
    .icon { font-size:56px; margin-bottom:16px; }
    h2 { font-size:22px; font-weight:800; margin-bottom:8px; }
    p { color:#94a3b8; font-size:14px; line-height:1.6; margin-bottom:24px; }
    .btn { display:block; background:linear-gradient(135deg,#4f8ef7,#8b5cf6); color:white; padding:15px; border-radius:50px; font-weight:700; font-size:15px; text-decoration:none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h2>Thiết bị đã đăng ký!</h2>
    <p>Chúng tôi đang ký IPA riêng cho thiết bị của bạn. Quá trình này mất khoảng 30-60 giây.</p>
    <a href="${process.env.APP_DOMAIN}?session=${session}#install-status" class="btn">Quay lại để cài đặt →</a>
  </div>
</body>
</html>`);
        });
    } catch (err) {
        console.error('[UDID CALLBACK ERROR]', err);
        res.status(500).send('Error');
    }
});

// ============================================================
// GET /api/udid/status?session=xxx
// Frontend polls this to check if IPA is ready.
// ============================================================
router.get('/status', (req, res) => {
    const session = req.query.session;
    if (!session) return res.status(400).json({ error: 'Missing session' });

    const sessionData = db.getSession(session);
    if (!sessionData) return res.json({ status: 'not_found' });

    const response = { status: sessionData.status };
    if (sessionData.status === 'signed' && sessionData.installUrl) {
        response.installUrl = sessionData.installUrl;
    }
    res.json(response);
});

// ============================================================
// Internal: Trigger auto-sign after UDID received
// ============================================================
async function triggerAutoSign(session, udid) {
    try {
        const sessionData = db.getSession(session);
        if (!sessionData) return;

        db.updateSession(session, { status: 'signing' });

        // Find the latest IPA release
        const releases = db.getReleases();
        const latestIPA = releases.find(r => r.platform === 'ios' && r.active);
        if (!latestIPA) {
            db.updateSession(session, { status: 'no_ipa', error: 'Chưa có IPA nào được upload.' });
            return;
        }

        // Sign IPA
        const signResult = await signing.signIPA({
            ipaPath: latestIPA.filePath,
            udid,
            session,
            outputDir: path.join(process.env.STORAGE_PATH || './storage', 'signed')
        });

        if (!signResult.success) {
            db.updateSession(session, { status: 'sign_error', error: signResult.error });
            return;
        }

        // Generate manifest
        const manifestPath = await manifestGen.generate({
            session,
            ipaUrl: signResult.signedUrl,
            bundleId: process.env.BUNDLE_ID || 'com.tophim.app',
            version: process.env.APP_VERSION || '2.1.0',
            appName: process.env.APP_NAME || 'TuPhim'
        });

        const installUrl = `itms-services://?action=download-manifest&url=${encodeURIComponent(
            `${process.env.APP_DOMAIN}/api/download/manifest/${session}`
        )}`;

        db.updateSession(session, { status: 'signed', installUrl, manifestPath });
        db.updateDeviceStatus(udid, 'signed');

        console.log(`[SIGN] Session ${session} signed successfully. Install URL ready.`);
    } catch (err) {
        console.error('[AUTO SIGN ERROR]', err);
        db.updateSession(session, { status: 'sign_error', error: err.message });
    }
}

module.exports = router;
