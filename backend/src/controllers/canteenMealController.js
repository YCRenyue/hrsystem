/**
 * Canteen Meal Controller
 * Handles canteen meal record management operations
 */
const { Op } = require('sequelize');
const CanteenMeal = require('../models/CanteenMeal');
const Employee = require('../models/Employee');
const ExcelService = require('../services/ExcelService');
const {
  ValidationError,
  NotFoundError
} = require('../middleware/errorHandler');

// Meal type mapping: Chinese to English
const MEAL_TYPE_CHINESE_TO_ENGLISH = {
  早餐: 'breakfast',
  午餐: 'lunch',
  晚餐: 'dinner'
};

// Payment method mapping: Chinese to English
const PAYMENT_METHOD_CHINESE_TO_ENGLISH = {
  现金: 'cash',
  饭卡: 'card',
  手机支付: 'mobile_pay',
  补贴: 'subsidy'
};

// Valid English values
const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner'];
const VALID_PAYMENT_METHODS = ['cash', 'card', 'mobile_pay', 'subsidy'];

/**
 * Convert meal type to English value
 * @param {string} mealType - Meal type (Chinese or English)
 * @returns {string|null} English meal type or null if invalid
 */
const normalizeMealType = (mealType) => {
  if (!mealType) return null;
  const trimmed = String(mealType).trim();
  if (VALID_MEAL_TYPES.includes(trimmed)) {
    return trimmed;
  }
  return MEAL_TYPE_CHINESE_TO_ENGLISH[trimmed] || null;
};

/**
 * Convert payment method to English value
 * @param {string} paymentMethod - Payment method (Chinese or English)
 * @returns {string} English payment method
 */
const normalizePaymentMethod = (paymentMethod) => {
  if (!paymentMethod) return 'subsidy';
  const trimmed = String(paymentMethod).trim();
  if (VALID_PAYMENT_METHODS.includes(trimmed)) {
    return trimmed;
  }
  return PAYMENT_METHOD_CHINESE_TO_ENGLISH[trimmed] || 'subsidy';
};

/**
 * Get canteen meal records with pagination and filtering
 */
const getCanteenMeals = async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    mealType,
    mealDateStart,
    mealDateEnd,
    isSubsidized
  } = req.query;

  const offset = (page - 1) * limit;
  const where = {};

  // Filter by meal type
  if (mealType) {
    where.meal_type = mealType;
  }

  // Filter by date range
  if (mealDateStart || mealDateEnd) {
    where.meal_date = {};
    if (mealDateStart) {
      where.meal_date[Op.gte] = mealDateStart;
    }
    if (mealDateEnd) {
      where.meal_date[Op.lte] = mealDateEnd;
    }
  }

  // Filter by subsidy status
  if (isSubsidized !== undefined) {
    where.is_subsidized = isSubsidized === 'true' || isSubsidized === true;
  }

  // Build query options
  const queryOptions = {
    where,
    include: [
      {
        model: Employee,
        as: 'employee',
        attributes: ['employee_id', 'employee_number', 'name_encrypted'],
        required: true
      }
    ],
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10),
    order: [['meal_date', 'DESC'], ['created_at', 'DESC']]
  };

  // Search by employee number
  if (search) {
    queryOptions.include[0].where = {
      [Op.or]: [
        { employee_number: { [Op.like]: `%${search}%` } }
      ]
    };
  }

  const { count, rows } = await CanteenMeal.findAndCountAll(queryOptions);

  // Decrypt employee names
  const data = rows.map((record) => {
    const obj = record.toJSON();
    if (obj.employee) {
      obj.employee.name = record.employee.getName();
      delete obj.employee.name_encrypted;
    }
    return obj;
  });

  res.json({
    success: true,
    data,
    pagination: {
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(count / limit)
    }
  });
};

/**
 * Get single canteen meal record
 */
const getCanteenMealById = async (req, res) => {
  const { id } = req.params;

  const record = await CanteenMeal.findByPk(id, {
    include: [
      {
        model: Employee,
        as: 'employee',
        attributes: ['employee_id', 'employee_number', 'name_encrypted']
      }
    ]
  });

  if (!record) {
    throw new NotFoundError('Canteen meal record', id);
  }

  const data = record.toJSON();
  if (data.employee) {
    data.employee.name = record.employee.getName();
    delete data.employee.name_encrypted;
  }

  res.json({
    success: true,
    data
  });
};

/**
 * Create canteen meal record
 */
