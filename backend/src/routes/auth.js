/**
 * Authentication Routes
 */
const express = require('express');

const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   POST /api/auth/login
 * @desc    Login with username and password
 * @access  Public
 */
router.post('/login', asyncHandler(authController.login));

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info
 * @access  Private
 */
router.get('/me', authenticateToken, asyncHandler(authController.getCurrentUser));

/**
 * @route   POST /api/auth/logout
 * @desc    Logout
 * @access  Private
 */
router.post('/logout', authenticateToken, asyncHandler(authController.logout));

/**
 * @route   GET /api/auth/dingtalk/login-url
 * @desc    Get DingTalk OAuth login URL
 * @access  Public
 */
router.get('/dingtalk/login-url', asyncHandler(authController.getDingTalkLoginUrl));

/**
 * @route   POST /api/auth/dingtalk/callback
 * @desc    DingTalk OAuth callback
 * @access  Public
 */
router.post('/dingtalk/callback', asyncHandler(authController.handleDingTalkCallback));

module.exports = router;
