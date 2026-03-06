const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ============================================================
// POST /api/auth/login
// ============================================================
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu.' });
    }

    // Check username
    if (username !== process.env.ADMIN_USERNAME) {
        // Delay to prevent timing attacks
        await new Promise(r => setTimeout(r, 500));
        return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    }

    // Check password against bcrypt hash
    const passwordHash = process.env.ADMIN_PASSWORD_HASH;
    if (!passwordHash) {
        return res.status(500).json({ error: 'Server chưa được cấu hình. Liên hệ admin.' });
    }

    const valid = await bcrypt.compare(password, passwordHash);
    if (!valid) {
        return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    }

    // Generate JWT
    const token = jwt.sign(
        { username, role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
        success: true,
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '8h',
        adminPath: process.env.ADMIN_SECRET_PATH
    });
});

// ============================================================
// POST /api/auth/verify — check if token is still valid
// ============================================================
router.post('/verify', (req, res) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ valid: false });
    }
    const token = auth.slice(7);
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ valid: true, username: decoded.username, role: decoded.role });
    } catch (e) {
        res.status(401).json({ valid: false, reason: e.message });
    }
});

module.exports = router;
