/**
 * Business Trip Controller
 * Handles business trip allowance management operations
 */
const { Op } = require('sequelize');
const BusinessTrip = require('../models/BusinessTrip');
const Employee = require('../models/Employee');
const User = require('../models/User');
const ExcelService = require('../services/ExcelService');
const {
  ValidationError,
  NotFoundError
} = require('../middleware/errorHandler');

/**
 * Get business trip records with pagination and filtering
 */
const getBusinessTrips = async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    status,
    startDate,
    endDate
  } = req.query;

  const offset = (page - 1) * limit;
  const where = {};

  // Filter by status
  if (status) {
    where.status = status;
  }

  // Filter by date range
  if (startDate || endDate) {
    where.start_date = {};
    if (startDate) {
      where.start_date[Op.gte] = startDate;
    }
    if (endDate) {
      where.start_date[Op.lte] = endDate;
    }
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
      },
      {
        model: User,
        as: 'approver',
        attributes: ['user_id', 'display_name', 'username'],
        required: false
      }
    ],
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10),
    order: [['created_at', 'DESC']]
  };

  // Search by employee number
  if (search) {
    queryOptions.include[0].where = {
      [Op.or]: [
        { employee_number: { [Op.like]: `%${search}%` } }
      ]
    };
  }

  const { count, rows } = await BusinessTrip.findAndCountAll(queryOptions);

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
 * Get single business trip record
 */
