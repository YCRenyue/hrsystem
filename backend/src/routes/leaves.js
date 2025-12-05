/**
 * Leave Routes
 */

const express = require('express');

const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const leaveController = require('../controllers/leaveController');

// All routes require authentication
router.use(authenticateToken);

// Get list with pagination and filters
router.get('/', asyncHandler(leaveController.getLeaveList));

// Get leave statistics
router.get('/stats', asyncHandler(leaveController.getLeaveStats));

// Create leave application
router.post('/', asyncHandler(leaveController.createLeave));

// Update leave application
router.put('/:id', asyncHandler(leaveController.updateLeave));

// Delete leave application
router.delete('/:id', asyncHandler(leaveController.deleteLeave));

module.exports = router;
