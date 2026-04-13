/**
 * Employee Controller
 */
const { Op } = require('sequelize');
const {
  Employee, Department, User, TrainingPledge
} = require('../models');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const { encryptionService } = require('../utils/encryption');
const { sequelize } = require('../config/database');

/**
 * Default password for new employee accounts
 */
const DEFAULT_PASSWORD = '123456';

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
 * Import employees from Excel
 */
const importFromExcel = async (req, res) => {
  const ExcelJS = require('exceljs');

  if (!req.file) {
    throw new ValidationError('请选择要上传的文件');
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(req.file.buffer);

  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) {
    throw new ValidationError('Excel文件内容为空');
  }

  const results = {
    success_count: 0,
    error_count: 0,
    errors: []
  };

  /**
   * Extract text from a cell value, handling formula result objects.
   * @param {any} value - Raw cell value
   * @returns {string|null}
   */
  const getCellText = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object' && !(value instanceof Date) && value.result !== undefined) {
      const r = value.result;
      return r !== null && r !== undefined ? String(r).trim() || null : null;
    }
    const str = String(value).trim();
    return str === '' ? null : str;
  };

  /**
   * Parse a date value from an Excel cell.
   * Handles: Date objects, Excel serial numbers, YYYY-MM-DD / YYYY/MM/DD strings.
   * @param {any} value - Cell value
   * @returns {string|null} YYYY-MM-DD or null
   */
  const parseExcelDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    if (typeof value === 'number') {
      const date = new Date((value - 25569) * 86400 * 1000);
      if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed) || /^\d{4}\/\d{2}\/\d{2}$/.test(trimmed)) {
        const d = new Date(trimmed);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
      }
    }
    return null;
  };

  /**
   * Parse birth date stored as a YYYYMMDD integer (e.g. 19711224 => "1971-12-24").
   * Falls back to parseExcelDate for Date objects.
   * @param {any} value - Cell value
   * @returns {string|null} YYYY-MM-DD or null
   */
  const parseBirthDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return parseExcelDate(value);
    const num = typeof value === 'number' ? value : parseInt(String(value).trim(), 10);
    if (!isNaN(num) && num > 19000101 && num < 21000101) {
      const s = String(num);
      if (s.length === 8) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
    }
    return parseExcelDate(value);
  };

  /**
   * Parse the contract expiry date column.
   * Excel serial numbers become actual dates; descriptive strings become contract_type.
   * @param {any} value - Cell value
   * @returns {{ contract_expiry_date: string|null, contract_type: string|null }}
   */
  const parseContractField = (value) => {
    if (!value) return { contract_expiry_date: null, contract_type: null };
    if (value instanceof Date) {
      return { contract_expiry_date: parseExcelDate(value), contract_type: null };
    }
    // Excel serial date: plausible range 2000-01-01 (36526) to 2060-01-01 (73051)
    if (typeof value === 'number' && value > 36526 && value < 73051) {
      return { contract_expiry_date: parseExcelDate(value), contract_type: null };
    }
    const text = String(value).trim();
    return { contract_expiry_date: null, contract_type: text || null };
  };

  /**
   * Find an existing department by name, or create it if absent.
   * @param {string} name - Department name
   * @returns {Promise<string|null>} department_id or null
   */
  const findOrCreateDepartment = async (name) => {
    if (!name) return null;
    let dept = await Department.findOne({ where: { name } });
    if (!dept) {
      const code = name.replace(/\s+/g, '_').substring(0, 20).toUpperCase() || `DEPT_${Date.now()}`;
      [dept] = await Department.findOrCreate({
        where: { name },
        defaults: { name, code, status: 'active' }
      });
    }
    return dept.department_id;
  };

  const statusMap = {
    待完善: 'pending',
    在职: 'active',
    离职: 'inactive',
    pending: 'pending',
    active: 'active',
    inactive: 'inactive'
  };

  const genderMap = {
    男: 'male',
    女: 'female',
    male: 'male',
    female: 'female'
  };

  // Excel column layout (1-indexed):
  // 1: 序号(skip)  2: 公司编号  3: 姓名  4: 身份证号码  5: 出生日期(YYYYMMDD int)
  // 6: 性别(formula)  7: 年龄(skip)  8: 联系电话  9: 入职时间  10: 转正日期
  // 11: 部门  12: 岗位  13: 工龄(skip)  14: 状态  15: 备注
  // 16: 合同到期日  17: 身份证复印件(skip)  18: 保险所在公司  19: 银行卡
  // Row 1: title, Row 2: headers, data starts at Row 3.
  for (let rowNum = 3; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);

    try {
      const employeeNumber = getCellText(row.getCell(2).value);
      const name = getCellText(row.getCell(3).value);

      if (!employeeNumber && !name) continue;

      if (!employeeNumber || !name) {
        results.errors.push({ row: rowNum, message: '员工编号和姓名为必填项' });
        results.error_count++;
        continue;
      }

      const genderRaw = getCellText(row.getCell(6).value);
      const gender = genderMap[genderRaw] || null;

      // Phone may be stored as a large integer in Excel
      const phoneRaw = row.getCell(8).value;
      const phone = phoneRaw !== null && phoneRaw !== undefined
        ? String(phoneRaw instanceof Date ? '' : phoneRaw).trim() || null
        : null;

      const departmentName = getCellText(row.getCell(11).value);
      const department_id = await findOrCreateDepartment(departmentName);

      const statusRaw = getCellText(row.getCell(14).value) || '在职';
      const status = statusMap[statusRaw] || 'active';

      const { contract_expiry_date, contract_type } = parseContractField(
        row.getCell(16).value
      );

      const employeeData = {
        employee_number: employeeNumber,
        name,
        id_card: getCellText(row.getCell(4).value),
        birth_date: parseBirthDate(row.getCell(5).value),
        gender,
        phone,
        entry_date: parseExcelDate(row.getCell(9).value),
        probation_end_date: parseExcelDate(row.getCell(10).value),
        department_id,
        position: getCellText(row.getCell(12).value),
        status,
        notes: getCellText(row.getCell(15).value),
        contract_expiry_date,
        contract_type,
        insurance_company: getCellText(row.getCell(18).value),
        bank_card: getCellText(row.getCell(19).value)
      };

      const existing = await Employee.findOne({
        where: { employee_number: employeeData.employee_number }
      });
      if (existing) {
        results.errors.push({
          row: rowNum,
          message: `员工 ${employeeData.employee_number} 已存在`
        });
        results.error_count++;
        continue;
      }

      const transaction = await sequelize.transaction();
      try {
        const employee = Employee.build({
          employee_number: employeeData.employee_number,
          department_id: employeeData.department_id,
          position: employeeData.position,
          employment_type: 'full_time',
          entry_date: employeeData.entry_date,
          probation_end_date: employeeData.probation_end_date,
          status: employeeData.status,
          gender: employeeData.gender,
          contract_expiry_date: employeeData.contract_expiry_date,
          contract_type: employeeData.contract_type,
          insurance_company: employeeData.insurance_company,
          notes: employeeData.notes,
          created_by: req.user?.user_id
        });

        if (employeeData.name) employee.setName(employeeData.name);
        if (employeeData.phone) employee.setPhone(employeeData.phone);
        if (employeeData.id_card) employee.setIdCard(employeeData.id_card);
        if (employeeData.bank_card) employee.setBankCard(employeeData.bank_card);
        if (employeeData.birth_date) employee.setBirthDate(employeeData.birth_date);

        await employee.save({ transaction });
        await createUserForEmployee(employee, employeeData.name, transaction);
        await transaction.commit();
        results.success_count++;
      } catch (innerError) {
        await transaction.rollback();
        throw innerError;
      }
    } catch (error) {
      results.errors.push({ row: rowNum, message: error.message });
      results.error_count++;
    }
  }

  res.json({
    success: true,
    data: results
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
  importFromExcel,
  exportToExcel,
  signDocument,
  saveTrainingPledge
};
