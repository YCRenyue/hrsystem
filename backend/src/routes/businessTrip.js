/**
 * Business Trip Routes
 */
const express = require('express');

const router = express.Router();
const multer = require('multer');
const businessTripController = require('../controllers/businessTripController');
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
 * @route   GET /api/business-trip
 * @desc    Get business trip records
 * @access  Private (HR Admin, Department Manager, Admin)
 */
router.get('/', asyncHandler(businessTripController.getBusinessTrips));

/**
 * @route   GET /api/business-trip/template
 * @desc    Download Excel template
 * @access  Private (HR, Admin, Department Manager)
 */
router.get(
  '/template',
  requireRole('admin', 'hr_admin', 'department_manager'),
  asyncHandler(businessTripController.downloadTemplate)
);

/**
 * @route   GET /api/business-trip/export
 * @desc    Export to Excel
 * @access  Private (HR, Admin, Department Manager)
 */
router.get(
  '/export',
  requireRole('admin', 'hr_admin', 'department_manager'),
  asyncHandler(businessTripController.exportToExcel)
);

/**
 * @route   POST /api/business-trip/import
 * @desc    Import from Excel
 * @access  Private (HR, Admin)
 */
router.post(
  '/import',
  requireRole('admin', 'hr_admin'),
  upload.single('file'),
  asyncHandler(businessTripController.importFromExcel)
);

/**
 * @route   GET /api/business-trip/:id
 * @desc    Get single business trip record
 * @access  Private
 */
router.get('/:id', asyncHandler(businessTripController.getBusinessTripById));

/**
 * @route   POST /api/business-trip
 * @desc    Create business trip record
 * @access  Private (HR, Admin)
 */
router.post(
  '/',
  requireRole('admin', 'hr_admin'),
  asyncHandler(businessTripController.createBusinessTrip)
);

/**
 * @route   PUT /api/business-trip/:id
 * @desc    Update business trip record
 * @access  Private (HR, Admin)
 */
router.put(
  '/:id',
  requireRole('admin', 'hr_admin'),
  asyncHandler(businessTripController.updateBusinessTrip)
);

/**
 * @route   DELETE /api/business-trip/:id
 * @desc    Delete business trip record
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(businessTripController.deleteBusinessTrip)
);

module.exports = router;
