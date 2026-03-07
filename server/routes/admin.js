const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const auth = require('../middleware/auth');
const db = require('../utils/db');
const { validateMagicBytes, isSafeFilename, isValidVersion } = require('../utils/fileValidator');

// All admin routes require valid JWT
router.use(auth);

// ============================================================
// MULTER — disk storage with strict file type filter
// ============================================================
const ALLOWED_EXTS = ['.ipa', '.apk', '.exe', '.msix'];
const ALLOWED_MIMES = [
    'application/octet-stream',
    'application/zip',
    'application/x-zip-compressed',
    'application/vnd.android.package-archive',
    'application/x-msdownload',
    'application/x-dosexec',
    'application/x-ms-installer',
];

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const dirMap = { '.ipa': 'ipa', '.apk': 'apk', '.exe': 'windows', '.msix': 'windows' };
        const dir = path.join(process.env.STORAGE_PATH || './storage', dirMap[ext] || 'ipa');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // Sanitize filename — use timestamp + uuid-part only, ignore original name
        const ext = path.extname(file.originalname).toLowerCase();
        const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
        cb(null, safe);
    },
});

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
        return cb(new Error(`File type not allowed: ${ext}`), false);
    }
    // MIME type whitelist
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
        return cb(new Error(`MIME type not allowed: ${file.mimetype}`), false);
    }
    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: (parseInt(process.env.MAX_UPLOAD_MB) || 500) * 1024 * 1024,
        fields: 5,
        files: 1,
    },
});

// ============================================================
// INPUT SANITIZER
// ============================================================
function sanitizeString(str, maxLen = 100) {
    if (typeof str !== 'string') return '';
    return str.trim().slice(0, maxLen).replace(/[<>"'`]/g, '');
}

function sanitizeUrl(url) {
    if (!url) return '';
    try {
        const u = new URL(url);
        if (!['http:', 'https:'].includes(u.protocol)) return '';
        return u.href.slice(0, 500);
    } catch {
        return '';
    }
}

// ============================================================
// GET /api/admin/stats
// ============================================================
router.get('/stats', (req, res) => {
    const releases = db.getReleases();
    res.json({
        totalReleases: releases.length,
        activeReleases: releases.filter(r => r.active).length,
        latestVersion: releases.find(r => r.platform === 'ios' && r.active)?.version
            || releases.find(r => r.platform === 'android' && r.active)?.version || 'N/A',
    });
});

// ============================================================
// GET /api/admin/releases
// ============================================================
router.get('/releases', (req, res) => {
    // Strip sensitive file path info before sending to client
    const releases = db.getReleases().map(r => ({
        id: r.id,
        platform: r.platform,
        version: r.version,
        fileName: r.fileName,
        fileSize: r.fileSize,
        active: r.active,
        uploadedAt: r.uploadedAt,
        downloadUrl: r.downloadUrl,
    }));
    res.json(releases);
});

// ============================================================
// POST /api/admin/upload — IPA / APK / Windows
// ============================================================
router.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const ext = path.extname(req.file.originalname).toLowerCase();
    const platformMap = { '.ipa': 'ios', '.apk': 'android', '.exe': 'windows', '.msix': 'windows' };
    const platform = platformMap[ext];

    if (!platform) {
        fs.unlink(req.file.path, () => { });
        return res.status(400).json({ error: 'Unsupported file type.' });
    }

    // ── MAGIC BYTE VALIDATION ──
    if (!validateMagicBytes(req.file.path, platform)) {
        fs.unlink(req.file.path, () => { });
        return res.status(400).json({ error: 'File content does not match expected format. Upload rejected.' });
    }

    // ── INPUT VALIDATION ──
    const rawVersion = sanitizeString(req.body.version || '1.0.0', 20);
    if (!isValidVersion(rawVersion)) {
        fs.unlink(req.file.path, () => { });
        return res.status(400).json({ error: 'Invalid version format. Use X.Y.Z (e.g. 1.0.4)' });
    }

    const setActive = req.body.setActive === 'true';
    if (setActive) db.deactivateReleases(platform);

    const domain = process.env.APP_DOMAIN || 'https://tuphim.online';
    const downloadPath = platform === 'android' ? 'apk' : platform === 'windows' ? 'windows' : 'ipa';

    const release = db.addRelease({
        platform,
        version: rawVersion,
        fileName: req.file.filename,
        filePath: req.file.path,
        fileSize: req.file.size,
        active: setActive,
        downloadUrl: `${domain}/api/download/${downloadPath}/${req.file.filename}`,
    });

    res.json({ success: true, release: { id: release.id, platform, version: rawVersion, fileSize: release.fileSize } });
});

// ============================================================
// DELETE /api/admin/releases/:id
// ============================================================
router.delete('/releases/:id', (req, res) => {
    const id = sanitizeString(req.params.id, 50);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });
    db.deleteRelease(id);
    res.json({ success: true });
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
    const updates = {
        iosGuideUrl: sanitizeUrl(req.body.iosGuideUrl),
        androidGuideUrl: sanitizeUrl(req.body.androidGuideUrl),
    };
    const settings = db.saveSettings(updates);
    res.json({ success: true, settings });
});

// ============================================================
// Multer error handler
// ============================================================
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError || err?.message?.includes('not allowed')) {
        return res.status(400).json({ error: err.message });
    }
    console.error('[ADMIN ROUTE ERROR]', err.message);
    res.status(500).json({ error: 'Internal error' });
});

module.exports = router;
