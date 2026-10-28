/**
 * Employee Controller
 */
const {
  Employee, Department, User, TrainingPledge, EmploymentContract
} = require('../models');
const employeeImportService = require('../services/employeeImportService');
const EmployeeStatusService = require('../services/EmployeeStatusService');
const {
  NotFoundError, ValidationError, ForbiddenError
} = require('../middleware/errorHandler');
const { encryptionService } = require('../utils/encryption');
const { recordOperation } = require('../utils/audit');
const { buildEmployeeKeywordWhere } = require('../utils/employeeSearch');
const { sequelize } = require('../config/database');
const { formatLocalDate } = require('../utils/dateUtils');
const { notifyDocumentToSign } = require('../services/documentNotifier');

// 无法匹配任何 UUID 的哨兵值，用于数据范围为空时返回空集
const NO_MATCH = '__no_match__';

/**
 * 依据登录用户的数据范围（data_scope）向 where 注入行级过滤。
 *  - all：不加限制
 *  - department：仅本部门（无部门则返回空集）
 *  - self：仅本人员工记录
 * 作为路由守卫之外的纵深防御，防止越权读取他部门员工 PII。
 * @param {Object} where Sequelize where 对象（原地修改）
 * @param {Object} user req.user（JWT 载荷）
 */
const applyEmployeeScope = (where, user) => {
  const scope = user?.data_scope;
  if (scope === 'department') {
    where.department_id = user.department_id || NO_MATCH;
  } else if (scope === 'self') {
    where.employee_id = user.employee_id || NO_MATCH;
  }
};

/**
 * 判断用户是否有权访问单条员工记录（用于详情查看）
 * @param {Object} user req.user
 * @param {Object} employee Employee 实例
 * @returns {boolean}
 */
const canAccessEmployee = (user, employee) => {
  const scope = user?.data_scope;
  if (scope === 'department') {
    return employee.department_id === user.department_id
      || employee.employee_id === user.employee_id;
  }
  if (scope === 'self') {
    return employee.employee_id === user.employee_id;
  }
  return true;
};

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
 * 根据列表查询参数构建员工 where 条件（关键字含姓名搜索、筛选项、数据范围）
 *
 * @param {Object} query - req.query
 * @param {Object} user - req.user
 * @returns {Promise<Object>} Sequelize where 条件
 */
const buildEmployeeWhere = async (query, user) => {
  const {
    keyword,
    department_id,
    status,
    employment_type,
    policy_ack_status,
    training_pledge_status,
    employment_contract_status
  } = query;

  const where = {};

  if (keyword) {
    // 只按工号或姓名搜索（姓名是密文，在内存中解密匹配）
    Object.assign(where, await buildEmployeeKeywordWhere(keyword));
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

  const parsedEmploymentContractStatus = parseBooleanQuery(employment_contract_status);
  if (parsedEmploymentContractStatus !== undefined) {
    where.employment_contract_status = parsedEmploymentContractStatus;
  }

  // 行级数据范围过滤（覆盖前面按 query 传入的 department_id）
  applyEmployeeScope(where, user);
  return where;
};

/**
 * Get paginated list of employees
 */
const getEmployees = async (req, res) => {
  const {
    page = 1,
    size = 10,
    sort_by = 'employee_number',
    sort_order = 'ASC'
  } = req.query;

  const offset = (parseInt(page, 10) - 1) * parseInt(size, 10);
  const limit = parseInt(size, 10);

  const where = await buildEmployeeWhere(req.query, req.user);

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
      },
      {
        model: EmploymentContract,
        as: 'employmentContract',
        attributes: ['contract_id', 'contract_type', 'position'],
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
        attributes: [
          'pledge_id', 'training_cost', 'service_years',
          'party_a_name', 'party_a_address',
          'employee_gender', 'employee_id_card_encrypted',
          'employee_household_address', 'employee_current_address',
          'contract_sign_date', 'contract_start_date', 'contract_end_date',
          'created_at', 'updated_at'
        ]
      },
      {
        model: EmploymentContract,
        as: 'employmentContract',
        attributes: [
          'contract_id', 'party_a_name', 'party_a_address',
          'contract_type', 'position', 'work_location',
          'contract_start_date', 'contract_end_date', 'monthly_salary',
          'employee_gender', 'employee_id_card_encrypted',
          'employee_household_address', 'employee_current_address',
          'created_at', 'updated_at'
        ]
      }
    ]
  });

  if (!employee) {
    throw new NotFoundError('Employee', id);
  }

  // 数据范围校验：部门经理不可跨部门查看，普通员工仅可查看本人
  if (!canAccessEmployee(req.user, employee)) {
    throw new ForbiddenError('无权查看该员工信息');
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
  await notifyDocumentToSign({
    employeeId: employee.employee_id,
    documentType: 'policy_ack',
    recipientUserId: user.user_id
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

    await recordOperation({
      req,
      operationType: 'create',
      tableName: 'employees',
      recordId: employee.employee_id,
      newValues: {
        employee_number: employee.employee_number,
        department_id: employee.department_id,
        status: employee.status
      }
    });

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

  // 离职只能走“办理离职”接口，确保同时记录离职日期、停用账号、结算年假
  if (updateData.status === 'inactive' && employee.status !== 'inactive') {
    throw new ValidationError('请在员工详情中使用“办理离职”');
  }

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

  // 审计：仅记录被修改的字段名，不记录敏感明文
  await recordOperation({
    req,
    operationType: 'update',
    tableName: 'employees',
    recordId: id,
    newValues: {
      changed_fields: Object.keys(updateData),
      department_id: employee.department_id,
      status: employee.status
    }
  });

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
 * Offboard employee: mark as inactive, record leave date, disable login, settle annual leave.
 * Employees are never deleted.
 */
const offboardEmployee = async (req, res) => {
  const { id } = req.params;
  const { leave_date: leaveDate } = req.body;

  if (!leaveDate || !/^\d{4}-\d{2}-\d{2}$/.test(leaveDate)) {
    throw new ValidationError('请选择离职日期');
  }

  const statusService = new EmployeeStatusService();
  const { employee, oldStatus } = await statusService.deactivate(id, leaveDate);

  await recordOperation({
    req,
    operationType: 'update',
    tableName: 'employees',
    recordId: id,
    oldValues: { status: oldStatus },
    newValues: { status: employee.status, leave_date: leaveDate }
  });

  res.json({
    success: true,
    data: employee.toSafeObject(true),
    message: '已办理离职，该员工的登录账号已停用'
  });
};

/**
 * Preview Excel import: parse and validate without writing to DB.
 * Returns a summary of what would be imported and any errors found.
 */
const previewImport = async (req, res) => {
  if (!req.file) throw new ValidationError('请选择要上传的文件');

  const { parsedRows, parseErrors } = await employeeImportService.parseExcelFile(req.file.buffer);
  const {
    validRows, businessErrors, newDepartments
  } = await employeeImportService.validateRows(parsedRows);

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
      new_departments: newDepartments,
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

  return res.json({
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

  // 行级数据范围过滤（覆盖 query 传入的 department_id）
  applyEmployeeScope(where, req.user);

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

  // 审计：导出敏感数据是高风险操作，记录筛选条件与导出行数
  await recordOperation({
    req,
    operationType: 'export',
    tableName: 'employees',
    newValues: {
      filters: { department_id, status, employment_type },
      count: employees.length,
      sensitive_included: canViewSensitive
    }
  });

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
    `attachment; filename=employees_${formatLocalDate(new Date())}.xlsx`
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
  offboardEmployee,
  previewImport,
  confirmImport,
  exportToExcel
};
