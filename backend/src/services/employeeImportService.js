/**
 * Employee Import Service
 * Handles Excel parsing, validation, and batch insertion for employee imports.
 */
const ExcelJS = require('exceljs');
const { Op } = require('sequelize');
const { Employee, Department, User } = require('../models');
const { encryptionService } = require('../utils/encryption');
const { sequelize } = require('../config/database');

const DEFAULT_PASSWORD = '123456';

/** Maps Excel header names to internal field names */
const HEADER_MAP = {
  公司编号: 'employee_number',
  姓名: 'name',
  身份证号码: 'id_card',
  出生日期: 'birth_date',
  性别: 'gender',
  联系电话: 'phone',
  入职时间: 'entry_date',
  转正日期: 'probation_end_date',
  部门: 'department_name',
  岗位: 'position',
  状态: 'status_raw',
  备注: 'notes',
  合同到期日: 'contract_field',
  保险所在公司: 'insurance_company',
  银行卡: 'bank_card'
};

const STATUS_MAP = {
  在职: 'active',
  待完善: 'pending',
  离职: 'inactive',
  active: 'active',
  pending: 'pending',
  inactive: 'inactive'
};

const GENDER_MAP = {
  男: 'male',
  女: 'female',
  male: 'male',
  female: 'female'
};

/**
 * Extract text from a cell value, handling formula result objects.
 * @param {any} value
 * @returns {string|null}
 */
function getCellText(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && !(value instanceof Date) && value.result !== undefined) {
    const r = value.result;
    return r !== null && r !== undefined ? String(r).trim() || null : null;
  }
  const str = String(value).trim();
  return str === '' ? null : str;
}

/**
 * Parse a date value. Handles Date objects, Excel serial numbers, and date strings.
 * @param {any} value
 * @returns {string|null} YYYY-MM-DD or null
 */
function parseExcelDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(trimmed)) {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
  }
  return null;
}

/**
 * Parse birth date stored as a YYYYMMDD integer (e.g. 19711224 => "1971-12-24").
 * @param {any} value
 * @returns {string|null}
 */
function parseBirthDate(value) {
  if (!value) return null;
  if (value instanceof Date) return parseExcelDate(value);
  const num = typeof value === 'number' ? value : parseInt(String(value).trim(), 10);
  if (!isNaN(num) && num > 19000101 && num < 21000101) {
    const s = String(num);
    if (s.length === 8) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }
  return parseExcelDate(value);
}

/**
 * Parse the contract expiry column: serial numbers become dates, text becomes contract_type.
 * @param {any} value
 * @returns {{ contract_expiry_date: string|null, contract_type: string|null }}
 */
function parseContractField(value) {
  if (!value) return { contract_expiry_date: null, contract_type: null };
  if (value instanceof Date) {
    return { contract_expiry_date: parseExcelDate(value), contract_type: null };
  }
  // Excel serial date range: 2000-01-01 (36526) to 2060-01-01 (73051)
  if (typeof value === 'number' && value > 36526 && value < 73051) {
    return { contract_expiry_date: parseExcelDate(value), contract_type: null };
  }
  const text = String(value).trim();
  return { contract_expiry_date: null, contract_type: text || null };
}

/**
 * Build a map from column index to field name by reading the header row (row 2).
 * @param {import('exceljs').Worksheet} worksheet
 * @returns {Map<number, string>}
 */
function buildColumnMap(worksheet) {
  const headerRow = worksheet.getRow(2);
  const colMap = new Map();
  headerRow.eachCell((cell, colNumber) => {
    const header = getCellText(cell.value);
    if (header && HEADER_MAP[header]) {
      colMap.set(colNumber, HEADER_MAP[header]);
    }
  });
  return colMap;
}

/**
 * Parse a single data row into a structured object.
 * @param {import('exceljs').Row} row
 * @param {Map<number, string>} colMap
 * @param {number} rowNum
 * @returns {{ data: Object|null, error: string|null }}
 */
function parseRow(row, colMap, rowNum) {
  const raw = {};
  colMap.forEach((fieldName, colNumber) => {
    raw[fieldName] = row.getCell(colNumber).value;
  });

  const employeeNumber = getCellText(raw.employee_number);
  const name = getCellText(raw.name);

  if (!employeeNumber && !name) return { data: null, error: null };
  if (!employeeNumber || !name) {
    return { data: null, error: '员工编号和姓名为必填项' };
  }

  const { contract_expiry_date, contract_type } = parseContractField(raw.contract_field);
  const phone = raw.phone !== null && raw.phone !== undefined && !(raw.phone instanceof Date)
    ? String(raw.phone).trim() || null
    : null;

  return {
    data: {
      row: rowNum,
      employee_number: employeeNumber,
      name,
      id_card: getCellText(raw.id_card),
      birth_date: parseBirthDate(raw.birth_date),
      gender: GENDER_MAP[getCellText(raw.gender)] || null,
      phone,
      entry_date: parseExcelDate(raw.entry_date),
      probation_end_date: parseExcelDate(raw.probation_end_date),
      department_name: getCellText(raw.department_name),
      position: getCellText(raw.position),
      status: STATUS_MAP[getCellText(raw.status_raw)] || 'active',
      notes: getCellText(raw.notes),
      contract_expiry_date,
      contract_type,
      insurance_company: getCellText(raw.insurance_company),
      bank_card: getCellText(raw.bank_card)
    },
    error: null
  };
}

