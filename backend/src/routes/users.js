/**
 * User Routes
 */
const express = require('express');

const router = express.Router();
const userController = require('../controllers/userController');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// ============================================
// User self-service routes (all authenticated users)
// ============================================

// Get current user profile
router.get('/profile', asyncHandler(userController.getUserProfile));

// Update user profile
router.put('/profile', asyncHandler(userController.updateUserProfile));

// Get current user's employee information
router.get('/profile/employee', asyncHandler(userController.getProfileEmployee));

// Change password
router.post('/change-password', asyncHandler(userController.changePassword));

// Get user preferences
router.get('/preferences', asyncHandler(userController.getUserPreferences));

// Update user preferences
router.put('/preferences', asyncHandler(userController.updateUserPreferences));

// ============================================
// Admin user management routes (admin only)
// ============================================

/**
 * @route   GET /api/users
 * @desc    Get paginated list of all users
 * @access  Private (Admin only)
 */
router.get(
  '/',
  requireRole('admin'),
  asyncHandler(userController.getUsers)
);

/**
 * @route   GET /api/users/:id
 * @desc    Get single user by ID
 * @access  Private (Admin only)
 */
router.get(
  '/:id',
  requireRole('admin'),
  asyncHandler(userController.getUserById)
);

/**
 * @route   PUT /api/users/:id/role
 * @desc    Update user role and permissions
 * @access  Private (Admin only)
 */
router.put(
  '/:id/role',
  requireRole('admin'),
  asyncHandler(userController.updateUserRole)
);

/**
 * @route   POST /api/users/:id/reset-password
 * @desc    Reset user password to default
 * @access  Private (Admin only)
 */
router.post(
  '/:id/reset-password',
  requireRole('admin'),
  asyncHandler(userController.resetUserPassword)
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(userController.deleteUser)
);

module.exports = router;
