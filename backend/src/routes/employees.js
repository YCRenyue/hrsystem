/**
 * Employee Routes
 */
const express = require('express');

const router = express.Router();
const multer = require('multer');
const employeeController = require('../controllers/employeeController');
const documentSigningController = require('../controllers/documentSigningController');
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

// Configure multer for the signed-document screenshot (image only)
const uploadScreenshot = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG/JPEG screenshots are allowed'));
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
 * @desc    Sign a document confirmation (policy ack / training pledge / employment contract).
 *          multipart/form-data: documentType, partyInfo (JSON string, optional),
 *          password (step-up auth), screenshot (signed document image)
 * @access  Private (employee owner, HR, Admin)
 */
router.put(
  '/:id/sign-document',
  uploadScreenshot.single('screenshot'),
  asyncHandler(documentSigningController.signDocument)
);

/**
 * @route   PUT /api/employees/:id/training-pledge
 * @desc    Save or update training pledge details (cost and service years) for an employee
 * @access  Private (HR, Admin only)
 */
router.put(
  '/:id/training-pledge',
  requireRole('hr_admin', 'admin'),
  asyncHandler(documentSigningController.saveTrainingPledge)
);

/**
 * @route   PUT /api/employees/:id/employment-contract
 * @desc    Save or update employment contract terms (party A info, position,
 *          work location, term dates, salary) for an employee
 * @access  Private (HR, Admin only)
 */
router.put(
  '/:id/employment-contract',
  requireRole('hr_admin', 'admin'),
  asyncHandler(documentSigningController.saveEmploymentContract)
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
