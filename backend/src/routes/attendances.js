/**
 * Attendance Routes
 */

const express = require('express');

const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const attendanceController = require('../controllers/attendanceController');

// All routes require authentication
router.use(authenticateToken);

// Get list with pagination and filters
router.get('/', asyncHandler(attendanceController.getAttendanceList));

// Get attendance statistics
router.get('/stats', asyncHandler(attendanceController.getAttendanceStats));

// Create attendance record
router.post('/', asyncHandler(attendanceController.createAttendance));

// Update attendance record
router.put('/:id', asyncHandler(attendanceController.updateAttendance));

// Delete attendance record
router.delete('/:id', asyncHandler(attendanceController.deleteAttendance));

module.exports = router;
