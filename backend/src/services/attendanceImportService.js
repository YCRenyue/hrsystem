/**
 * Attendance Import Service
 *
 * 解析「考勤卡表」风格的 Excel 文件，匹配员工并写入考勤明细与汇总。
 *
 * 文件结构说明：
 *  - 文件包含多个工作表，其中形如 "1.3.4" / "5.6.7" 等名称的工作表是员工考勤卡表
 *  - 每张考勤卡表左右排列了 3 个员工块，每块 15 列（偏移 0/15/30）
 *  - 关键行（0 基索引）：
 *      row 1 col 3 : 考勤日期范围，如 "2026/03/01 ~ 03/23"
 *      row 2 col base+8 = "姓名"，col base+9 = 姓名值
 *      row 3 col base+8 = "工号"，col base+9 = 工号值
 *      row 6 汇总值（旷工/请假/出差天/上班天/加班/迟到/早退）
 *      row 11+ 每一天的打卡记录：
 *        col base+0  : 日期标签 "01 日" / "02 一" (空格后是周几)
 *        col base+1  : 上午上班
 *        col base+3  : 上午下班
 *        col base+6  : 下午上班
 *        col base+8  : 下午下班
 *        col base+10 : 加班签到
 *        col base+12 : 加班签退
 */

const XLSX = require('xlsx');
const { Op } = require('sequelize');
const {
  Employee, Attendance, AttendanceSummary, sequelize
} = require('../models');

const BLOCK_BASES = [0, 15, 30];
const DAILY_ROW_START = 11;

// 标准班次用于推算迟到/早退分钟数
const STANDARD_MORNING_START = { hour: 8, minute: 0 };
const STANDARD_AFTERNOON_END = { hour: 17, minute: 0 };
// 迟到容忍阈值（分钟）：超过后记为迟到
const LATE_THRESHOLD_MIN = 0;
const EARLY_LEAVE_THRESHOLD_MIN = 0;

/**
 * 把单元格值转为字符串（去空格）
 */
function toText(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return '';
  return String(value).trim();
}

/**
 * 解析考勤周期字符串，如 "2026/03/01 ~ 03/23"
 * 返回 { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
 */
function parsePeriod(text) {
  if (!text) return null;
  const parts = toText(text).split('~').map((s) => s.trim());
  if (parts.length !== 2) return null;

  const startMatch = parts[0].match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (!startMatch) return null;
  const year = parseInt(startMatch[1], 10);
  const startMonth = parseInt(startMatch[2], 10);
  const startDay = parseInt(startMatch[3], 10);

  const endMatch = parts[1].match(/(?:(\d{4})[/-])?(\d{1,2})[/-](\d{1,2})/);
  if (!endMatch) return null;
  const endYear = endMatch[1] ? parseInt(endMatch[1], 10) : year;
  const endMonth = parseInt(endMatch[2], 10);
  const endDay = parseInt(endMatch[3], 10);

  const pad = (n) => String(n).padStart(2, '0');
  return {
    year,
    month: startMonth,
    start: `${year}-${pad(startMonth)}-${pad(startDay)}`,
    end: `${endYear}-${pad(endMonth)}-${pad(endDay)}`
  };
}

/**
 * 从单元格解析 HH:MM 格式的时间
 * Excel 中可能是字符串 "08:27" 或 Date 对象
 */