/**
 * Parse Excel buffer into rows. Row 1 is title, row 2 is headers, data starts at row 3.
 * @param {Buffer} buffer
 * @returns {Promise<{ parsedRows: Array, parseErrors: Array }>}
 */
async function parseExcelFile(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) throw new Error('Excel文件内容为空');

  const colMap = buildColumnMap(worksheet);
  if (colMap.size === 0) throw new Error('无法识别表头，请确认使用正确的Excel模板');

  const parsedRows = [];
  const parseErrors = [];

  for (let rowNum = 3; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const hasData = row.values.some((v) => v !== null && v !== undefined && v !== '');
    if (!hasData) continue;

    const { data, error } = parseRow(row, colMap, rowNum);
    if (error) {
      parseErrors.push({ row: rowNum, type: 'parse_error', message: error });
    } else if (data) {
      parsedRows.push(data);
    }
  }

  return { parsedRows, parseErrors };
}

/**
 * Validate parsed rows against DB rules using batch queries.
 * Also creates any departments that don't yet exist.
 * @param {Array} parsedRows
 * @returns {Promise<{ validRows: Array, businessErrors: Array }>}
 */
async function validateRows(parsedRows) {
  const businessErrors = [];
  const validRows = [];

  const employeeNumbers = parsedRows.map((r) => r.employee_number);

  const [existingEmployees, existingUsers] = await Promise.all([
    Employee.findAll({
      where: { employee_number: { [Op.in]: employeeNumbers } },
      attributes: ['employee_number']
    }),
    User.findAll({
      where: { username: { [Op.in]: employeeNumbers } },
      attributes: ['username']
    })
  ]);

  const existingEmpNums = new Set(existingEmployees.map((e) => e.employee_number));
  const existingUsernames = new Set(existingUsers.map((u) => u.username));

  const departmentNames = [...new Set(parsedRows.map((r) => r.department_name).filter(Boolean))];
  const existingDepts = await Department.findAll({
    where: { name: { [Op.in]: departmentNames } },
    attributes: ['department_id', 'name']
  });
  const deptMap = {};
  existingDepts.forEach((d) => { deptMap[d.name] = d.department_id; });

  for (const deptName of departmentNames.filter((n) => !deptMap[n])) {
    const code = deptName.replace(/\s+/g, '_').substring(0, 20).toUpperCase();
    const [dept] = await Department.findOrCreate({
      where: { name: deptName },
      defaults: { name: deptName, code, status: 'active' }
    });
    deptMap[deptName] = dept.department_id;
  }

  const seenNumbers = new Set();

  for (const rowData of parsedRows) {
    const num = rowData.employee_number;

    if (existingEmpNums.has(num) || existingUsernames.has(num)) {
      businessErrors.push({
        row: rowData.row,
        type: 'business_error',
        message: `员工编号 ${num} 已存在`
      });
      continue;
    }
    if (seenNumbers.has(num)) {
      businessErrors.push({
        row: rowData.row,
        type: 'business_error',
        message: `员工编号 ${num} 在文件中重复`
      });
      continue;
    }
    seenNumbers.add(num);
    validRows.push({ ...rowData, department_id: deptMap[rowData.department_name] || null });
  }

  return { validRows, businessErrors };
}

/**
 * Batch insert valid rows into the database in a single transaction.
 * @param {Array} validRows
 * @param {string} userId - ID of the user performing the import
 * @returns {Promise<number>} Number of rows successfully inserted
 */
async function insertRows(validRows, userId) {
  const passwordHash = await encryptionService.hashPassword(DEFAULT_PASSWORD);
  const transaction = await sequelize.transaction();

  try {
    for (const rowData of validRows) {
      const employee = Employee.build({
        employee_number: rowData.employee_number,
        department_id: rowData.department_id,
        position: rowData.position,
        employment_type: 'full_time',
        entry_date: rowData.entry_date,
        probation_end_date: rowData.probation_end_date,
        status: rowData.status,
        gender: rowData.gender,
        contract_expiry_date: rowData.contract_expiry_date,
        contract_type: rowData.contract_type,
        insurance_company: rowData.insurance_company,
        notes: rowData.notes,
        created_by: userId
      });

      if (rowData.name) employee.setName(rowData.name);
      if (rowData.phone) employee.setPhone(rowData.phone);
      if (rowData.id_card) employee.setIdCard(rowData.id_card);
      if (rowData.bank_card) employee.setBankCard(rowData.bank_card);
      if (rowData.birth_date) employee.setBirthDate(rowData.birth_date);

      await employee.save({ transaction });

      await User.create({
        employee_id: employee.employee_id,
        username: employee.employee_number,
        password_hash: passwordHash,
        display_name: rowData.name,
        role: 'employee',
        department_id: employee.department_id,
        data_scope: 'self',
        can_view_sensitive: false,
        status: 'active',
        is_active: true,
        must_change_password: true
      }, { transaction });
    }

    await transaction.commit();
    return validRows.length;
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

module.exports = { parseExcelFile, validateRows, insertRows };
