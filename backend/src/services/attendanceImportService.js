/**
 * Attendance Import Service
 *
 * 导入考勤打卡机导出的 Excel：
 *  - 每日考勤：解析「刷卡记录」表的原始打卡（见 ./punch/attendancePunchImport.js）
 *  - 周期汇总：沿用打卡机在「考勤卡表」（1.3.4 / 5.6.7 ...）中给出的汇总值
 *
 * 考勤卡表中每张表横排 3 位员工，块基址 0 / 15 / 30：
 *   row 3 col base+9 : 工号
 *   row 6            : 汇总值（旷工/请假/出差/上班/加班/迟到/早退）
 */

const XLSX = require('xlsx');
const { Op } = require('sequelize');
const { AttendanceSummary, sequelize } = require('../models');
const { parsePunchWorkbook } = require('./punch/punchRecordParser');
const { matchEmployees, findPunchesAfterLeave } = require('./punch/employeeMatcher');
const {
  upsertEmployeeAttendances, selectImportDates, isWeekend
} = require('./punch/attendancePunchImport');

const BLOCK_BASES = [0, 15, 30];
const DEVICE = 'attendance';
// 机器把缺卡等情况也折算为旷工，相差不超过该天数时不提醒
const SUMMARY_ABSENCE_TOLERANCE = 2;

const toText = (value) => (value === null || value === undefined ? '' : String(value).trim());

function isCardSheetName(name) {
  return /^\d+(?:\.\d+)*$/.test(name);
}

/**
 * 从考勤卡表第 7 行读取一个员工块的汇总值
 */
function readSummaryBlock(summaryRow, base) {
  const num = (offset) => parseFloat(summaryRow[base + offset]) || 0;
  const int = (offset) => parseInt(summaryRow[base + offset], 10) || 0;
  return {
    absent_days: num(0),
    leave_days: num(1),
    business_trip_days: num(2),
    work_days: num(4),
    overtime_normal_hours: num(5),
    overtime_holiday_hours: num(7),
    late_count: int(8),
    late_minutes: int(9),
    early_leave_count: int(11),
    early_leave_minutes: int(13)
  };
}

/**
 * 读取所有考勤卡表中的打卡机汇总，按机器工号索引
 * @param {Object} workbook - xlsx 工作簿
 * @returns {Map<string, Object>}
 */
function extractMachineSummaries(workbook) {
  const summaries = new Map();
  workbook.SheetNames.filter(isCardSheetName).forEach((sheetName) => {
    const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1, defval: '', raw: false
    });
    const idRow = matrix[3] || [];
    const summaryRow = matrix[6] || [];
    BLOCK_BASES.forEach((base) => {
      const externalId = toText(idRow[base + 9]);
      if (externalId) summaries.set(externalId, readSummaryBlock(summaryRow, base));
    });
  });
  return summaries;
}

/**
 * 打卡机汇总的旷工天数明显多于明细时给出提醒
 * （例如每天只打 2 次卡的员工被机器按 4 次班次记为旷工）
 */
function checkSummaryAbsence(entry, summary, dates) {
  const workdaysWithoutPunch = dates
    .filter((d) => !isWeekend(d) && !(entry.days[d] && entry.days[d].length > 0)).length;
  if (summary.absent_days <= workdaysWithoutPunch + SUMMARY_ABSENCE_TOLERANCE) return null;
  return {
    external_id: entry.externalId,
    name: entry.name,
    machine_absent_days: summary.absent_days,
    workdays_without_punch: workdaysWithoutPunch
  };
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

function createResult(parsed, sourceFile, skippedDates) {
  return {
    source_file: sourceFile,
    period: `${parsed.period.start}~${parsed.period.end}`,
    periods: [`${parsed.period.start}~${parsed.period.end}`],
    export_date: parsed.exportDate,
    skipped_dates: skippedDates,
    employees_total: parsed.employees.length,
    matched: 0,
    unmatched: [],
    ambiguous: [],
    daily_created: 0,
    daily_updated: 0,
    manual_kept: 0,
    summaries_created: 0,
    summaries_updated: 0,
    summary_warnings: [],
    punches_after_leave: []
  };
}

/**
 * 主入口：导入考勤打卡机导出文件
 * @param {Buffer} buffer
 * @param {string} [sourceFile] - 原始文件名（用于溯源）
 * @returns {Promise<Object>} 导入结果
 */
async function importCardWorkbook(buffer, sourceFile = null) {
  const parsed = parsePunchWorkbook(buffer);
  const summaries = extractMachineSummaries(parsed.workbook);
  const { dates, skipped } = selectImportDates(parsed.dates, parsed.exportDate);
  const { matched, unmatched, ambiguous } = await matchEmployees(parsed.employees, DEVICE);
  const result = createResult(parsed, sourceFile, skipped);
  Object.assign(result, {
    matched: matched.length,
    unmatched,
    ambiguous,
    punches_after_leave: findPunchesAfterLeave(matched)
  });

  await sequelize.transaction(async (transaction) => {
    for (const { entry, employee } of matched) {
      const stats = await upsertEmployeeAttendances(employee.employee_id, entry, dates, transaction);
      result.daily_created += stats.created;
      result.daily_updated += stats.updated;
      result.manual_kept += stats.manual_kept;

      const summary = summaries.get(entry.externalId);
      if (summary) {
        const warning = checkSummaryAbsence(entry, summary, dates);
        if (warning) result.summary_warnings.push(warning);
        const wasCreated = await upsertSummary({
          employeeId: employee.employee_id,
          period: parsed.period,
          summary,
          externalId: entry.externalId,
          sourceFile,
          transaction
        });
        if (wasCreated) result.summaries_created += 1;
        else result.summaries_updated += 1;
      }
    }
  });

  return result;
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
  _internal: { extractMachineSummaries, checkSummaryAbsence }
};