function parseTime(value) {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date) {
    const hh = String(value.getHours()).padStart(2, '0');
    const mm = String(value.getMinutes()).padStart(2, '0');
    const ss = String(value.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  const text = toText(value);
  const match = text.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (!match) return null;
  const hh = String(match[1]).padStart(2, '0');
  const mm = String(match[2]).padStart(2, '0');
  const ss = match[3] ? String(match[3]).padStart(2, '0') : '00';
  return `${hh}:${mm}:${ss}`;
}

function timeToMinutes(time) {
  if (!time) return null;
  const [h, m] = time.split(':').map((n) => parseInt(n, 10));
  return h * 60 + m;
}

/**
 * 解析日期单元格 "01 日" / "02 一" / "15 六"
 * 返回 { day: 1, weekday: '日' }
 */
function parseDayCell(value) {
  const text = toText(value);
  if (!text) return null;
  const match = text.match(/^(\d{1,2})\s*([日一二三四五六])?/);
  if (!match) return null;
  return {
    day: parseInt(match[1], 10),
    weekday: match[2] || null
  };
}

function isWeekendWeekday(weekday) {
  // 周末：日=Sunday 或 六=Saturday
  return weekday === '日' || weekday === '六';
}

/**
 * 读取整个工作簿（xls/xlsx 均支持）
 */
function readWorkbook(buffer) {
  return XLSX.read(buffer, { type: 'buffer', cellDates: true });
}

/**
 * 判断工作表名是否为考勤卡表（如 "1.3.4"、"5.6.7" 等数字+点组合）
 */
function isCardSheetName(name) {
  return /^\d+(?:\.\d+)*$/.test(name);
}

/**
 * 把工作表转为二维数组（header: 1）
 */
function sheetToMatrix(sheet) {
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
}

/**
 * 从某张考勤卡表中提取 3 个员工的原始数据
 * @returns {Array<{name, externalId, summary, daily}>}
 */
function extractEmployeesFromCardSheet(matrix) {
  if (!matrix || matrix.length < DAILY_ROW_START) return [];

  const periodText = toText(matrix[1] && matrix[1][3]);
  const period = parsePeriod(periodText);
  if (!period) return [];

  const nameRow = matrix[2] || [];
  const idRow = matrix[3] || [];
  const summaryRow = matrix[6] || [];

  const employees = [];

  BLOCK_BASES.forEach((base) => {
    const name = toText(nameRow[base + 9]);
    if (!name) return;

    const externalId = toText(idRow[base + 9]);

    const summary = {
      absent_days: parseFloat(summaryRow[base + 0]) || 0,
      leave_days: parseFloat(summaryRow[base + 1]) || 0,
      business_trip_days: parseFloat(summaryRow[base + 2]) || 0,
      work_days: parseFloat(summaryRow[base + 4]) || 0,
      overtime_normal_hours: parseFloat(summaryRow[base + 5]) || 0,
      overtime_holiday_hours: parseFloat(summaryRow[base + 7]) || 0,
      late_count: parseInt(summaryRow[base + 8], 10) || 0,
      late_minutes: parseInt(summaryRow[base + 9], 10) || 0,
      early_leave_count: parseInt(summaryRow[base + 11], 10) || 0,
      early_leave_minutes: parseInt(summaryRow[base + 13], 10) || 0
    };

    const daily = [];
    for (let r = DAILY_ROW_START; r < matrix.length; r += 1) {
      const row = matrix[r] || [];
      const dayInfo = parseDayCell(row[base + 0]);
      if (!dayInfo) break;

      daily.push({
        day: dayInfo.day,
        weekday: dayInfo.weekday,
        morning_check_in: parseTime(row[base + 1]),
        morning_check_out: parseTime(row[base + 3]),
        afternoon_check_in: parseTime(row[base + 6]),
        afternoon_check_out: parseTime(row[base + 8]),
        overtime_check_in: parseTime(row[base + 10]),
        overtime_check_out: parseTime(row[base + 12])
      });
    }

    employees.push({
      name,
      externalId,
      period,
      summary,
      daily
    });
  });

  return employees;
}

/**
 * 构建姓名 -> Employee 记录的映射（解密全部员工姓名）
 */
async function buildEmployeeNameIndex() {
  const employees = await Employee.findAll({
    attributes: ['employee_id', 'employee_number', 'name_encrypted', 'department_id', 'status']
  });

  const index = new Map();
  const ambiguous = new Set();

  employees.forEach((emp) => {
    const decrypted = emp.getName();
    if (!decrypted) return;
    const key = decrypted.trim();
    if (index.has(key)) {
      ambiguous.add(key);
    } else {
      index.set(key, emp);
    }
  });

  return { index, ambiguous };
}

/**
 * 根据打卡时间计算每日状态
 */
function deriveDailyStatus({
  weekday,
  morning_check_in: morningIn,
  morning_check_out: morningOut,
  afternoon_check_in: afternoonIn,
  afternoon_check_out: afternoonOut,
  overtime_check_in: overtimeIn,
  overtime_check_out: overtimeOut
}) {
  const hasAnyPunch = [
    morningIn, morningOut, afternoonIn, afternoonOut, overtimeIn, overtimeOut
  ].some((t) => !!t);

  if (!hasAnyPunch) {
    return {
      status: isWeekendWeekday(weekday) ? 'weekend' : 'absent',
      late_minutes: 0,
      early_leave_minutes: 0
    };
  }

  if (isWeekendWeekday(weekday)) {
    return { status: 'weekend', late_minutes: 0, early_leave_minutes: 0 };
  }

  let lateMin = 0;
  let earlyMin = 0;

  if (morningIn) {
    const diff = timeToMinutes(morningIn)
      - (STANDARD_MORNING_START.hour * 60 + STANDARD_MORNING_START.minute);
    if (diff > LATE_THRESHOLD_MIN) lateMin = diff;
  }

  if (afternoonOut) {
    const diff = (STANDARD_AFTERNOON_END.hour * 60 + STANDARD_AFTERNOON_END.minute)
      - timeToMinutes(afternoonOut);
    if (diff > EARLY_LEAVE_THRESHOLD_MIN) earlyMin = diff;
  }

  let status = 'normal';
  if (lateMin > 0 && earlyMin > 0) status = 'late'; // 优先标记迟到
  else if (lateMin > 0) status = 'late';
  else if (earlyMin > 0) status = 'early_leave';

  return { status, late_minutes: lateMin, early_leave_minutes: earlyMin };
}

/**
 * 将某员工的每日打卡写入 attendances 表（upsert）
 */
async function upsertDailyAttendances({
  employeeId, period, daily, sourceTag, transaction
}) {
  const { year, month } = period;
  const pad = (n) => String(n).padStart(2, '0');

  let created = 0;
  let updated = 0;

  for (const entry of daily) {
    const date = `${year}-${pad(month)}-${pad(entry.day)}`;

    const checkIn = entry.morning_check_in
      || entry.afternoon_check_in
      || entry.overtime_check_in
      || null;

    const checkOut = entry.overtime_check_out
      || entry.afternoon_check_out
      || entry.morning_check_out
      || null;

    const derived = deriveDailyStatus(entry);

    const data = {
      employee_id: employeeId,
      date,
      check_in_time: checkIn,
      check_out_time: checkOut,
      morning_check_in: entry.morning_check_in,
      morning_check_out: entry.morning_check_out,
      afternoon_check_in: entry.afternoon_check_in,
      afternoon_check_out: entry.afternoon_check_out,
      overtime_check_in: entry.overtime_check_in,
      overtime_check_out: entry.overtime_check_out,
      status: derived.status,
      late_minutes: derived.late_minutes,
      early_leave_minutes: derived.early_leave_minutes,
      source: sourceTag
    };

    const existing = await Attendance.findOne({
      where: { employee_id: employeeId, date },
      transaction
    });

    if (existing) {
      await existing.update(data, { transaction });
      updated += 1;
    } else {
      await Attendance.create(data, { transaction });
      created += 1;
    }
  }

  return { created, updated };
}

/**
 * 写入/更新 AttendanceSummary
 */
async function upsertSummary({
  employeeId, period, summary, externalId, sourceFile, transaction
}) {
  const base = {
    employee_id: employeeId,
    period_start: period.start,
    period_end: period.end,
    external_employee_number: externalId || null,
    ...summary,
    source_file: sourceFile || null,
    imported_at: new Date()
  };

  const [record, createdNew] = await AttendanceSummary.findOrCreate({
    where: {
      employee_id: employeeId,
      period_start: period.start,
      period_end: period.end
    },
    defaults: base,
    transaction
  });

  if (!createdNew) {
    await record.update(base, { transaction });
  }

  return createdNew;
}

/**
 * 主入口：导入一份考勤卡表
 * @param {Buffer} buffer
 * @param {string} sourceFile - 原始文件名（用于溯源）
 * @returns {Promise<Object>} 导入结果
 */
async function importCardWorkbook(buffer, sourceFile = null) {
  const workbook = readWorkbook(buffer);
  const cardSheets = workbook.SheetNames.filter(isCardSheetName);

  if (cardSheets.length === 0) {
    throw new Error('未在该文件中找到形如 "1.3.4" 的考勤卡表工作表');
  }

  const { index: employeeByName, ambiguous } = await buildEmployeeNameIndex();

  const result = {
    sheets_processed: cardSheets.length,
    employees_total: 0,
    matched: 0,
    unmatched: [],
    ambiguous: [],
    daily_created: 0,
    daily_updated: 0,
    summaries_created: 0,
    summaries_updated: 0,
    periods: new Set()
  };

  await sequelize.transaction(async (transaction) => {
    for (const sheetName of cardSheets) {
      const matrix = sheetToMatrix(workbook.Sheets[sheetName]);
      const items = extractEmployeesFromCardSheet(matrix);

      for (const item of items) {
        result.employees_total += 1;
        result.periods.add(`${item.period.start}~${item.period.end}`);

        if (ambiguous.has(item.name)) {
          result.ambiguous.push({ sheet: sheetName, name: item.name });
          continue;
        }

        const emp = employeeByName.get(item.name);
        if (!emp) {
          result.unmatched.push({
            sheet: sheetName,
            name: item.name,
            external_id: item.externalId
          });
          continue;
        }

        result.matched += 1;

        const { created, updated } = await upsertDailyAttendances({
          employeeId: emp.employee_id,
          period: item.period,
          daily: item.daily,
          sourceTag: 'card_import',
          transaction
        });
        result.daily_created += created;
        result.daily_updated += updated;

        const wasCreated = await upsertSummary({
          employeeId: emp.employee_id,
          period: item.period,
          summary: item.summary,
          externalId: item.externalId,
          sourceFile,
          transaction
        });
        if (wasCreated) result.summaries_created += 1;
        else result.summaries_updated += 1;
      }
    }
  });

  return {
    ...result,
    periods: Array.from(result.periods)
  };
}

/**
 * 报表：按周期查询每位员工的统计（考勤报表）
 * @param {Object} options
 * @param {string} [options.period_start]
 * @param {string} [options.period_end]
 * @param {string} [options.department_id]
 */
async function getAttendanceReport({ period_start, period_end, department_id } = {}) {
  const where = {};
  if (period_start) where.period_start = { [Op.gte]: period_start };
  if (period_end) where.period_end = { [Op.lte]: period_end };

  const include = [{
    association: 'employee',
    attributes: ['employee_id', 'employee_number', 'name_encrypted', 'department_id'],
    include: [{ association: 'department', attributes: ['department_id', 'name'] }]
  }];

  if (department_id) {
    include[0].where = { department_id };
    include[0].required = true;
  }

  const summaries = await AttendanceSummary.findAll({
    where,
    include,
    order: [['period_start', 'DESC']]
  });

  const rows = summaries.map((s) => {
    const data = s.toJSON();
    const name = s.employee && typeof s.employee.getName === 'function'
      ? s.employee.getName()
      : null;
    if (data.employee) {
      data.employee.name = name;
      delete data.employee.name_encrypted;
    }
    return data;
  });

  const totals = rows.reduce((acc, r) => {
    acc.total_late_count += Number(r.late_count) || 0;
    acc.total_late_minutes += Number(r.late_minutes) || 0;
    acc.total_early_leave_count += Number(r.early_leave_count) || 0;
    acc.total_early_leave_minutes += Number(r.early_leave_minutes) || 0;
    acc.total_leave_days += Number(r.leave_days) || 0;
    acc.total_absent_days += Number(r.absent_days) || 0;
    acc.total_business_trip_days += Number(r.business_trip_days) || 0;
    acc.total_overtime_hours += (Number(r.overtime_normal_hours) || 0)
      + (Number(r.overtime_holiday_hours) || 0);
    if (Number(r.late_count) > 0) acc.late_people.add(r.employee_id);
    if (Number(r.early_leave_count) > 0) acc.early_leave_people.add(r.employee_id);
    if (Number(r.leave_days) > 0) acc.leave_people.add(r.employee_id);
    return acc;
  }, {
    total_late_count: 0,
    total_late_minutes: 0,
    total_early_leave_count: 0,
    total_early_leave_minutes: 0,
    total_leave_days: 0,
    total_absent_days: 0,
    total_business_trip_days: 0,
    total_overtime_hours: 0,
    late_people: new Set(),
    early_leave_people: new Set(),
    leave_people: new Set()
  });

  return {
    rows,
    totals: {
      total_late_count: totals.total_late_count,
      total_late_minutes: totals.total_late_minutes,
      total_early_leave_count: totals.total_early_leave_count,
      total_early_leave_minutes: totals.total_early_leave_minutes,
      total_leave_days: totals.total_leave_days,
      total_absent_days: totals.total_absent_days,
      total_business_trip_days: totals.total_business_trip_days,
      total_overtime_hours: totals.total_overtime_hours,
      late_people_count: totals.late_people.size,
      early_leave_people_count: totals.early_leave_people.size,
      leave_people_count: totals.leave_people.size
    }
  };
}

module.exports = {
  importCardWorkbook,
  getAttendanceReport,
  // exported for unit testing
  _internal: {
    parsePeriod,
    parseTime,
    parseDayCell,
    extractEmployeesFromCardSheet,
    deriveDailyStatus,
    sheetToMatrix
  }
};
