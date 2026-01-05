/**
 * Leave Routes
 */

const express = require('express');
const multer = require('multer');

const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const leaveController = require('../controllers/leaveController');

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/leaves
 * @desc    Get leave records
 * @access  Private (HR Admin, Department Manager, Admin)
 */
router.get('/', asyncHandler(leaveController.getLeaveList));

/** * @route   GET /api/leaves/stats
 * @desc    Get leave statistics
 * @access  Private (HR Admin, Department Manager, Admin)
 */
router.get('/stats', asyncHandler(leaveController.getLeaveStats));

/**
 * @route   GET /api/leaves/template
 * @desc    Download Excel template
 * @access  Private (HR Admin, Department Manager, Admin)
 */
router.get(
  '/template',
  requireRole('admin', 'hr_admin', 'department_manager'),
  asyncHandler(leaveController.downloadTemplate)
);

/**
 * @route   GET /api/leaves/export
 * @desc    Export to Excel
 * @access  Private (HR Admin, Department Manager, Admin)
 */
router.get(
  '/export',
  requireRole('admin', 'hr_admin', 'department_manager'),
  asyncHandler(leaveController.exportToExcel)
);

/**
 * @route   POST /api/leaves/import
 * @desc    Import from Excel
 * @access  Private (HR Admin, Admin, Department Manager)
 */
router.post(
  '/import',
  requireRole('admin', 'hr_admin', 'department_manager'),
  upload.single('file'),
  asyncHandler(leaveController.importFromExcel)
);

/**
 * @route   GET /api/leaves/:id
 * @desc    Get single leave record
 * @access  Private
 */
router.get('/:id', asyncHandler(leaveController.getLeaveById));

/**
 * @route   POST /api/leaves
 * @desc    Create leave record
 * @access  Private (HR Admin, Admin, Department Manager)
 */
router.post(
  '/',
  requireRole('admin', 'hr_admin', 'department_manager'),
  asyncHandler(leaveController.createLeave)
);

/**
 * @route   PUT /api/leaves/:id
 * @desc    Update leave record
 * @access  Private (HR Admin, Admin, Department Manager)
 */
router.put(
  '/:id',
  requireRole('admin', 'hr_admin', 'department_manager'),
  asyncHandler(leaveController.updateLeave)
);

/** * @route   DELETE /api/leaves/:id
 * @desc    Delete leave record
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(leaveController.deleteLeave)
);

module.exports = router;
