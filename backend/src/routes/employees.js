/**
 * Employee Routes
 */
const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

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
