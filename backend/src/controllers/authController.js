/**
 * Authentication Controller
 */
const jwt = require('jsonwebtoken');
const _bcrypt = require('bcryptjs');
const { User } = require('../models');
const { UnauthorizedError, ValidationError, NotFoundError } = require('../middleware/errorHandler');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/jwt');

/**
 * Generate JWT token
 */
const generateToken = (user) => jwt.sign(
  {
    user_id: user.user_id,
    username: user.username,
    role: user.role,
    employee_id: user.employee_id,
    data_scope: user.data_scope,
    department_id: user.department_id
  },
  JWT_SECRET,
  { expiresIn: JWT_EXPIRES_IN }
);

/**
 * Login with username and password
 */
const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    throw new ValidationError('请输入用户名和密码');
  }

  // Find user by username (use withPassword scope to include password_hash)
  const user = await User.scope('withPassword').findOne({
    where: { username }
  });

  if (!user) {
    throw new UnauthorizedError('用户名或密码错误');
  }

  // Check if user is active
  if (!user.is_active) {
    throw new UnauthorizedError('账户已被禁用');
  }

  // Check if account is locked
  if (user.isLocked()) {
    throw new UnauthorizedError('账户已被锁定，登录失败次数过多，请稍后再试');
  }

  // Verify password
  const isPasswordValid = await user.verifyPassword(password);
  if (!isPasswordValid) {
    await user.recordFailedLogin();
    throw new UnauthorizedError('用户名或密码错误');
  }

  // Check if password is expired
  if (user.isPasswordExpired()) {
    return res.json({
      success: false,
      must_change_password: true,
      message: '密码已过期，请修改密码'
    });
  }

  // Record successful login
  const ipAddress = req.ip || req.connection.remoteAddress;
  await user.recordSuccessfulLogin(ipAddress);

  const token = generateToken(user.toSafeObject());

  return res.json({
    success: true,
    data: {
      token,
      user: user.toSafeObject()
    }
  });
};

/**
 * Get current user info
 */
const getCurrentUser = async (req, res) => {
  // User info is already in req.user from auth middleware
  const user = await User.findByPk(req.user.user_id);

  if (!user) {
    throw new NotFoundError('User', req.user.user_id);
  }

  res.json({
    success: true,
    data: user.toSafeObject()
  });
};

/**
 * Logout
 */
const logout = async (req, res) => {
  // In a real app, you might invalidate the token or clear session
  res.json({
    success: true,
    message: '退出登录成功'
  });
};

module.exports = {
  login,
  getCurrentUser,
  logout
};
