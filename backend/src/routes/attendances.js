/**
 * Attendance Routes
 */

const express = require('express');
const multer = require('multer');

const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const attendanceController = require('../controllers/attendanceController');

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB (card files can be large)
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream' // some browsers send this for .xls
    ];
    const validExt = /\.(xlsx|xls)$/i.test(file.originalname);
    if (allowedTypes.includes(file.mimetype) || validExt) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/attendances
 * @desc    Get attendance records
 * @access  Private (HR Admin, Department Manager, Admin)
 */
router.get('/', asyncHandler(attendanceController.getAttendanceList));

/**
 * @route   GET /api/attendances/stats
 * @desc    Get attendance statistics
 * @access  Private (HR Admin, Department Manager, Admin)
 */
router.get('/stats', asyncHandler(attendanceController.getAttendanceStats));

/**
 * @route   GET /api/attendances/template
 * @desc    Download Excel template
 * @access  Private (HR Admin, Department Manager, Admin)
 */
router.get(
  '/template',
  requireRole('admin', 'hr_admin', 'department_manager'),
  asyncHandler(attendanceController.downloadTemplate)
);

/**
 * @route   GET /api/attendances/export
 * @desc    Export to Excel
 * @access  Private (HR Admin, Department Manager, Admin)
 */
router.get(
  '/export',
  requireRole('admin', 'hr_admin', 'department_manager'),
  asyncHandler(attendanceController.exportToExcel)
);

/**
 * @route   POST /api/attendances/import
 * @desc    Import from Excel
 * @access  Private (HR Admin, Admin,, Department Manager)
 */
router.post(
  '/import',
  requireRole('admin', 'hr_admin', 'department_manager'),
  upload.single('file'),
  asyncHandler(attendanceController.importFromExcel)
);

/**
 * @route   POST /api/attendances/import-card
 * @desc    Import 考勤卡表 Excel (multi-sheet, name-based matching)
 * @access  Private (HR Admin, Admin)
 */
router.post(
  '/import-card',
  requireRole('admin', 'hr_admin'),
  upload.single('file'),
  asyncHandler(attendanceController.importCardExcel)
);

/**
 * @route   GET /api/attendances/report
 * @desc    考勤报表：按周期聚合请假/迟到/早退等
 * @access  Private (HR Admin, Admin, Department Manager)
 */
router.get(
  '/report',
  requireRole('admin', 'hr_admin', 'department_manager'),
  asyncHandler(attendanceController.getAttendanceReport)
);

/**
 * @route   GET /api/attendances/:id
 * @desc    Get single attendance record
 * @access  Private
 */
router.get('/:id', asyncHandler(attendanceController.getAttendanceById));

/**
 * @route   POST /api/attendances
 * @desc    Create attendance record
 * @access  Private (HR Admin, Admin, Department Manager)
 */
router.post(
  '/',
  requireRole('admin', 'hr_admin', 'department_manager'),
  asyncHandler(attendanceController.createAttendance)
);

/**
 * @route   PUT /api/attendances/:id
 * @desc    Update attendance record
 * @access  Private (HR Admin, Admin, Department Manager)
 */
router.put(
  '/:id',
  requireRole('admin', 'hr_admin', 'department_manager'),
  asyncHandler(attendanceController.updateAttendance)
);

/**
 * @route   DELETE /api/attendances/:id
 * @desc    Delete attendance record
 * @access  Private (Admin only)
 */
router.delete('/:id', requireRole('admin'), asyncHandler(attendanceController.deleteAttendance));

module.exports = router;
