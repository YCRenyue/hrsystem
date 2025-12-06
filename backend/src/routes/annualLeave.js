/**
 * Annual Leave Routes
 */
const express = require('express');

const router = express.Router();
const multer = require('multer');
const annualLeaveController = require('../controllers/annualLeaveController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/annual-leave
 * @desc    Get annual leave records
 * @access  Private (HR Admin, Department Manager, Admin)
 */
router.get('/', asyncHandler(annualLeaveController.getAnnualLeaves));

/**
 * @route   GET /api/annual-leave/template
 * @desc    Download Excel template
 * @access  Private (HR, Admin, Department Manager)
 */
router.get(
  '/template',
  requireRole('admin', 'hr_admin', 'department_manager'),
  asyncHandler(annualLeaveController.downloadTemplate)
);

/**
 * @route   GET /api/annual-leave/export
 * @desc    Export to Excel
 * @access  Private (HR, Admin, Department Manager)
 */
router.get(
  '/export',
  requireRole('admin', 'hr_admin', 'department_manager'),
  asyncHandler(annualLeaveController.exportToExcel)
);

/**
 * @route   POST /api/annual-leave/import
 * @desc    Import from Excel
 * @access  Private (HR, Admin)
 */
router.post(
  '/import',
  requireRole('admin', 'hr_admin'),
  upload.single('file'),
  asyncHandler(annualLeaveController.importFromExcel)
);

/**
 * @route   GET /api/annual-leave/:id
 * @desc    Get single annual leave record
 * @access  Private
 */
router.get('/:id', asyncHandler(annualLeaveController.getAnnualLeaveById));

/**
 * @route   POST /api/annual-leave
 * @desc    Create annual leave record
 * @access  Private (HR, Admin)
 */
router.post(
  '/',
  requireRole('admin', 'hr_admin'),
  asyncHandler(annualLeaveController.createAnnualLeave)
);

/**
 * @route   PUT /api/annual-leave/:id
 * @desc    Update annual leave record
 * @access  Private (HR, Admin)
 */
router.put(
  '/:id',
  requireRole('admin', 'hr_admin'),
  asyncHandler(annualLeaveController.updateAnnualLeave)
);

/**
 * @route   DELETE /api/annual-leave/:id
 * @desc    Delete annual leave record
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(annualLeaveController.deleteAnnualLeave)
);

module.exports = router;
