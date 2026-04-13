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
 * @route   GET /api/employees/export
 * @desc    Export employees to Excel
 * @access  Private (HR, Admin)
 */
router.get(
  '/export',
  requireRole('hr_admin', 'admin'),
  asyncHandler(employeeController.exportToExcel)
);

/**
 * @route   POST /api/employees/import/preview
 * @desc    Preview Excel import: parse and validate without writing to DB
 * @access  Private (HR, Admin)
 */
router.post(
  '/import/preview',
  requireRole('hr_admin', 'admin'),
  upload.single('file'),
  asyncHandler(employeeController.previewImport)
);

/**
 * @route   POST /api/employees/import/confirm
 * @desc    Confirm Excel import: write validated rows to DB
 * @access  Private (HR, Admin)
 */
router.post(
  '/import/confirm',
  requireRole('hr_admin', 'admin'),
  upload.single('file'),
  asyncHandler(employeeController.confirmImport)
);

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
  requireRole('hr_admin', 'admin'),
  asyncHandler(employeeController.createEmployee)
);

/**
 * @route   PUT /api/employees/:id
 * @desc    Update employee
 * @access  Private (HR, Admin)
 */
router.put(
  '/:id',
  requireRole('hr_admin', 'admin'),
  asyncHandler(employeeController.updateEmployee)
);

/**
 * @route   PUT /api/employees/:id/sign-document
 * @desc    Sign a document confirmation (policy or training)
 * @access  Private (employee owner, HR, Admin)
 */
router.put(
  '/:id/sign-document',
  asyncHandler(employeeController.signDocument)
);

/**
 * @route   PUT /api/employees/:id/training-pledge
 * @desc    Save or update training pledge details (cost and service years) for an employee
 * @access  Private (HR, Admin only)
 */
router.put(
  '/:id/training-pledge',
  requireRole('hr_admin', 'admin'),
  asyncHandler(employeeController.saveTrainingPledge)
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

module.exports = router;
