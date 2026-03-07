const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const auth = require('../middleware/auth');
const db = require('../utils/db');
const signing = require('../utils/signing');

// All admin routes require JWT
router.use(auth);

// Storage for uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const dirs = { '.ipa': 'ipa', '.apk': 'apk', '.exe': 'windows', '.msix': 'windows' };
        const dir = path.join(process.env.STORAGE_PATH || './storage', dirs[ext] || 'ipa');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ts = Date.now();
        cb(null, `${ts}-${file.originalname.replace(/\s/g, '_')}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: (parseInt(process.env.MAX_UPLOAD_MB) || 500) * 1024 * 1024 }
});

// ============================================================
// GET /api/admin/stats
// ============================================================
router.get('/stats', (req, res) => {
    const devices = db.getDevices();
    const releases = db.getReleases();
    const sessions = db.getSessions();

    const totalInstalls = sessions.filter(s => s.status === 'signed').length;
    const pendingDevices = devices.filter(d => d.status === 'pending').length;

    res.json({
        totalInstalls,
        totalDevices: devices.length,
        pendingDevices,
        totalReleases: releases.length,
        activeReleases: releases.filter(r => r.active).length,
        latestVersion: releases.find(r => r.platform === 'ios' && r.active)?.version || 'N/A'
    });
});

// ============================================================
// GET /api/admin/devices
// ============================================================
router.get('/devices', (req, res) => {
    res.json(db.getDevices());
});

// ============================================================
// DELETE /api/admin/devices/:udid
// ============================================================
router.delete('/devices/:udid', (req, res) => {
    db.deleteDevice(req.params.udid);
    res.json({ success: true });
});

// ============================================================
// GET /api/admin/releases
// ============================================================
router.get('/releases', (req, res) => {
    res.json(db.getReleases());
});

// ============================================================
// POST /api/admin/upload
// Upload IPA, APK, or Windows installer
// ============================================================
router.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Không có file được upload.' });

    const ext = path.extname(req.file.originalname).toLowerCase();
    const platform = { '.ipa': 'ios', '.apk': 'android', '.exe': 'windows', '.msix': 'windows' }[ext] || 'ios';
    const version = req.body.version || '1.0.0';
    const domain = process.env.APP_DOMAIN || 'https://tuphim.online';

    // Deactivate previous releases of same platform
    if (req.body.setActive === 'true') {
        db.deactivateReleases(platform);
    }

    const release = db.addRelease({
        platform,
        version,
        fileName: req.file.filename,
        filePath: req.file.path,
        fileSize: req.file.size,
        active: req.body.setActive === 'true',
        downloadUrl: `${domain}/api/download/${platform === 'android' ? 'apk' : platform === 'windows' ? 'windows' : 'ipa'}/${req.file.filename}`
    });

    res.json({ success: true, release });
});

// ============================================================
// DELETE /api/admin/releases/:id — delete a release
// ============================================================
router.delete('/releases/:id', (req, res) => {
    db.deleteRelease(req.params.id);
    res.json({ success: true });
});

// ============================================================
// POST /api/admin/sign — manually sign IPA for a session
// ============================================================
router.post('/sign', async (req, res) => {
    const { session, udid } = req.body;
    if (!session) return res.status(400).json({ error: 'Missing session' });

    try {
        const releases = db.getReleases();
        const latestIPA = releases.find(r => r.platform === 'ios' && r.active);
        if (!latestIPA) return res.status(404).json({ error: 'Chưa có IPA nào active.' });

        const signResult = await signing.signIPA({
            ipaPath: latestIPA.filePath,
            udid: udid || 'manual',
            session,
            outputDir: path.join(process.env.STORAGE_PATH || './storage', 'signed')
        });

        res.json(signResult);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// DELETE /api/admin/releases/:id
// ============================================================
router.delete('/releases/:id', (req, res) => {
    db.deleteRelease(req.params.id);
    res.json({ success: true });
});

// ============================================================
// GET /api/admin/cert-info
// ============================================================
router.get('/cert-info', (req, res) => {
    const certPath = path.resolve(process.env.CERT_PATH || '../certificate/cert_legacy.p12');
    const provisionPath = path.resolve(process.env.PROVISION_PATH || '../certificate/cert.mobileprovision');
    res.json({
        certFile: path.basename(certPath),
        certExists: fs.existsSync(certPath),
        provisionFile: path.basename(provisionPath),
        provisionExists: fs.existsSync(provisionPath),
    });
});

// ============================================================
// GET /api/admin/sessions — list all install sessions
// ============================================================
router.get('/sessions', (req, res) => {
    res.json(db.getSessions().slice(-50).reverse()); // last 50
});

// ============================================================
// GET /api/admin/settings
// ============================================================
router.get('/settings', (req, res) => {
    res.json(db.getSettings());
});

// ============================================================
// PUT /api/admin/settings
// ============================================================
router.put('/settings', (req, res) => {
    const allowed = ['iosGuideUrl', 'androidGuideUrl'];
    const updates = {};
    allowed.forEach(key => {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
    });
    const settings = db.saveSettings(updates);
    res.json({ success: true, settings });
});

module.exports = router;
