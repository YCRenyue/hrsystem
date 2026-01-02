/**
 * Onboarding Routes
 */
const express = require('express');

const router = express.Router();
const onboardingController = require('../controllers/onboardingController');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');

/**
 * @route   GET /api/onboarding/form/:token
 * @desc    Get onboarding form by token
 * @access  Public (token-based)
 */
router.get('/form/:token', asyncHandler(onboardingController.getOnboardingForm));

/**
 * @route   POST /api/onboarding/form/:token
 * @desc    Submit onboarding form
 * @access  Public (token-based)
 */
router.post('/form/:token', asyncHandler(onboardingController.submitOnboardingForm));

/**
 * @route   POST /api/onboarding/send/:employeeId
 * @desc    Send onboarding form to employee via email
 * @access  Private (HR/Admin only)
 */
router.post('/send/:employeeId', authenticateToken, asyncHandler(onboardingController.sendOnboardingForm));

/**
 * @route   POST /api/onboarding/test-email
 * @desc    Test email configuration
 * @access  Private (Admin only)
 */
router.post('/test-email', authenticateToken, asyncHandler(onboardingController.testEmail));

module.exports = router;
