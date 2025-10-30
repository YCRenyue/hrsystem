/**
 * Onboarding Routes
 */
const express = require('express');
const router = express.Router();
const onboardingController = require('../controllers/onboardingController');
const { asyncHandler } = require('../middleware/errorHandler');

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

module.exports = router;
