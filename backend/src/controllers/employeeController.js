/**
 * Employee Controller
 */
const { Op } = require('sequelize');
const {
  Employee, Department, User, TrainingPledge
} = require('../models');
const employeeImportService = require('../services/employeeImportService');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const { encryptionService } = require('../utils/encryption');
const { sequelize } = require('../config/database');

/**
 * Default password for new employee accounts
 */
const DEFAULT_PASSWORD = '123456';

const parseBooleanQuery = (value) => {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;

  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'no'].includes(normalized)) return false;
  return undefined;
};

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
    employment_type,
    policy_ack_status,
    training_pledge_status,
    sort_by = 'employee_number',
    sort_order = 'ASC'
  } = req.query;

  const offset = (parseInt(page, 10) - 1) * parseInt(size, 10);
  const limit = parseInt(size, 10);

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

  const parsedPolicyAckStatus = parseBooleanQuery(policy_ack_status);
  if (parsedPolicyAckStatus !== undefined) {
    where.policy_ack_status = parsedPolicyAckStatus;
  }

  const parsedTrainingPledgeStatus = parseBooleanQuery(training_pledge_status);
  if (parsedTrainingPledgeStatus !== undefined) {
    where.training_pledge_status = parsedTrainingPledgeStatus;
  }

  // Build order clause
  let orderClause;
  const validSortFields = ['employee_number', 'email', 'status', 'entry_date', 'created_at'];
  const sortField = validSortFields.includes(sort_by) ? sort_by : 'employee_number';
  const sortDirection = sort_order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  // Special handling for department sorting
  if (sort_by === 'department') {
    orderClause = [[{ model: Department, as: 'department' }, 'name', sortDirection]];
  } else {
    orderClause = [[sortField, sortDirection]];
  }

  // For name sorting, we need to fetch all and sort in memory since name is encrypted
  let fetchLimit = limit;
  let fetchOffset = offset;
  if (sort_by === 'name') {
    // Fetch all for sorting
    fetchLimit = 1000; // Reasonable limit
    fetchOffset = 0;
  }

  const { count, rows } = await Employee.findAndCountAll({
    where,
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['department_id', 'name', 'code']
      },
      {
        model: TrainingPledge,
        as: 'trainingPledge',
        attributes: ['pledge_id', 'training_cost', 'service_years'],
        required: false
      }
    ],
    offset: fetchOffset,
    limit: fetchLimit,
    order: orderClause
  });

  // Check if user has permission to view sensitive data
  const canViewSensitive = req.user?.role === 'admin' || req.user?.role === 'hr_admin';

  // Convert to safe objects
  let safeRows = rows.map((emp) => emp.toSafeObject(canViewSensitive));

  // Sort by name in memory if needed
  if (sort_by === 'name') {
    safeRows.sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      const comparison = nameA.localeCompare(nameB, 'zh-CN');
      return sortDirection === 'DESC' ? -comparison : comparison;
    });
    // Apply pagination after sorting
    safeRows = safeRows.slice(offset, offset + limit);
  }

  res.json({
    success: true,
    data: {
      items: safeRows,
      total: count,
      page: parseInt(page, 10),
      size: parseInt(size, 10),
      totalPages: Math.ceil(count / parseInt(size, 10))
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
      },
      {
        model: TrainingPledge,
        as: 'trainingPledge',
        attributes: ['pledge_id', 'training_cost', 'service_years', 'created_at', 'updated_at']
      }
    ]
  });

  if (!employee) {
    throw new NotFoundError('Employee', id);
  }

  // Check if user can view sensitive data
  const canViewSensitive = req.user?.role === 'admin'
    || req.user?.role === 'hr_admin'
    || req.user?.employee_id === id;

  res.json({
    success: true,
    data: employee.toSafeObject(canViewSensitive)
  });
};

/**
 * Create user account for an employee
 * @param {Object} employee - Employee instance
 * @param {string} employeeName - Employee name for display
 * @param {Object} transaction - Sequelize transaction
 * @returns {Promise<Object>} Created user instance
 */
