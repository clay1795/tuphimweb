const jwt = require('jsonwebtoken');

/**
 * JWT authentication middleware for admin routes.
 * Usage: router.use(authMiddleware)
 */
function authMiddleware(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Không có quyền truy cập. Vui lòng đăng nhập.' });
    }

    const token = auth.slice(7);
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = decoded;
        next();
    } catch (e) {
        if (e.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
        }
        return res.status(401).json({ error: 'Token không hợp lệ.' });
    }
}

module.exports = authMiddleware;
