/**
 * Department Routes
 */
const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/departments
 * @desc    Get all departments
 * @access  Private
 */
router.get('/', asyncHandler(departmentController.getDepartments));

/**
 * @route   GET /api/departments/:id
 * @desc    Get department by ID
 * @access  Private
 */
router.get('/:id', asyncHandler(departmentController.getDepartmentById));

/**
 * @route   POST /api/departments
 * @desc    Create new department
 * @access  Private (HR, Admin)
 */
router.post(
  '/',
  requireRole('hr', 'admin'),
  asyncHandler(departmentController.createDepartment)
);

/**
 * @route   PUT /api/departments/:id
 * @desc    Update department
 * @access  Private (HR, Admin)
 */
router.put(
  '/:id',
  requireRole('hr', 'admin'),
  asyncHandler(departmentController.updateDepartment)
);

/**
 * @route   DELETE /api/departments/:id
 * @desc    Delete department
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(departmentController.deleteDepartment)
);

module.exports = router;