const createUserForEmployee = async (employee, employeeName, transaction) => {
  // Check if username already exists
  const existingUser = await User.findOne({
    where: { username: employee.employee_number },
    transaction
  });

  if (existingUser) {
    throw new ValidationError(`用户名 ${employee.employee_number} 已存在`);
  }

  // Hash the default password
  const passwordHash = await encryptionService.hashPassword(DEFAULT_PASSWORD);

  // Create user account
  const user = await User.create({
    employee_id: employee.employee_id,
    username: employee.employee_number,
    password_hash: passwordHash,
    display_name: employeeName,
    email: employee.email,
    role: 'employee',
    department_id: employee.department_id,
    data_scope: 'self',
    can_view_sensitive: false,
    status: 'active',
    is_active: true,
    must_change_password: true
  }, { transaction });

  return user;
};

/**
 * Create new employee
 */
const createEmployee = async (req, res) => {
  const employeeData = req.body;

  // Validate required fields
  if (!employeeData.employee_number || !employeeData.name) {
    throw new ValidationError('员工编号和姓名为必填项');
  }

  // Check if employee number already exists
  const existing = await Employee.findOne({
    where: { employee_number: employeeData.employee_number }
  });

  if (existing) {
    throw new ValidationError('员工编号已存在');
  }

  // Use transaction to ensure both employee and user are created together
  const transaction = await sequelize.transaction();

  try {
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

    await employee.save({ transaction });

    // Create user account for the employee
    await createUserForEmployee(employee, employeeData.name, transaction);

    await transaction.commit();

    res.status(201).json({
      success: true,
      data: employee.toSafeObject(true),
      message: '员工创建成功，用户账户已创建，初始密码：123456'
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
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

  directFields.forEach((field) => {
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
    message: '员工删除成功'
  });
};

/**
 * Preview Excel import: parse and validate without writing to DB.
 * Returns a summary of what would be imported and any errors found.
 */
const previewImport = async (req, res) => {
  if (!req.file) throw new ValidationError('请选择要上传的文件');

  const { parsedRows, parseErrors } = await employeeImportService.parseExcelFile(req.file.buffer);
  const { validRows, businessErrors } = await employeeImportService.validateRows(parsedRows);

  const sampleRows = validRows.slice(0, 5).map((r) => ({
    row: r.row,
    employee_number: r.employee_number,
    name: r.name,
    department_name: r.department_name,
    position: r.position,
    entry_date: r.entry_date,
    status: r.status
  }));

  res.json({
    success: true,
    data: {
      total_rows: parsedRows.length + parseErrors.length,
      valid_count: validRows.length,
      parse_error_count: parseErrors.length,
      business_error_count: businessErrors.length,
      parse_errors: parseErrors,
      business_errors: businessErrors,
      sample_rows: sampleRows
    }
  });
};

/**
 * Confirm Excel import: parse, validate, and write all valid rows to DB.
 */
const confirmImport = async (req, res) => {
  if (!req.file) throw new ValidationError('请选择要上传的文件');

  const { parsedRows, parseErrors } = await employeeImportService.parseExcelFile(req.file.buffer);
  const { validRows, businessErrors } = await employeeImportService.validateRows(parsedRows);

  const allErrors = [...parseErrors, ...businessErrors];
  const errorCount = allErrors.length;

  if (validRows.length === 0) {
    return res.json({
      success: true,
      data: { success_count: 0, error_count: errorCount, errors: allErrors }
    });
  }

  const successCount = await employeeImportService.insertRows(validRows, req.user?.user_id);

  res.json({
    success: true,
    data: { success_count: successCount, error_count: errorCount, errors: allErrors }
  });
};

/**
 * Export employees to Excel
 */
const exportToExcel = async (req, res) => {
  const ExcelJS = require('exceljs');

  const {
    department_id,
    status,
    employment_type
  } = req.query;

  // Build where clause
  const where = {};
  if (department_id) where.department_id = department_id;
  if (status) where.status = status;
  if (employment_type) where.employment_type = employment_type;

  // Fetch all employees
  const employees = await Employee.findAll({
    where,
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['department_id', 'name', 'code']
      }
    ],
    order: [['created_at', 'DESC']]
  });

  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('员工列表');

  // Define columns
  worksheet.columns = [
    { header: '员工编号', key: 'employee_number', width: 15 },
    { header: '姓名', key: 'name', width: 15 },
    { header: '邮箱', key: 'email', width: 25 },
    { header: '手机号', key: 'phone', width: 15 },
    { header: '身份证号', key: 'id_card', width: 20 },
    { header: '性别', key: 'gender', width: 10 },
    { header: '出生日期', key: 'birth_date', width: 15 },
    { header: '部门', key: 'department', width: 20 },
    { header: '职位', key: 'position', width: 20 },
    { header: '雇佣类型', key: 'employment_type', width: 15 },
    { header: '入职日期', key: 'entry_date', width: 15 },
    { header: '状态', key: 'status', width: 15 }
  ];

  // Check if user can view sensitive data
  const canViewSensitive = req.user?.role === 'admin' || req.user?.role === 'hr_admin';

  // Add rows
  employees.forEach((employee) => {
    const safeData = employee.toSafeObject(canViewSensitive);
    worksheet.addRow({
      employee_number: employee.employee_number,
      name: canViewSensitive ? employee.getName() : safeData.name,
      email: employee.email,
      phone: canViewSensitive ? employee.getPhone() : safeData.phone,
      id_card: canViewSensitive ? employee.getIdCard() : safeData.id_card,
      gender: employee.gender,
      birth_date: employee.getBirthDate(),
      department: employee.department?.name || '',
      position: employee.position,
      employment_type: employee.employment_type,
      entry_date: employee.entry_date,
      status: employee.status
    });
  });

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Set response headers
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=employees_${new Date().toISOString().split('T')[0]}.xlsx`
  );

  // Write to response
  await workbook.xlsx.write(res);
  res.end();
};

/**
 * Sign a document confirmation (policy or training)
 * PUT /api/employees/:id/sign-document
 */
const signDocument = async (req, res) => {
  const { id } = req.params;
  const { documentType } = req.body;

  const validTypes = ['policy_ack', 'training_pledge'];
  if (!validTypes.includes(documentType)) {
    throw new ValidationError(
      `Invalid document type. Must be one of: ${validTypes.join(', ')}`
    );
  }

  const employee = await Employee.findByPk(id);
  if (!employee) {
    throw new NotFoundError('Employee', id);
  }

  // Verify the user owns this employee record or is HR/admin
  const userRole = req.user?.role;
  const userEmployeeId = req.user?.employee_id;
  const isOwner = userEmployeeId === id;
  const isHrOrAdmin = ['admin', 'hr_admin'].includes(userRole);

  if (!isOwner && !isHrOrAdmin) {
    throw new ValidationError('You do not have permission to sign this document');
  }

  const statusField = `${documentType}_status`;
  const signedAtField = `${documentType}_signed_at`;

  if (employee[statusField]) {
    throw new ValidationError('This document has already been signed');
  }

  await employee.update({
    [statusField]: true,
    [signedAtField]: new Date()
  });

  res.json({
    success: true,
    message: 'Document signed successfully',
    data: {
      documentType,
      signedAt: employee[signedAtField]
    }
  });
};

/**
 * Save or update training pledge details for an employee (HR only)
 * PUT /api/employees/:id/training-pledge
 */
const saveTrainingPledge = async (req, res) => {
  const { id } = req.params;
  const { training_cost, service_years } = req.body;

  const userRole = req.user?.role;
  if (!['admin', 'hr_admin'].includes(userRole)) {
    throw new ValidationError('Only HR administrators can configure training pledge details');
  }

  if (training_cost === undefined || training_cost === null || Number(training_cost) <= 0) {
    throw new ValidationError('training_cost must be a positive number');
  }

  if (!Number.isInteger(Number(service_years)) || Number(service_years) < 1 || Number(service_years) > 10) {
    throw new ValidationError('service_years must be an integer between 1 and 10');
  }

  const employee = await Employee.findByPk(id);
  if (!employee) {
    throw new NotFoundError('Employee', id);
  }

  const { v4: uuidv4 } = require('uuid');

  const [pledge, created] = await TrainingPledge.upsert(
    {
      pledge_id: uuidv4(),
      employee_id: id,
      training_cost: Number(training_cost),
      service_years: Number(service_years)
    },
    { conflictFields: ['employee_id'] }
  );

  res.json({
    success: true,
    message: created ? 'Training pledge created' : 'Training pledge updated',
    data: {
      pledge_id: pledge.pledge_id,
      employee_id: pledge.employee_id,
      training_cost: pledge.training_cost,
      service_years: pledge.service_years
    }
  });
};

module.exports = {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  previewImport,
  confirmImport,
  exportToExcel,
  signDocument,
  saveTrainingPledge
};
