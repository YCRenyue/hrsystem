/**
 * User Routes
 */
const express = require('express');

const router = express.Router();
const userController = require('../controllers/userController');
const { asyncHandler } = require('../middleware/errorHandler');

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

module.exports = router;
