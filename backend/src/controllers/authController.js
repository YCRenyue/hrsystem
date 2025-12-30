/**
 * Authentication Controller
 */
const jwt = require('jsonwebtoken');
const _bcrypt = require('bcryptjs');
const { User } = require('../models');
const { UnauthorizedError, ValidationError, NotFoundError } = require('../middleware/errorHandler');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secure_jwt_secret_here';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate JWT token
 */
const generateToken = (user) => jwt.sign(
  {
    user_id: user.user_id,
    username: user.username,
    role: user.role,
    employee_id: user.employee_id
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

  res.json({
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
    message: 'Logged out successfully'
  });
};

/**
 * Get DingTalk OAuth login URL
 */
const getDingTalkLoginUrl = async (req, res) => {
  const { generateDingTalkLoginUrl } = require('../utils/oauthHelper');

  const clientId = process.env.DINGTALK_APP_KEY;
  const redirectUri = `${process.env.FRONTEND_URL}/auth/dingtalk/callback`;

  if (!clientId) {
    throw new ValidationError('DingTalk OAuth is not configured');
  }

  const loginUrl = generateDingTalkLoginUrl({
    clientId,
    redirectUri,
    scope: 'openid'
  });

  res.json({
    success: true,
    data: { loginUrl }
  });
};

/**
 * DingTalk OAuth callback handler
 */
const handleDingTalkCallback = async (req, res) => {
  const dingTalkService = require('../services/DingTalkService');
  const { Employee } = require('../models');
  const { code, state: _state } = req.body;

  if (!code) {
    throw new ValidationError('Authorization code is required');
  }

  // Exchange code for access token
  const tokenData = await dingTalkService.exchangeCodeForToken(code);

  // Get user info from DingTalk
  const userInfo = await dingTalkService.getUserInfoByToken(tokenData.accessToken);

  // Find employee by DingTalk user ID or mobile
  let employee = await Employee.findOne({
    where: { dingtalk_user_id: userInfo.openid }
  });

  if (!employee && userInfo.mobile) {
    const employees = await Employee.findAll();
    employee = employees.find((emp) => emp.getPhone() === userInfo.mobile);

    if (employee) {
      employee.dingtalk_user_id = userInfo.openid;
      await employee.save();
    }
  }

  if (!employee) {
    throw new UnauthorizedError('User not found in system');
  }

  // Find associated user account
  const user = await User.findOne({
    where: { employee_id: employee.employee_id }
  });

  if (!user) {
    throw new UnauthorizedError('User account not found');
  }

  if (!user.is_active) {
    throw new UnauthorizedError('Account is inactive');
  }

  // Record successful login
  const ipAddress = req.ip || req.connection.remoteAddress;
  await user.recordSuccessfulLogin(ipAddress);

  const token = generateToken(user.toSafeObject());

  res.json({
    success: true,
    data: {
      token,
      user: user.toSafeObject()
    }
  });
};

module.exports = {
  login,
  getCurrentUser,
  logout,
  getDingTalkLoginUrl,
  handleDingTalkCallback
};