const createCanteenMeal = async (req, res) => {
  const {
    employee_id,
    meal_date,
    meal_type,
    location,
    location_type = 'canteen',
    amount,
    subsidy_amount = 0,
    payment_method = 'subsidy',
    is_subsidized = false,
    notes
  } = req.body;

  // Validation
  if (!employee_id || !meal_date || !meal_type || amount === undefined) {
    throw new ValidationError(
      'Employee ID, meal date, meal type, and amount are required'
    );
  }

  // Check if employee exists
  const employee = await Employee.findByPk(employee_id);
  if (!employee) {
    throw new NotFoundError('Employee', employee_id);
  }

  // Validate enum values
  const validMealTypes = ['breakfast', 'lunch', 'dinner'];
  if (!validMealTypes.includes(meal_type)) {
    throw new ValidationError(
      `Invalid meal type. Must be one of: ${validMealTypes.join(', ')}`
    );
  }

  const validLocationTypes = ['canteen', 'external'];
  if (!validLocationTypes.includes(location_type)) {
    throw new ValidationError(
      `Invalid location type. Must be one of: ${validLocationTypes.join(', ')}`
    );
  }

  const validPaymentMethods = ['cash', 'card', 'mobile_pay', 'subsidy'];
  if (!validPaymentMethods.includes(payment_method)) {
    throw new ValidationError(
      `Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}`
    );
  }

  // Check for duplicate (unique constraint: employee_id, meal_date, meal_type)
  const existing = await CanteenMeal.findOne({
    where: {
      employee_id,
      meal_date,
      meal_type
    }
  });

  if (existing) {
    throw new ValidationError(
      `Meal record for ${meal_type} on ${meal_date} already exists for this employee`
    );
  }

  const record = await CanteenMeal.create({
    employee_id,
    meal_date,
    meal_type,
    location,
    location_type,
    amount: parseFloat(amount),
    subsidy_amount: parseFloat(subsidy_amount),
    payment_method,
    is_subsidized: Boolean(is_subsidized),
    notes
  });

  res.status(201).json({
    success: true,
    data: record
  });
};

/**
 * Update canteen meal record
 */
const updateCanteenMeal = async (req, res) => {
  const { id } = req.params;
  const {
    location,
    location_type,
    amount,
    subsidy_amount,
    payment_method,
    is_subsidized,
    notes
  } = req.body;

  const record = await CanteenMeal.findByPk(id);

  if (!record) {
    throw new NotFoundError('Canteen meal record', id);
  }

  // Validate location_type if provided
  if (location_type !== undefined) {
    const validLocationTypes = ['canteen', 'external'];
    if (!validLocationTypes.includes(location_type)) {
      throw new ValidationError(
        `Invalid location type. Must be one of: ${validLocationTypes.join(', ')}`
      );
    }
  }

  // Validate payment_method if provided
  if (payment_method !== undefined) {
    const validPaymentMethods = ['cash', 'card', 'mobile_pay', 'subsidy'];
    if (!validPaymentMethods.includes(payment_method)) {
      throw new ValidationError(
        `Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}`
      );
    }
  }

  await record.update({
    location: location !== undefined ? location : record.location,
    location_type: location_type !== undefined
      ? location_type
      : record.location_type,
    amount: amount !== undefined ? parseFloat(amount) : record.amount,
    subsidy_amount: subsidy_amount !== undefined
      ? parseFloat(subsidy_amount)
      : record.subsidy_amount,
    payment_method: payment_method !== undefined
      ? payment_method
      : record.payment_method,
    is_subsidized: is_subsidized !== undefined
      ? Boolean(is_subsidized)
      : record.is_subsidized,
    notes: notes !== undefined ? notes : record.notes
  });

  res.json({
    success: true,
    data: record
  });
};

/**
 * Delete canteen meal record
 */
const deleteCanteenMeal = async (req, res) => {
  const { id } = req.params;

  const record = await CanteenMeal.findByPk(id);

  if (!record) {
    throw new NotFoundError('Canteen meal record', id);
  }

  await record.destroy();

  res.json({
    success: true,
    message: '就餐记录删除成功'
  });
};

/**
 * Download Excel template
 */
const downloadTemplate = async (req, res) => {
  const columns = [
    { header: '员工编号', key: 'employee_number', width: 15 },
    { header: '就餐日期', key: 'meal_date', width: 15 },
    { header: '餐次', key: 'meal_type', width: 12 },
    { header: '地点', key: 'location', width: 20 },
    { header: '餐费金额', key: 'amount', width: 12 },
    { header: '补贴金额', key: 'subsidy_amount', width: 12 },
    { header: '支付方式', key: 'payment_method', width: 12 },
    { header: '备注', key: 'notes', width: 30 }
  ];

  const sampleData = [
    {
      employee_number: 'EMP001',
      meal_date: '2025-01-15',
      meal_type: '午餐',
      location: '食堂一楼',
      amount: 15.00,
      subsidy_amount: 5.00,
      payment_method: '饭卡',
      notes: '示例数据'
    }
  ];

  const workbook = ExcelService.createTemplate(columns, sampleData);
  const filename = `canteen_meal_template_${
    new Date().toISOString().split('T')[0]
  }.xlsx`;

  await ExcelService.sendExcelResponse(res, workbook, filename);
};

/**
 * Import from Excel
 */
