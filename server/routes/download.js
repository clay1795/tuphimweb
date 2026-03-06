const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../utils/db');

// ============================================================
// GET /api/download/manifest/:session
// Returns the manifest.plist for OTA install
// ============================================================
router.get('/manifest/:session', (req, res) => {
    const session = req.params.session;
    const sessionData = db.getSession(session);

    if (!sessionData || !sessionData.manifestPath) {
        return res.status(404).send('Manifest not found or IPA not signed yet.');
    }

    if (!fs.existsSync(sessionData.manifestPath)) {
        return res.status(404).send('Manifest file missing from server.');
    }

    res.set({
        'Content-Type': 'application/x-plist',
        'Cache-Control': 'no-cache'
    });
    res.sendFile(path.resolve(sessionData.manifestPath));
});

// ============================================================
// GET /api/download/ipa/:filename — serve signed IPA
// ============================================================
router.get('/ipa/:filename', (req, res) => {
    const filePath = path.join(process.env.STORAGE_PATH || './storage', 'signed', req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found.' });
    res.download(filePath);
});

// ============================================================
// GET /api/download/apk — redirect to latest APK
// ============================================================
router.get('/apk', (req, res) => {
    const releases = db.getReleases();
    const latest = releases.find(r => r.platform === 'android' && r.active);
    if (!latest) return res.status(404).json({ error: 'Chưa có APK nào được upload.' });
    res.download(latest.filePath, `TuPhim-${latest.version}.apk`);
});

// ============================================================
// GET /api/download/windows — redirect to latest Windows installer
// ============================================================
router.get('/windows', (req, res) => {
    const releases = db.getReleases();
    const latest = releases.find(r => r.platform === 'windows' && r.active);
    if (!latest) return res.status(404).json({ error: 'Chưa có bản Windows nào được upload.' });
    res.download(latest.filePath, `TuPhim-Setup-${latest.version}.exe`);
});

module.exports = router;
