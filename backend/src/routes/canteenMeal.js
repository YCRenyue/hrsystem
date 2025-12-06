/**
 * Canteen Meal Routes
 */
const express = require('express');

const router = express.Router();
const multer = require('multer');
const canteenMealController = require('../controllers/canteenMealController');
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
 * @route   GET /api/canteen-meal
 * @desc    Get canteen meal records
 * @access  Private (HR Admin, Department Manager, Admin)
 */
router.get('/', asyncHandler(canteenMealController.getCanteenMeals));

/**
 * @route   GET /api/canteen-meal/template
 * @desc    Download Excel template
 * @access  Private (HR, Admin, Department Manager)
 */
router.get(
  '/template',
  requireRole('admin', 'hr_admin', 'department_manager'),
  asyncHandler(canteenMealController.downloadTemplate)
);

/**
 * @route   GET /api/canteen-meal/export
 * @desc    Export to Excel
 * @access  Private (HR, Admin, Department Manager)
 */
router.get(
  '/export',
  requireRole('admin', 'hr_admin', 'department_manager'),
  asyncHandler(canteenMealController.exportToExcel)
);

/**
 * @route   POST /api/canteen-meal/import
 * @desc    Import from Excel
 * @access  Private (HR, Admin)
 */
router.post(
  '/import',
  requireRole('admin', 'hr_admin'),
  upload.single('file'),
  asyncHandler(canteenMealController.importFromExcel)
);

/**
 * @route   GET /api/canteen-meal/:id
 * @desc    Get single canteen meal record
 * @access  Private
 */
router.get('/:id', asyncHandler(canteenMealController.getCanteenMealById));

/**
 * @route   POST /api/canteen-meal
 * @desc    Create canteen meal record
 * @access  Private (HR, Admin)
 */
router.post(
  '/',
  requireRole('admin', 'hr_admin'),
  asyncHandler(canteenMealController.createCanteenMeal)
);

/**
 * @route   PUT /api/canteen-meal/:id
 * @desc    Update canteen meal record
 * @access  Private (HR, Admin)
 */
router.put(
  '/:id',
  requireRole('admin', 'hr_admin'),
  asyncHandler(canteenMealController.updateCanteenMeal)
);

/**
 * @route   DELETE /api/canteen-meal/:id
 * @desc    Delete canteen meal record
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(canteenMealController.deleteCanteenMeal)
);

module.exports = router;
