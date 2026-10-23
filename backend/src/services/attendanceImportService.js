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
    punches_after_leave: [],
    leave_with_punch: [],
    absent_without_leave: []
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
      // eslint-disable-next-line no-await-in-loop -- queries share one transaction connection and must run in order
      const stats = await upsertEmployeeAttendances(employee, entry, dates, transaction);
      result.daily_created += stats.created;
      result.daily_updated += stats.updated;
      result.manual_kept += stats.manual_kept;
      const person = { external_id: entry.externalId, name: entry.name };
      if (stats.leave_punch_dates.length > 0) {
        result.leave_with_punch.push({ ...person, dates: stats.leave_punch_dates });
      }
      if (stats.absent_dates.length > 0) {
        result.absent_without_leave.push({ ...person, dates: stats.absent_dates });
      }

      const summary = summaries.get(entry.externalId);
      if (summary) {
        const warning = checkSummaryAbsence(entry, summary, dates);
        if (warning) result.summary_warnings.push(warning);
        // eslint-disable-next-line no-await-in-loop -- queries share one transaction connection and must run in order
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

module.exports = {
  importCardWorkbook,
  _internal: { extractMachineSummaries, checkSummaryAbsence }
};
