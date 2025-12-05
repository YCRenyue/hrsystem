/**
 * Dashboard Routes
 */
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const dashboardController = require('../controllers/dashboardController');

// All dashboard routes require authentication
router.use(authenticateToken);

// Get dashboard statistics
router.get('/stats', asyncHandler(dashboardController.getDashboardStats));

// Get chart data
router.get('/charts/department-distribution', asyncHandler(dashboardController.getDepartmentDistribution));
router.get('/charts/hiring-trend', asyncHandler(dashboardController.getHiringTrend));
router.get('/charts/attendance-analysis', asyncHandler(dashboardController.getAttendanceAnalysis));
router.get('/charts/leave-analysis', asyncHandler(dashboardController.getLeaveAnalysis));

module.exports = router;
