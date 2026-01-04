/**
 * Employee Controller
 */
const { Op } = require('sequelize');
const { Employee, Department, User } = require('../models');
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
   * Parse date value from Excel cell
   * @param {any} value - Cell value
   * @returns {string|null} - Formatted date string or null
   */
  const parseExcelDate = (value) => {
    if (!value) return null;

    // If value is already a Date object
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }

    // If value is a number (Excel serial date)
    if (typeof value === 'number') {
      const date = new Date((value - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }

    // If value is a string, try to parse it
    if (typeof value === 'string') {
      const trimmed = value.trim();
      // Skip non-date strings like "离职", "在职" etc.
      if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed) && !/^\d{4}\/\d{2}\/\d{2}$/.test(trimmed)) {
        return null;
      }
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }

    return null;
  };

  // Skip header row
  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);

    try {
      // Map status from Chinese to English
      const statusValue = row.getCell(11).value?.toString().trim() || '在职';
      const statusMap = {
        待完善: 'pending',
        在职: 'active',
        离职: 'inactive',
        pending: 'pending',
        active: 'active',
        inactive: 'inactive'
      };
      const status = statusMap[statusValue] || 'active';

      // Map employment type from Chinese to English
      const employmentTypeValue = row.getCell(12).value?.toString().trim() || '';
      const employmentTypeMap = {
        全职: 'full_time',
        兼职: 'part_time',
        实习: 'intern',
        合同工: 'contractor',
        full_time: 'full_time',
        part_time: 'part_time',
        intern: 'intern',
        contractor: 'contractor'
      };
      const employment_type = employmentTypeMap[employmentTypeValue] || 'full_time';

      // Map gender from Chinese to English
      const genderValue = row.getCell(3).value?.toString().trim() || '';
      const genderMap = {
        男: 'male',
        女: 'female',
        male: 'male',
        female: 'female'
      };
      const gender = genderMap[genderValue];

      // Get department name and look up department_id
      const departmentName = row.getCell(8).value?.toString().trim();
      let department_id = null;
      if (departmentName) {
        const department = await Department.findOne({
          where: { name: departmentName }
        });
        department_id = department?.department_id;
      }

      const employeeData = {
        employee_number: row.getCell(1).value?.toString().trim(),
        name: row.getCell(2).value?.toString().trim(),
        gender,
        birth_date: parseExcelDate(row.getCell(4).value),
        id_card: row.getCell(5).value?.toString().trim(),
        phone: row.getCell(6).value?.toString().trim(),
        email: row.getCell(7).value?.toString().trim(),
        department_id,
        position: row.getCell(9).value?.toString().trim(),
        entry_date: parseExcelDate(row.getCell(10).value),
        status,
        employment_type,
        bank_card: row.getCell(13).value?.toString().trim(),
        address: row.getCell(14).value?.toString().trim(),
        emergency_contact: row.getCell(15).value?.toString().trim(),
        emergency_phone: row.getCell(16).value?.toString().trim()
      };

      // Skip empty rows
      if (!employeeData.employee_number && !employeeData.name) {
        continue;
      }

      // Validate required fields
      if (!employeeData.employee_number || !employeeData.name) {
        results.errors.push({
          row: rowNum,
          message: '员工编号和姓名为必填项'
        });
        results.error_count++;
        continue;
      }

      // Check if employee already exists
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

      // Validate department exists
      if (!employeeData.department_id) {
        results.errors.push({
          row: rowNum,
          message: `部门"${departmentName}"不存在`
        });
        results.error_count++;
        continue;
      }

      // Use transaction to create employee and user together
      const transaction = await sequelize.transaction();

      try {
        // Create employee
        const employee = Employee.build({
          employee_number: employeeData.employee_number,
          email: employeeData.email,
          department_id: employeeData.department_id,
          position: employeeData.position,
          employment_type: employeeData.employment_type,
          entry_date: employeeData.entry_date,
          status: employeeData.status,
          gender: employeeData.gender,
          address: employeeData.address,
          emergency_contact: employeeData.emergency_contact,
          emergency_phone: employeeData.emergency_phone,
          created_by: req.user?.user_id
        });

        // Set encrypted fields
        if (employeeData.name) employee.setName(employeeData.name);
        if (employeeData.phone) employee.setPhone(employeeData.phone);
        if (employeeData.id_card) employee.setIdCard(employeeData.id_card);
        if (employeeData.bank_card) employee.setBankCard(employeeData.bank_card);
        if (employeeData.birth_date) employee.setBirthDate(employeeData.birth_date);

        await employee.save({ transaction });

        // Create user account for the employee
        await createUserForEmployee(employee, employeeData.name, transaction);

        await transaction.commit();
        results.success_count++;
      } catch (innerError) {
        await transaction.rollback();
        throw innerError;
      }
    } catch (error) {
      results.errors.push({
        row: rowNum,
        message: error.message
      });
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

module.exports = {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  importFromExcel,
  exportToExcel
};
