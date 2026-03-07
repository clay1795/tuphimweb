require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

// ============================================================
// DECODE CERTIFICATES FROM ENV
// ============================================================
function setupCerts() {
    const certDir = path.resolve(process.env.CERT_PATH ? path.dirname(process.env.CERT_PATH) : '../certificate');
    if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });

    if (process.env.CERT_P12_BASE64) {
        const certOut = path.resolve(process.env.CERT_PATH || '../certificate/cert_legacy.p12');
        if (!fs.existsSync(certOut)) {
            fs.writeFileSync(certOut, Buffer.from(process.env.CERT_P12_BASE64, 'base64'));
            console.log('[CERT] cert_legacy.p12 decoded from env');
        }
    }
    if (process.env.PROVISION_BASE64) {
        const provOut = path.resolve(process.env.PROVISION_PATH || '../certificate/cert.mobileprovision');
        if (!fs.existsSync(provOut)) {
            fs.writeFileSync(provOut, Buffer.from(process.env.PROVISION_BASE64, 'base64'));
            console.log('[CERT] cert.mobileprovision decoded from env');
        }
    }
}
setupCerts();

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================
// SECURITY: Remove X-Powered-By fingerprint
// ============================================================
app.disable('x-powered-by');

// ============================================================
// SECURITY: Helmet (comprehensive headers + CSP)
// ============================================================
let helmet;
try { helmet = require('helmet'); } catch { helmet = null; }

if (helmet) {
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://fonts.googleapis.com"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'"],
                frameSrc: ["'none'"],
                objectSrc: ["'none'"],
                upgradeInsecureRequests: [],
            },
        },
        crossOriginEmbedderPolicy: false, // Allow external resources
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }));
} else {
    // Fallback manual headers (before helmet is installed)
    app.use((req, res, next) => {
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
        res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        next();
    });
}

// ============================================================
// CORS — restrict to known origins
// ============================================================
const allowedOrigins = [
    'https://tuphim.online',
    'https://www.tuphim.online',
    /^http:\/\/localhost(:\d+)?$/,
    /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];
app.use(cors({
    origin: (origin, cb) => {
        if (!origin) return cb(null, true); // server-to-server / curl
        const ok = allowedOrigins.some(o =>
            typeof o === 'string' ? o === origin : o.test(origin)
        );
        if (ok) cb(null, true);
        else cb(new Error('CORS policy: origin not allowed'));
    },
    credentials: true,
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ============================================================
// RATE LIMITERS
// ============================================================
const udidLimiter = rateLimit({
    windowMs: 60 * 1000, max: 10,
    message: { error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.' },
    standardHeaders: true, legacyHeaders: false,
});
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, max: 10,
    message: { error: 'Quá nhiều lần đăng nhập sai. Thử lại sau 15 phút.' },
    standardHeaders: true, legacyHeaders: false,
});
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, max: 120,
    message: { error: 'Quá nhiều yêu cầu.' },
    standardHeaders: true, legacyHeaders: false,
});
const adminApiLimiter = rateLimit({
    windowMs: 60 * 1000, max: 60,
    message: { error: 'Too many admin requests.' },
    standardHeaders: true, legacyHeaders: false,
});

// ============================================================
// BLOCK SENSITIVE PATHS — before static serving
// Completely deny access to /admin, /server, /certificate, etc.
// ============================================================
const BLOCKED_PATHS = [
    /^\/admin(\/|$)/i,         // old admin path
    /^\/server(\/|$)/i,        // server source code
    /^\/certificate(\/|$)/i,   // certificates folder
    /^\/deploy(\/|$)/i,        // deploy configs
    /^\/\.env/i,               // .env files
    /^\/\.git(\/|$)/i,         // git repo
    /^\/node_modules(\/|$)/i,  // node modules
    /^\/storage(\/|$)/i,       // raw storage
    /^\/package\.json/i,       // package info
    /^\/package-lock\.json/i,
    /^\/render\.yaml/i,
];
app.use((req, res, next) => {
    const isBlocked = BLOCKED_PATHS.some(pattern => pattern.test(req.path));
    if (isBlocked) {
        // Return a plain 404 HTML page — not a JSON error (looks like generic 404, not a blocked endpoint)
        return res.status(404).send(`<!DOCTYPE html><html><head><title>404 Not Found</title></head><body><h1>404 Not Found</h1><p>The requested URL was not found on this server.</p></body></html>`);
    }
    next();
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
app.use('/api/admin', adminApiLimiter, adminRoutes);   // JWT protection inside route file
app.use('/api/download', apiLimiter, downloadRoutes);

// ============================================================
// PUBLIC: HEALTH CHECK
// ============================================================
app.get('/api/health', apiLimiter, (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
    // Note: don't expose version or server details
});

// ============================================================
// PUBLIC: APP INFO — frontend dynamic data
// ============================================================
app.get('/api/info', apiLimiter, (req, res) => {
    const db = require('./utils/db');
    const releases = db.getReleases();
    const settings = db.getSettings();

    const latestIOS = releases.find(r => r.platform === 'ios' && r.active);
    const latestAndroid = releases.find(r => r.platform === 'android' && r.active);
    const latestWindows = releases.find(r => r.platform === 'windows' && r.active);

    const version = latestIOS?.version || latestAndroid?.version || process.env.APP_VERSION || '2.1.0';
    const updatedAt = latestIOS?.uploadedAt || latestAndroid?.uploadedAt || null;

    res.json({
        version,
        updatedAt,
        hasIPA: !!latestIOS,
        hasAPK: !!latestAndroid,
        hasWindows: !!latestWindows,
        iosGuideUrl: settings.iosGuideUrl || '',
        androidGuideUrl: settings.androidGuideUrl || '',
    });
});

// ============================================================
// SERVE STATIC FRONTEND (after all security middleware)
// ============================================================
const frontendPath = path.join(__dirname, '..');

// Serve with security-friendly options:
// - index: true so / serves index.html
// - dotfiles: deny prevents .env, .git etc (belt-and-suspenders with BLOCKED_PATHS)
// - etag: true for caching
app.use(express.static(frontendPath, {
    dotfiles: 'deny',
    index: 'index.html',
    setHeaders: (res, filePath) => {
        // Deny serving any file inside sensitive directories
        const rel = path.relative(frontendPath, filePath).replace(/\\/g, '/');
        const sensitiveDir = /^(admin|server|certificate|deploy|node_modules|storage)\//i;
        if (sensitiveDir.test(rel)) {
            res.statusCode = 404;
        }
        // Cache static assets
        if (/\.(css|js|png|jpg|svg|ico|woff2?)$/.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=86400');
        }
    },
}));

// ============================================================
// 404
// ============================================================
app.use((req, res) => {
    res.status(404).send(`<!DOCTYPE html><html><head><title>404 Not Found</title></head><body><h1>404 Not Found</h1></body></html>`);
});

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================
app.use((err, req, res, next) => {
    // Don't leak error details in production
    console.error('[ERROR]', err.message);
    if (err.message?.includes('CORS')) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    res.status(500).json({ error: 'Internal server error' });
});

// ============================================================
// START
// ============================================================
app.listen(PORT, () => {
    console.log(`[SERVER] TuPhim Distribution running on port ${PORT}`);
    console.log(`[SECURITY] /admin blocked | sensitive paths blocked`);
});

module.exports = app;