const importFromExcel = async (req, res) => {
  if (!req.file) {
    throw new ValidationError('No file uploaded');
  }

  const results = await ExcelService.importFromBuffer(
    req.file.buffer,
    async (row, _rowNum) => {
      const employeeNumber = ExcelService.getCellValue(row.getCell(1));
      const mealDate = ExcelService.parseExcelDate(row.getCell(2).value);
      const mealTypeRaw = ExcelService.getCellValue(row.getCell(3));
      const location = ExcelService.getCellValue(row.getCell(4));
      const amount = ExcelService.getCellValue(row.getCell(5));
      const subsidyAmount = ExcelService.getCellValue(row.getCell(6)) || 0;
      const paymentMethodRaw = ExcelService.getCellValue(row.getCell(7));
      const notes = ExcelService.getCellValue(row.getCell(8));

      if (!employeeNumber) {
        throw new Error('Employee number is required');
      }

      if (!mealTypeRaw) {
        throw new Error('Meal type is required');
      }

      // Normalize meal type (supports Chinese)
      const mealType = normalizeMealType(mealTypeRaw);
      if (!mealType) {
        throw new Error(
          `Invalid meal type "${mealTypeRaw}". Accepted values: breakfast/lunch/dinner or 早餐/午餐/晚餐`
        );
      }

      // Normalize payment method (supports Chinese)
      const paymentMethod = normalizePaymentMethod(paymentMethodRaw);

      if (amount === undefined || amount === null || amount === '') {
        throw new Error('Meal amount is required');
      }

      // Find employee
      const employee = await Employee.findOne({
        where: { employee_number: employeeNumber }
      });

      if (!employee) {
        throw new Error(`Employee ${employeeNumber} not found`);
      }

      // Check for duplicate
      const existing = await CanteenMeal.findOne({
        where: {
          employee_id: employee.employee_id,
          meal_date: mealDate,
          meal_type: mealType
        }
      });

      const data = {
        employee_id: employee.employee_id,
        meal_date: mealDate,
        meal_type: mealType,
        location,
        location_type: 'canteen',
        amount: parseFloat(amount),
        subsidy_amount: parseFloat(subsidyAmount),
        payment_method: paymentMethod,
        is_subsidized: false,
        notes
      };

      if (existing) {
        await existing.update(data);
      } else {
        await CanteenMeal.create(data);
      }
    }
  );

  res.json({
    success: true,
    data: results
  });
};

/**
 * Export to Excel
 */
const exportToExcel = async (req, res) => {
  const {
    search, mealType, mealDateStart, mealDateEnd, isSubsidized
  } = req.query;

  const where = {};

  if (mealType) {
    where.meal_type = mealType;
  }

  if (mealDateStart || mealDateEnd) {
    where.meal_date = {};
    if (mealDateStart) {
      where.meal_date[Op.gte] = mealDateStart;
    }
    if (mealDateEnd) {
      where.meal_date[Op.lte] = mealDateEnd;
    }
  }

  if (isSubsidized !== undefined) {
    where.is_subsidized = isSubsidized === 'true' || isSubsidized === true;
  }

  const queryOptions = {
    where,
    include: [
      {
        model: Employee,
        as: 'employee',
        attributes: ['employee_number', 'name_encrypted'],
        required: true
      }
    ],
    order: [['meal_date', 'DESC'], ['created_at', 'DESC']]
  };

  if (search) {
    queryOptions.include[0].where = {
      [Op.or]: [
        { employee_number: { [Op.like]: `%${search}%` } }
      ]
    };
  }

  const records = await CanteenMeal.findAll(queryOptions);

  const data = records.map((record) => ({
    employee_number: record.employee.employee_number,
    employee_name: record.employee.getName(),
    meal_date: record.meal_date,
    meal_type: record.meal_type,
    location: record.location,
    amount: record.amount,
    subsidy_amount: record.subsidy_amount,
    payment_method: record.payment_method,
    notes: record.notes
  }));

  const columns = [
    { header: '员工编号', key: 'employee_number', width: 15 },
    { header: '员工姓名', key: 'employee_name', width: 15 },
    { header: '就餐日期', key: 'meal_date', width: 15 },
    { header: '餐次', key: 'meal_type', width: 12 },
    { header: '地点', key: 'location', width: 20 },
    { header: '餐费金额', key: 'amount', width: 12 },
    { header: '补贴金额', key: 'subsidy_amount', width: 12 },
    { header: '支付方式', key: 'payment_method', width: 12 },
    { header: '备注', key: 'notes', width: 30 }
  ];

  const workbook = await ExcelService.exportToExcel(
    data,
    columns,
    'Canteen Meal'
  );

  const filename = `canteen_meal_${new Date().toISOString().split('T')[0]}.xlsx`;
  await ExcelService.sendExcelResponse(res, workbook, filename);
};

module.exports = {
  getCanteenMeals,
  getCanteenMealById,
  createCanteenMeal,
  updateCanteenMeal,
  deleteCanteenMeal,
  downloadTemplate,
  importFromExcel,
  exportToExcel
};
