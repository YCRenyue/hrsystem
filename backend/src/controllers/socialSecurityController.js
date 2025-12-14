/**
 * Social Security Controller
 * Handles social security and housing fund management operations
 */
const { Op } = require('sequelize');
const SocialSecurity = require('../models/SocialSecurity');
const Employee = require('../models/Employee');
const ExcelService = require('../services/ExcelService');
const {
  ValidationError,
  NotFoundError
} = require('../middleware/errorHandler');

/**
 * Get social security records with pagination and filtering
 */
const getSocialSecurities = async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    year_month
  } = req.query;

  const offset = (page - 1) * limit;
  const where = {};

  if (year_month) {
    where.year_month = year_month;
  }

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
    order: [['year_month', 'DESC'], ['created_at', 'DESC']]
  };

  if (search) {
    queryOptions.include[0].where = {
      [Op.or]: [
        { employee_number: { [Op.like]: `%${search}%` } }
      ]
    };
  }

  const { count, rows } = await SocialSecurity.findAndCountAll(queryOptions);

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
 * Get single social security record
 */
const getSocialSecurityById = async (req, res) => {
  const { id } = req.params;

  const record = await SocialSecurity.findByPk(id, {
    include: [
      {
        model: Employee,
        as: 'employee',
        attributes: ['employee_id', 'employee_number', 'name_encrypted']
      }
    ]
  });

  if (!record) {
    throw new NotFoundError('Social security record', id);
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
 * Create social security record
 */
const createSocialSecurity = async (req, res) => {
  const { employee_id, year_month } = req.body;

  if (!employee_id || !year_month) {
    throw new ValidationError('Employee ID and year_month are required');
  }

  const employee = await Employee.findByPk(employee_id);
  if (!employee) {
    throw new NotFoundError('Employee', employee_id);
  }

  const existing = await SocialSecurity.findOne({
    where: { employee_id, year_month }
  });

  if (existing) {
    throw new ValidationError(
      `Social security record for ${year_month} already exists`
    );
  }

  const record = await SocialSecurity.create(req.body);

  res.status(201).json({
    success: true,
    data: record
  });
};

/**
 * Update social security record
 */
const updateSocialSecurity = async (req, res) => {
  const { id } = req.params;

  const record = await SocialSecurity.findByPk(id);
  if (!record) {
    throw new NotFoundError('Social security record', id);
  }

  await record.update(req.body);

  res.json({
    success: true,
    data: record
  });
};

/**
 * Delete social security record
 */
const deleteSocialSecurity = async (req, res) => {
  const { id } = req.params;

  const record = await SocialSecurity.findByPk(id);
  if (!record) {
    throw new NotFoundError('Social security record', id);
  }

  await record.destroy();

  res.json({
    success: true,
    message: 'Social security record deleted successfully'
  });
};

/**
 * Download Excel template
 */
const downloadTemplate = async (req, res) => {
  const columns = [
    { header: '员工编号', key: 'employee_number', width: 15 },
    { header: '年月', key: 'year_month', width: 12 },
    { header: '社保基数', key: 'social_security_base', width: 15 },
    { header: '公积金基数', key: 'housing_fund_base', width: 15 },
    { header: '养老(个人)', key: 'pension_personal', width: 12 },
    { header: '养老(公司)', key: 'pension_company', width: 12 },
    { header: '医疗(个人)', key: 'medical_personal', width: 12 },
    { header: '医疗(公司)', key: 'medical_company', width: 12 },
    { header: '失业(个人)', key: 'unemployment_personal', width: 12 },
    { header: '失业(公司)', key: 'unemployment_company', width: 12 },
    { header: '工伤(公司)', key: 'injury_company', width: 12 },
    { header: '生育(公司)', key: 'maternity_company', width: 12 },
    { header: '公积金(个人)', key: 'housing_fund_personal', width: 15 },
    { header: '公积金(公司)', key: 'housing_fund_company', width: 15 },
    { header: '缴纳状态', key: 'payment_status', width: 12 },
    { header: '缴纳日期', key: 'payment_date', width: 15 },
    { header: '备注', key: 'notes', width: 30 }
  ];

  const sampleData = [
    {
      employee_number: 'EMP001',
      year_month: '2025-01',
      social_security_base: 10000,
      housing_fund_base: 10000,
      pension_personal: 800,
      pension_company: 1600,
      medical_personal: 200,
      medical_company: 1000,
      unemployment_personal: 50,
      unemployment_company: 100,
      injury_company: 80,
      maternity_company: 80,
      housing_fund_personal: 1200,
      housing_fund_company: 1200,
      payment_status: 'paid',
      payment_date: '2025-01-15',
      notes: '示例数据'
    }
  ];

  const workbook = ExcelService.createTemplate(columns, sampleData);
  const filename = `social_security_template_${
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
    async (row) => {
      const employeeNumber = ExcelService.getCellValue(row.getCell(1));
      const yearMonth = ExcelService.getCellValue(row.getCell(2));

      if (!employeeNumber || !yearMonth) {
        throw new Error('Employee number and year_month are required');
      }

      const employee = await Employee.findOne({
        where: { employee_number: employeeNumber }
      });

      if (!employee) {
        throw new Error(`Employee ${employeeNumber} not found`);
      }

      const data = {
        employee_id: employee.employee_id,
        year_month: yearMonth,
        social_security_base: parseFloat(
          ExcelService.getCellValue(row.getCell(3)) || 0
        ),
        housing_fund_base: parseFloat(
          ExcelService.getCellValue(row.getCell(4)) || 0
        ),
        pension_personal: parseFloat(
          ExcelService.getCellValue(row.getCell(5)) || 0
        ),
        pension_company: parseFloat(
          ExcelService.getCellValue(row.getCell(6)) || 0
        ),
        medical_personal: parseFloat(
          ExcelService.getCellValue(row.getCell(7)) || 0
        ),
        medical_company: parseFloat(
          ExcelService.getCellValue(row.getCell(8)) || 0
        ),
        unemployment_personal: parseFloat(
          ExcelService.getCellValue(row.getCell(9)) || 0
        ),
        unemployment_company: parseFloat(
          ExcelService.getCellValue(row.getCell(10)) || 0
        ),
        injury_company: parseFloat(
          ExcelService.getCellValue(row.getCell(11)) || 0
        ),
        maternity_company: parseFloat(
          ExcelService.getCellValue(row.getCell(12)) || 0
        ),
        housing_fund_personal: parseFloat(
          ExcelService.getCellValue(row.getCell(13)) || 0
        ),
        housing_fund_company: parseFloat(
          ExcelService.getCellValue(row.getCell(14)) || 0
        ),
        payment_status: ExcelService.getCellValue(row.getCell(15)) || 'pending',
        payment_date: ExcelService.parseExcelDate(row.getCell(16).value),
        notes: ExcelService.getCellValue(row.getCell(17))
      };

      // Calculate totals
      data.total_personal = data.pension_personal
        + data.medical_personal
        + data.unemployment_personal
        + data.housing_fund_personal;

      data.total_company = data.pension_company
        + data.medical_company
        + data.unemployment_company
        + data.injury_company
        + data.maternity_company
        + data.housing_fund_company;

      const existing = await SocialSecurity.findOne({
        where: {
          employee_id: employee.employee_id,
          year_month: yearMonth
        }
      });

      if (existing) {
        await existing.update(data);
      } else {
        await SocialSecurity.create(data);
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
  const { year_month, search } = req.query;

  const where = {};
  if (year_month) {
    where.year_month = year_month;
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
    order: [['year_month', 'DESC'], ['created_at', 'DESC']]
  };

  if (search) {
    queryOptions.include[0].where = {
      [Op.or]: [
        { employee_number: { [Op.like]: `%${search}%` } }
      ]
    };
  }

  const records = await SocialSecurity.findAll(queryOptions);

  const data = records.map((record) => ({
    employee_number: record.employee.employee_number,
    employee_name: record.employee.getName(),
    year_month: record.year_month,
    social_security_base: record.social_security_base,
    housing_fund_base: record.housing_fund_base,
    pension_personal: record.pension_personal,
    pension_company: record.pension_company,
    medical_personal: record.medical_personal,
    medical_company: record.medical_company,
    unemployment_personal: record.unemployment_personal,
    unemployment_company: record.unemployment_company,
    injury_company: record.injury_company,
    maternity_company: record.maternity_company,
    housing_fund_personal: record.housing_fund_personal,
    housing_fund_company: record.housing_fund_company,
    total_personal: record.total_personal,
    total_company: record.total_company,
    payment_status: record.payment_status,
    payment_date: record.payment_date,
    notes: record.notes
  }));

  const columns = [
    { header: '员工编号', key: 'employee_number', width: 15 },
    { header: '员工姓名', key: 'employee_name', width: 15 },
    { header: '年月', key: 'year_month', width: 12 },
    { header: '社保基数', key: 'social_security_base', width: 15 },
    { header: '公积金基数', key: 'housing_fund_base', width: 15 },
    { header: '养老(个人)', key: 'pension_personal', width: 12 },
    { header: '养老(公司)', key: 'pension_company', width: 12 },
    { header: '医疗(个人)', key: 'medical_personal', width: 12 },
    { header: '医疗(公司)', key: 'medical_company', width: 12 },
    { header: '失业(个人)', key: 'unemployment_personal', width: 12 },
    { header: '失业(公司)', key: 'unemployment_company', width: 12 },
    { header: '工伤(公司)', key: 'injury_company', width: 12 },
    { header: '生育(公司)', key: 'maternity_company', width: 12 },
    { header: '公积金(个人)', key: 'housing_fund_personal', width: 15 },
    { header: '公积金(公司)', key: 'housing_fund_company', width: 15 },
    { header: '个人合计', key: 'total_personal', width: 15 },
    { header: '公司合计', key: 'total_company', width: 15 },
    { header: '缴纳状态', key: 'payment_status', width: 12 },
    { header: '缴纳日期', key: 'payment_date', width: 15 },
    { header: '备注', key: 'notes', width: 30 }
  ];

  const workbook = await ExcelService.exportToExcel(
    data,
    columns,
    'Social Security'
  );

  const filename = `social_security_${
    new Date().toISOString().split('T')[0]
  }.xlsx`;
  await ExcelService.sendExcelResponse(res, workbook, filename);
};

module.exports = {
  getSocialSecurities,
  getSocialSecurityById,
  createSocialSecurity,
  updateSocialSecurity,
  deleteSocialSecurity,
  downloadTemplate,
  importFromExcel,
  exportToExcel
};
