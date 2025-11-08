/**
 * Employee Routes
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const employeeController = require('../controllers/employeeController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only Excel files
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
 * @route   GET /api/employees
 * @desc    Get paginated list of employees
 * @access  Private (HR Admin, Super Admin)
 */
router.get('/', asyncHandler(employeeController.getEmployees));

/**
 * @route   GET /api/employees/:id
 * @desc    Get single employee by ID
 * @access  Private
 */
router.get('/:id', asyncHandler(employeeController.getEmployeeById));

/**
 * @route   POST /api/employees
 * @desc    Create new employee
 * @access  Private (HR, Admin)
 */
router.post(
  '/',
  requireRole('hr', 'admin'),
  asyncHandler(employeeController.createEmployee)
);

/**
 * @route   PUT /api/employees/:id
 * @desc    Update employee
 * @access  Private (HR, Admin)
 */
router.put(
  '/:id',
  requireRole('hr', 'admin'),
  asyncHandler(employeeController.updateEmployee)
);

/**
 * @route   DELETE /api/employees/:id
 * @desc    Delete employee
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(employeeController.deleteEmployee)
);

/**
 * @route   POST /api/employees/import
 * @desc    Import employees from Excel
 * @access  Private (HR, Admin)
 */
router.post(
  '/import',
  requireRole('hr', 'admin'),
  upload.single('file'),
  asyncHandler(employeeController.importFromExcel)
);

/**
 * @route   GET /api/employees/export
 * @desc    Export employees to Excel
 * @access  Private (HR, Admin)
 */
router.get(
  '/export',
  requireRole('hr', 'admin'),
  asyncHandler(employeeController.exportToExcel)
);

module.exports = router;
