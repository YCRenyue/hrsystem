/**
 * Employee Controller
 */
const { Employee, Department } = require('../models');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

/**
 * Get paginated list of employees
 */
const getEmployees = async (req, res) => {
  const {
    page = 1,
    size = 10,
    keyword,
    department_id,
    status,
    employment_type
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(size);
  const limit = parseInt(size);

  // Build where clause
  const where = {};

  if (keyword) {
    // Search in non-encrypted fields only
    where[Op.or] = [
      { employee_number: { [Op.like]: `%${keyword}%` } },
      { email: { [Op.like]: `%${keyword}%` } }
    ];
  }

  if (department_id) {
    where.department_id = department_id;
  }

  if (status) {
    where.status = status;
  }

  if (employment_type) {
    where.employment_type = employment_type;
  }

  const { count, rows } = await Employee.findAndCountAll({
    where,
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['department_id', 'name', 'code']
      }
    ],
    offset,
    limit,
    order: [['created_at', 'DESC']]
  });

  // Check if user has permission to view sensitive data
  const canViewSensitive = req.user?.role === 'admin' || req.user?.role === 'hr';

  // Convert to safe objects
  const safeRows = rows.map(emp => emp.toSafeObject(canViewSensitive));

  res.json({
    success: true,
    data: {
      items: safeRows,
      total: count,
      page: parseInt(page),
      size: parseInt(size),
      totalPages: Math.ceil(count / parseInt(size))
    }
  });
};

/**
 * Get single employee by ID
 */
const getEmployeeById = async (req, res) => {
  const { id } = req.params;

  const employee = await Employee.findByPk(id, {
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['department_id', 'name', 'code']
      }
    ]
  });

  if (!employee) {
    throw new NotFoundError('Employee', id);
  }

  // Check if user can view sensitive data
  const canViewSensitive =
    req.user?.role === 'admin' ||
    req.user?.role === 'hr' ||
    req.user?.employee_id === id;

  res.json({
    success: true,
    data: employee.toSafeObject(canViewSensitive)
  });
};

/**
 * Create new employee
 */
const createEmployee = async (req, res) => {
  const employeeData = req.body;

  // Validate required fields
  if (!employeeData.employee_number || !employeeData.name) {
    throw new ValidationError('Employee number and name are required');
  }

  // Check if employee number already exists
  const existing = await Employee.findOne({
    where: { employee_number: employeeData.employee_number }
  });

  if (existing) {
    throw new ValidationError('Employee number already exists');
  }

  // Create employee instance
  const employee = Employee.build({
    employee_number: employeeData.employee_number,
    email: employeeData.email,
    department_id: employeeData.department_id,
    position: employeeData.position,
    employment_type: employeeData.employment_type,
    entry_date: employeeData.entry_date,
    probation_end_date: employeeData.probation_end_date,
    status: employeeData.status || 'pending',
    gender: employeeData.gender,
    address: employeeData.address,
    emergency_contact: employeeData.emergency_contact,
    emergency_phone: employeeData.emergency_phone,
    created_by: req.user?.user_id
  });

  // Set encrypted fields using helper methods
  if (employeeData.name) employee.setName(employeeData.name);
  if (employeeData.phone) employee.setPhone(employeeData.phone);
  if (employeeData.id_card) employee.setIdCard(employeeData.id_card);
  if (employeeData.bank_card) employee.setBankCard(employeeData.bank_card);
  if (employeeData.birth_date) employee.setBirthDate(employeeData.birth_date);

  await employee.save();

  res.status(201).json({
    success: true,
    data: employee.toSafeObject(true)
  });
};

/**
 * Update employee
 */
const updateEmployee = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const employee = await Employee.findByPk(id);

  if (!employee) {
    throw new NotFoundError('Employee', id);
  }

  // Don't allow updating employee_number
  delete updateData.employee_number;

  // Update non-encrypted fields directly
  const directFields = [
    'email', 'department_id', 'position', 'employment_type',
    'entry_date', 'probation_end_date', 'leave_date', 'status',
    'gender', 'address', 'emergency_contact', 'emergency_phone'
  ];

  directFields.forEach(field => {
    if (updateData[field] !== undefined) {
      employee[field] = updateData[field];
    }
  });

  // Update encrypted fields using helper methods
  if (updateData.name) employee.setName(updateData.name);
  if (updateData.phone) employee.setPhone(updateData.phone);
  if (updateData.id_card) employee.setIdCard(updateData.id_card);
  if (updateData.bank_card) employee.setBankCard(updateData.bank_card);
  if (updateData.birth_date) employee.setBirthDate(updateData.birth_date);

  employee.updated_by = req.user?.user_id;
  await employee.save();

  // Reload with associations
  await employee.reload({
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['department_id', 'name', 'code']
      }
    ]
  });

  res.json({
    success: true,
    data: employee.toSafeObject(true)
  });
};

/**
 * Delete employee
 */
const deleteEmployee = async (req, res) => {
  const { id } = req.params;

  const employee = await Employee.findByPk(id);

  if (!employee) {
    throw new NotFoundError('Employee', id);
  }

  await employee.destroy();

  res.json({
    success: true,
    message: 'Employee deleted successfully'
  });
};

/**
 * Import employees from Excel
 */
const importFromExcel = async (req, res) => {
  // TODO: Implement Excel import logic
  throw new Error('Excel import not yet implemented');
};

/**
 * Export employees to Excel
 */
const exportToExcel = async (req, res) => {
  // TODO: Implement Excel export logic
  throw new Error('Excel export not yet implemented');
};

module.exports = {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  importFromExcel,
  exportToExcel
};
