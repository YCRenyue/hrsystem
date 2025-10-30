/**
 * Authentication Controller
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { UnauthorizedError, ValidationError, NotFoundError } = require('../middleware/errorHandler');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secure_jwt_secret_here';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      user_id: user.user_id,
      username: user.username,
      role: user.role,
      employee_id: user.employee_id
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Login with username and password
 */
const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    throw new ValidationError('Username and password are required');
  }

  // Find user by username (use withPassword scope to include password_hash)
  const user = await User.scope('withPassword').findOne({
    where: { username }
  });

  if (!user) {
    throw new UnauthorizedError('Invalid username or password');
  }

  // Check if user is active
  if (!user.is_active) {
    throw new UnauthorizedError('Account is inactive');
  }

  // Check if account is locked
  if (user.isLocked()) {
    throw new UnauthorizedError('Account is locked due to too many failed login attempts');
  }

  // Verify password
  const isPasswordValid = await user.verifyPassword(password);
  if (!isPasswordValid) {
    await user.recordFailedLogin();
    throw new UnauthorizedError('Invalid username or password');
  }

  // Check if password is expired
  if (user.isPasswordExpired()) {
    return res.json({
      success: false,
      must_change_password: true,
      message: 'Password has expired. Please change your password.'
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
 * DingTalk OAuth callback handler
 */
const handleDingTalkCallback = async (req, res) => {
  const { code, state } = req.body;

  // TODO: Implement DingTalk OAuth flow
  // 1. Exchange code for access token
  // 2. Get user info from DingTalk
  // 3. Find or create user in database
  // 4. Generate JWT token

  throw new Error('DingTalk OAuth not yet implemented');
};

module.exports = {
  login,
  getCurrentUser,
  logout,
  handleDingTalkCallback
};
