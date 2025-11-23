/**
 * Dashboard Routes
 */
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const dashboardController = require('../controllers/dashboardController');

// Get dashboard statistics
router.use(authenticateToken);
router.get('/stats', asyncHandler(dashboardController.getDashboardStats));

module.exports = router;
