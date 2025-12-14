/**
 * Annual Leave Controller
 * Handles annual leave management operations
 */
const { Op } = require('sequelize');
const AnnualLeave = require('../models/AnnualLeave');
const Employee = require('../models/Employee');
const ExcelService = require('../services/ExcelService');
const {
  ValidationError,
  NotFoundError
} = require('../middleware/errorHandler');

/**
 * Get annual leave records with pagination and filtering
 */
const getAnnualLeaves = async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    year
  } = req.query;

  const offset = (page - 1) * limit;
  const where = {};

  // Filter by year
  if (year) {
    where.year = parseInt(year, 10);
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
    order: [['year', 'DESC'], ['created_at', 'DESC']]
  };

  // Search by employee number or name
  if (search) {
    queryOptions.include[0].where = {
      [Op.or]: [
        { employee_number: { [Op.like]: `%${search}%` } }
      ]
    };
  }

  const { count, rows } = await AnnualLeave.findAndCountAll(queryOptions);

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
 * Get single annual leave record
 */
const getAnnualLeaveById = async (req, res) => {
  const { id } = req.params;

  const record = await AnnualLeave.findByPk(id, {
    include: [
      {
        model: Employee,
        as: 'employee',
        attributes: ['employee_id', 'employee_number', 'name_encrypted']
      }
    ]
  });

  if (!record) {
    throw new NotFoundError('Annual leave record', id);
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
 * Create annual leave record
 */
const createAnnualLeave = async (req, res) => {
  const {
    employee_id,
    year,
    total_days,
    used_days = 0,
    carry_over_days = 0,
    expiry_date,
    notes
  } = req.body;

  // Validation
  if (!employee_id || !year || total_days === undefined) {
    throw new ValidationError('Employee ID, year, and total days are required');
  }

  // Check if employee exists
  const employee = await Employee.findByPk(employee_id);
  if (!employee) {
    throw new NotFoundError('Employee', employee_id);
  }

  // Check for duplicate
  const existing = await AnnualLeave.findOne({
    where: { employee_id, year }
  });

  if (existing) {
    throw new ValidationError(
      `Annual leave record for year ${year} already exists for this employee`
    );
  }

  // Calculate remaining days
  const remaining_days = parseFloat(total_days)
    + parseFloat(carry_over_days || 0)
    - parseFloat(used_days || 0);

  const record = await AnnualLeave.create({
    employee_id,
    year: parseInt(year, 10),
    total_days: parseFloat(total_days),
    used_days: parseFloat(used_days),
    remaining_days,
    carry_over_days: carry_over_days ? parseFloat(carry_over_days) : 0,
    expiry_date,
    notes
  });

  res.status(201).json({
    success: true,
    data: record
  });
};

/**
 * Update annual leave record
 */
const updateAnnualLeave = async (req, res) => {
  const { id } = req.params;
  const {
    total_days,
    used_days,
    carry_over_days,
    expiry_date,
    notes
  } = req.body;

  const record = await AnnualLeave.findByPk(id);

  if (!record) {
    throw new NotFoundError('Annual leave record', id);
  }

  // Calculate remaining days
  const totalDays = total_days !== undefined
    ? parseFloat(total_days)
    : record.total_days;
  const usedDays = used_days !== undefined
    ? parseFloat(used_days)
    : record.used_days;
  const carryOverDays = carry_over_days !== undefined
    ? parseFloat(carry_over_days)
    : record.carry_over_days;

  const remaining_days = totalDays + carryOverDays - usedDays;

  await record.update({
    total_days: totalDays,
    used_days: usedDays,
    remaining_days,
    carry_over_days: carryOverDays,
    expiry_date: expiry_date !== undefined ? expiry_date : record.expiry_date,
    notes: notes !== undefined ? notes : record.notes
  });

  res.json({
    success: true,
    data: record
  });
};

/**
 * Delete annual leave record
 */
const deleteAnnualLeave = async (req, res) => {
  const { id } = req.params;

  const record = await AnnualLeave.findByPk(id);

  if (!record) {
    throw new NotFoundError('Annual leave record', id);
  }

  await record.destroy();

  res.json({
    success: true,
    message: 'Annual leave record deleted successfully'
  });
};

/**
 * Download Excel template
 */
const downloadTemplate = async (req, res) => {
  const columns = [
    { header: '员工编号', key: 'employee_number', width: 15 },
    { header: '年度', key: 'year', width: 10 },
    { header: '应休天数', key: 'total_days', width: 12 },
    { header: '已休天数', key: 'used_days', width: 12 },
    { header: '结转天数', key: 'carry_over_days', width: 12 },
    { header: '过期日期', key: 'expiry_date', width: 15 },
    { header: '备注', key: 'notes', width: 30 }
  ];

  const sampleData = [
    {
      employee_number: 'EMP001',
      year: 2025,
      total_days: 10,
      used_days: 2,
      carry_over_days: 0,
      expiry_date: '2025-12-31',
      notes: '示例数据'
    }
  ];

  const workbook = ExcelService.createTemplate(columns, sampleData);
  const filename = `annual_leave_template_${
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
      const year = ExcelService.getCellValue(row.getCell(2));
      const totalDays = ExcelService.getCellValue(row.getCell(3));
      const usedDays = ExcelService.getCellValue(row.getCell(4)) || 0;
      const carryOverDays = ExcelService.getCellValue(row.getCell(5)) || 0;
      const expiryDate = ExcelService.parseExcelDate(row.getCell(6).value);
      const notes = ExcelService.getCellValue(row.getCell(7));

      if (!employeeNumber) {
        throw new Error('Employee number is required');
      }

      // Find employee
      const employee = await Employee.findOne({
        where: { employee_number: employeeNumber }
      });

      if (!employee) {
        throw new Error(`Employee ${employeeNumber} not found`);
      }

      // Check for duplicate
      const existing = await AnnualLeave.findOne({
        where: {
          employee_id: employee.employee_id,
          year: parseInt(year, 10)
        }
      });

      const totalDaysNum = parseFloat(totalDays);
      const usedDaysNum = parseFloat(usedDays);
      const carryOverDaysNum = parseFloat(carryOverDays);
      const remainingDays = totalDaysNum + carryOverDaysNum - usedDaysNum;

      const data = {
        employee_id: employee.employee_id,
        year: parseInt(year, 10),
        total_days: totalDaysNum,
        used_days: usedDaysNum,
        remaining_days: remainingDays,
        carry_over_days: carryOverDaysNum,
        expiry_date: expiryDate,
        notes
      };

      if (existing) {
        await existing.update(data);
      } else {
        await AnnualLeave.create(data);
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
  const { year, search } = req.query;

  const where = {};
  if (year) {
    where.year = parseInt(year, 10);
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
    order: [['year', 'DESC'], ['created_at', 'DESC']]
  };

  if (search) {
    queryOptions.include[0].where = {
      [Op.or]: [
        { employee_number: { [Op.like]: `%${search}%` } }
      ]
    };
  }

  const records = await AnnualLeave.findAll(queryOptions);

  const data = records.map((record) => ({
    employee_number: record.employee.employee_number,
    employee_name: record.employee.getName(),
    year: record.year,
    total_days: record.total_days,
    used_days: record.used_days,
    remaining_days: record.remaining_days,
    carry_over_days: record.carry_over_days,
    expiry_date: record.expiry_date,
    notes: record.notes
  }));

  const columns = [
    { header: '员工编号', key: 'employee_number', width: 15 },
    { header: '员工姓名', key: 'employee_name', width: 15 },
    { header: '年度', key: 'year', width: 10 },
    { header: '应休天数', key: 'total_days', width: 12 },
    { header: '已休天数', key: 'used_days', width: 12 },
    { header: '剩余天数', key: 'remaining_days', width: 12 },
    { header: '结转天数', key: 'carry_over_days', width: 12 },
    { header: '过期日期', key: 'expiry_date', width: 15 },
    { header: '备注', key: 'notes', width: 30 }
  ];

  const workbook = await ExcelService.exportToExcel(
    data,
    columns,
    'Annual Leave'
  );

  const filename = `annual_leave_${new Date().toISOString().split('T')[0]}.xlsx`;
  await ExcelService.sendExcelResponse(res, workbook, filename);
};

module.exports = {
  getAnnualLeaves,
  getAnnualLeaveById,
  createAnnualLeave,
  updateAnnualLeave,
  deleteAnnualLeave,
  downloadTemplate,
  importFromExcel,
  exportToExcel
};
