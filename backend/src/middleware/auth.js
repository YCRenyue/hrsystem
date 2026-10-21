/**
 * Authentication Middleware
 */
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');
const { User } = require('../models');

const PASSWORD_CHANGE_PATHS = new Set([
  '/api/auth/me',
  '/api/auth/logout',
  '/api/users/change-password'
]);

/**
 * Verify JWT token and attach user to request
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: '请先登录'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const currentUser = await User.findByPk(decoded.user_id);

    if (!currentUser || !currentUser.is_active || currentUser.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: '账户不可用，请重新登录'
      });
    }

    const safeUser = currentUser.toSafeObject();
    const mustChangePassword = Boolean(
      currentUser.must_change_password || currentUser.isPasswordExpired()
    );
    req.user = { ...decoded, ...safeUser, must_change_password: mustChangePassword };

    const requestPath = req.originalUrl.split('?')[0];
    if (mustChangePassword && !PASSWORD_CHANGE_PATHS.has(requestPath)) {
      return res.status(403).json({
        success: false,
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: '请先修改初始密码'
      });
    }

    return next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: '登录已过期，请重新登录'
    });
  }
};

/**
 * Check if user has required role
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: '请先登录'
    });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: '权限不足'
    });
  }

  return next();
};

module.exports = {
  authenticateToken,
  requireRole
};