const getBusinessTripById = async (req, res) => {
  const { id } = req.params;

  const record = await BusinessTrip.findByPk(id, {
    include: [
      {
        model: Employee,
        as: 'employee',
        attributes: ['employee_id', 'employee_number', 'name_encrypted']
      },
      {
        model: User,
        as: 'approver',
        attributes: ['user_id', 'display_name', 'username']
      }
    ]
  });

  if (!record) {
    throw new NotFoundError('Business trip record', id);
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
 * Create business trip record
 */
const createBusinessTrip = async (req, res) => {
  const {
    employee_id,
    trip_number,
    start_date,
    end_date,
    destination,
    purpose,
    days,
    transportation_allowance = 0,
    accommodation_allowance = 0,
    meal_allowance = 0,
    other_allowance = 0,
    approver_id,
    approval_notes,
    notes
  } = req.body;

  // Validation
  if (!employee_id || !trip_number || !start_date || !end_date
    || !destination || days === undefined) {
    throw new ValidationError(
      'Employee ID, trip number, dates, destination, and days are required'
    );
  }

  // Check if employee exists
  const employee = await Employee.findByPk(employee_id);
  if (!employee) {
    throw new NotFoundError('Employee', employee_id);
  }

  // Check for duplicate trip number
  const existing = await BusinessTrip.findOne({
    where: { trip_number }
  });

  if (existing) {
    throw new ValidationError(
      `Business trip number ${trip_number} already exists`
    );
  }

  // Validate approver if provided
  if (approver_id) {
    const approver = await User.findByPk(approver_id);
    if (!approver) {
      throw new NotFoundError('Approver', approver_id);
    }
  }

  // Calculate total allowance
  const totalAllowance = parseFloat(transportation_allowance || 0)
    + parseFloat(accommodation_allowance || 0)
    + parseFloat(meal_allowance || 0)
    + parseFloat(other_allowance || 0);

  const record = await BusinessTrip.create({
    employee_id,
    trip_number,
    start_date,
    end_date,
    destination,
    purpose,
    days: parseInt(days, 10),
    transportation_allowance: parseFloat(transportation_allowance),
    accommodation_allowance: parseFloat(accommodation_allowance),
    meal_allowance: parseFloat(meal_allowance),
    other_allowance: parseFloat(other_allowance),
    total_allowance: totalAllowance,
    approver_id,
    approval_notes,
    notes
  });

  res.status(201).json({
    success: true,
    data: record
  });
};

/**
 * Update business trip record
 */
const updateBusinessTrip = async (req, res) => {
  const { id } = req.params;
  const {
    start_date,
    end_date,
    destination,
    purpose,
    days,
    transportation_allowance,
    accommodation_allowance,
    meal_allowance,
    other_allowance,
    status,
    approver_id,
    approval_notes,
    notes
  } = req.body;

  const record = await BusinessTrip.findByPk(id);

  if (!record) {
    throw new NotFoundError('Business trip record', id);
  }

  // Validate approver if changing
  if (approver_id && approver_id !== record.approver_id) {
    const approver = await User.findByPk(approver_id);
    if (!approver) {
      throw new NotFoundError('Approver', approver_id);
    }
  }

  // Calculate total allowance if any allowance changed
  let totalAllowance = record.total_allowance;
  if (transportation_allowance !== undefined
    || accommodation_allowance !== undefined
    || meal_allowance !== undefined
    || other_allowance !== undefined) {
    totalAllowance = parseFloat(transportation_allowance ?? record.transportation_allowance)
      + parseFloat(accommodation_allowance ?? record.accommodation_allowance)
      + parseFloat(meal_allowance ?? record.meal_allowance)
      + parseFloat(other_allowance ?? record.other_allowance);
  }

  await record.update({
    start_date: start_date !== undefined ? start_date : record.start_date,
    end_date: end_date !== undefined ? end_date : record.end_date,
    destination: destination !== undefined ? destination : record.destination,
    purpose: purpose !== undefined ? purpose : record.purpose,
    days: days !== undefined ? parseInt(days, 10) : record.days,
    transportation_allowance: transportation_allowance !== undefined
      ? parseFloat(transportation_allowance)
      : record.transportation_allowance,
    accommodation_allowance: accommodation_allowance !== undefined
      ? parseFloat(accommodation_allowance)
      : record.accommodation_allowance,
    meal_allowance: meal_allowance !== undefined
      ? parseFloat(meal_allowance)
      : record.meal_allowance,
    other_allowance: other_allowance !== undefined
      ? parseFloat(other_allowance)
      : record.other_allowance,
    total_allowance: totalAllowance,
    status: status !== undefined ? status : record.status,
    approver_id: approver_id !== undefined ? approver_id : record.approver_id,
    approval_notes: approval_notes !== undefined
      ? approval_notes
      : record.approval_notes,
    notes: notes !== undefined ? notes : record.notes
  });

  res.json({
    success: true,
    data: record
  });
};

/**
 * Delete business trip record
 */
const deleteBusinessTrip = async (req, res) => {
  const { id } = req.params;

  const record = await BusinessTrip.findByPk(id);

  if (!record) {
    throw new NotFoundError('Business trip record', id);
  }

  await record.destroy();

  res.json({
    success: true,
    message: '出差记录删除成功'
  });
};

/**
 * Download Excel template
 */
const downloadTemplate = async (req, res) => {
  const columns = [
    { header: '员工编号', key: 'employee_number', width: 15 },
    { header: '出差单号', key: 'trip_number', width: 15 },
    { header: '开始日期', key: 'start_date', width: 15 },
    { header: '结束日期', key: 'end_date', width: 15 },
    { header: '目的地', key: 'destination', width: 20 },
    { header: '目的', key: 'purpose', width: 30 },
    { header: '天数', key: 'days', width: 10 },
    { header: '交通补助', key: 'transportation_allowance', width: 12 },
    { header: '住宿补助', key: 'accommodation_allowance', width: 12 },
    { header: '餐费补助', key: 'meal_allowance', width: 12 },
    { header: '其他补助', key: 'other_allowance', width: 12 },
    { header: '状态', key: 'status', width: 12 },
    { header: '备注', key: 'notes', width: 30 }
  ];

  const sampleData = [
    {
      employee_number: 'EMP001',
      trip_number: 'BT202501001',
      start_date: '2025-01-15',
      end_date: '2025-01-17',
      destination: '北京',
      purpose: '客户洽谈',
      days: 3,
      transportation_allowance: 500,
      accommodation_allowance: 600,
      meal_allowance: 300,
      other_allowance: 100,
      status: 'draft',
      notes: '示例数据'
    }
  ];

  const workbook = ExcelService.createTemplate(columns, sampleData);
  const filename = `business_trip_template_${
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
      const tripNumber = ExcelService.getCellValue(row.getCell(2));
      const startDate = ExcelService.parseExcelDate(row.getCell(3).value);
      const endDate = ExcelService.parseExcelDate(row.getCell(4).value);
      const destination = ExcelService.getCellValue(row.getCell(5));
      const purpose = ExcelService.getCellValue(row.getCell(6));
      const days = ExcelService.getCellValue(row.getCell(7));
      const transportationAllowance = ExcelService.getCellValue(row.getCell(8)) || 0;
      const accommodationAllowance = ExcelService.getCellValue(row.getCell(9)) || 0;
      const mealAllowance = ExcelService.getCellValue(row.getCell(10)) || 0;
      const otherAllowance = ExcelService.getCellValue(row.getCell(11)) || 0;
      const status = ExcelService.getCellValue(row.getCell(12)) || 'draft';
      const notes = ExcelService.getCellValue(row.getCell(13));

      if (!employeeNumber) {
        throw new Error('Employee number is required');
      }

      if (!tripNumber) {
        throw new Error('Trip number is required');
      }

      // Find employee
      const employee = await Employee.findOne({
        where: { employee_number: employeeNumber }
      });

      if (!employee) {
        throw new Error(`Employee ${employeeNumber} not found`);
      }

      // Check for duplicate trip number
      const existing = await BusinessTrip.findOne({
        where: { trip_number: tripNumber }
      });

      const transportationAllowanceNum = parseFloat(transportationAllowance);
      const accommodationAllowanceNum = parseFloat(accommodationAllowance);
      const mealAllowanceNum = parseFloat(mealAllowance);
      const otherAllowanceNum = parseFloat(otherAllowance);
      const totalAllowance = transportationAllowanceNum
        + accommodationAllowanceNum
        + mealAllowanceNum
        + otherAllowanceNum;

      const data = {
        employee_id: employee.employee_id,
        trip_number: tripNumber,
        start_date: startDate,
        end_date: endDate,
        destination,
        purpose,
        days: parseInt(days, 10),
        transportation_allowance: transportationAllowanceNum,
        accommodation_allowance: accommodationAllowanceNum,
        meal_allowance: mealAllowanceNum,
        other_allowance: otherAllowanceNum,
        total_allowance: totalAllowance,
        status,
        notes
      };

      if (existing) {
        await existing.update(data);
      } else {
        await BusinessTrip.create(data);
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
    status, search, startDate, endDate
  } = req.query;

  const where = {};

  if (status) {
    where.status = status;
  }

  if (startDate || endDate) {
    where.start_date = {};
    if (startDate) {
      where.start_date[Op.gte] = startDate;
    }
    if (endDate) {
      where.start_date[Op.lte] = endDate;
    }
  }

  const queryOptions = {
    where,
    include: [
      {
        model: Employee,
        as: 'employee',
        attributes: ['employee_number', 'name_encrypted'],
        required: true
      },
      {
        model: User,
        as: 'approver',
        attributes: ['user_id', 'display_name'],
        required: false
      }
    ],
    order: [['created_at', 'DESC']]
  };

  if (search) {
    queryOptions.include[0].where = {
      [Op.or]: [
        { employee_number: { [Op.like]: `%${search}%` } }
      ]
    };
  }

  const records = await BusinessTrip.findAll(queryOptions);

  const data = records.map((record) => ({
    employee_number: record.employee.employee_number,
    employee_name: record.employee.getName(),
    trip_number: record.trip_number,
    start_date: record.start_date,
    end_date: record.end_date,
    destination: record.destination,
    purpose: record.purpose,
    days: record.days,
    transportation_allowance: record.transportation_allowance,
    accommodation_allowance: record.accommodation_allowance,
    meal_allowance: record.meal_allowance,
    other_allowance: record.other_allowance,
    total_allowance: record.total_allowance,
    status: record.status,
    approver_name: record.approver ? record.approver.display_name : '',
    approval_notes: record.approval_notes,
    notes: record.notes
  }));

  const columns = [
    { header: '员工编号', key: 'employee_number', width: 15 },
    { header: '员工姓名', key: 'employee_name', width: 15 },
    { header: '出差单号', key: 'trip_number', width: 15 },
    { header: '开始日期', key: 'start_date', width: 15 },
    { header: '结束日期', key: 'end_date', width: 15 },
    { header: '目的地', key: 'destination', width: 20 },
    { header: '目的', key: 'purpose', width: 30 },
    { header: '天数', key: 'days', width: 10 },
    { header: '交通补助', key: 'transportation_allowance', width: 12 },
    { header: '住宿补助', key: 'accommodation_allowance', width: 12 },
    { header: '餐费补助', key: 'meal_allowance', width: 12 },
    { header: '其他补助', key: 'other_allowance', width: 12 },
    { header: '合计补助', key: 'total_allowance', width: 12 },
    { header: '状态', key: 'status', width: 12 },
    { header: '审批人', key: 'approver_name', width: 15 },
    { header: '审批意见', key: 'approval_notes', width: 30 },
    { header: '备注', key: 'notes', width: 30 }
  ];

  const workbook = await ExcelService.exportToExcel(
    data,
    columns,
    'Business Trip'
  );

  const filename = `business_trip_${new Date().toISOString().split('T')[0]}.xlsx`;
  await ExcelService.sendExcelResponse(res, workbook, filename);
};

module.exports = {
  getBusinessTrips,
  getBusinessTripById,
  createBusinessTrip,
  updateBusinessTrip,
  deleteBusinessTrip,
  downloadTemplate,
  importFromExcel,
  exportToExcel
};
