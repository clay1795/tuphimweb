require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

// ============================================================
// DECODE CERTIFICATES FROM ENV (for Render.com / cloud deploy)
// ============================================================
function setupCerts() {
    const certDir = path.resolve(process.env.CERT_PATH ? path.dirname(process.env.CERT_PATH) : '../certificate');
    if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });

    if (process.env.CERT_P12_BASE64) {
        const certOut = path.resolve(process.env.CERT_PATH || '../certificate/cert_legacy.p12');
        if (!fs.existsSync(certOut)) {
            fs.writeFileSync(certOut, Buffer.from(process.env.CERT_P12_BASE64, 'base64'));
            console.log('✅ cert_legacy.p12 decoded from CERT_P12_BASE64 env var');
        }
    }
    if (process.env.PROVISION_BASE64) {
        const provOut = path.resolve(process.env.PROVISION_PATH || '../certificate/cert.mobileprovision');
        if (!fs.existsSync(provOut)) {
            fs.writeFileSync(provOut, Buffer.from(process.env.PROVISION_BASE64, 'base64'));
            console.log('✅ cert.mobileprovision decoded from PROVISION_BASE64 env var');
        }
    }
}
setupCerts();



const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(cors({
    origin: true, // Allow all origins — security handled by JWT tokens
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiter for UDID profile endpoint (10 req/min per IP)
const udidLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.' }
});

// Rate limiter for login endpoint
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Quá nhiều lần đăng nhập sai. Vui lòng thử lại sau 15 phút.' }
});

// ============================================================
// ENSURE STORAGE DIRECTORIES EXIST
// ============================================================
const storagePath = process.env.STORAGE_PATH || './storage';
['ipa', 'apk', 'windows', 'manifests', 'signed'].forEach(dir => {
    const p = path.join(storagePath, dir);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// ============================================================
// ROUTES
// ============================================================
const authRoutes = require('./routes/auth');
const udidRoutes = require('./routes/udid');
const adminRoutes = require('./routes/admin');
const downloadRoutes = require('./routes/download');

app.use('/api/auth', loginLimiter, authRoutes);
app.use('/api/udid', udidLimiter, udidRoutes);
app.use('/api/admin', adminRoutes);   // JWT protection inside route file
app.use('/api/download', downloadRoutes);

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        version: process.env.APP_VERSION || '2.1.0',
        timestamp: new Date().toISOString()
    });
});

// ============================================================
// SERVE STATIC FRONTEND (for production)
// When deployed, Nginx serves frontend directly.
// This is just for local dev convenience.
// ============================================================
const frontendPath = path.join(__dirname, '..');
app.use(express.static(frontendPath));

// ============================================================
// 404 fallback
// ============================================================
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// ============================================================
// ERROR HANDLER
// ============================================================
app.use((err, req, res, next) => {
    console.error('[ERROR]', err.message);
    res.status(500).json({ error: 'Lỗi server. Vui lòng thử lại.' });
});

// ============================================================
// START
// ============================================================
app.listen(PORT, () => {
    console.log(`✅ TuPhim Distribution Server running on port ${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api/health`);
    console.log(`🔐 Admin path: ${process.env.ADMIN_SECRET_PATH || 'NOT SET'}`);
});

module.exports = app;
