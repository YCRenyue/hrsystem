/**
 * Attendance Report Service
 *
 * 考勤报表 = 打卡机汇总（AttendanceSummary）+ 系统请假（已批准的 Leave 与每日考勤）：
 *  - 请假天数取打卡机与系统请假中较大的一个，避免 HR 同时在打卡机登记时重复计算
 *  - 打卡机不知道系统请假，会把请假且未打卡的工作日记为旷工，这部分从旷工天数中扣除
 *  - 已请假但当天有打卡：标注为异常
 *  - 未请假、工作日也没有打卡：每日考勤为旷工，列出日期提醒 HR
 */

const { Op } = require('sequelize');
const { AttendanceSummary, Attendance, Leave } = require('../models');
const { applyEmployeeKeyword } = require('../utils/employeeSearch');

const PUNCH_FIELDS = [
  'check_in_time', 'check_out_time', 'morning_check_in', 'morning_check_out',
  'afternoon_check_in', 'afternoon_check_out', 'overtime_check_in', 'overtime_check_out'
];

const isWeekendDate = (date) => {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
};

/**
 * 列出起止日期之间的工作日（与请假审批写入每日考勤的口径一致）
 *
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {string[]} 工作日列表
 */
function weekdaysBetween(startDate, endDate) {
  const dates = [];
  const cursor = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  while (cursor <= end) {
    const date = cursor.toISOString().slice(0, 10);
    if (!isWeekendDate(date)) dates.push(date);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

/**
 * 一条已批准请假在统计周期内的天数：整段落在周期内时用申请的天数（可含半天），
 * 跨周期时按周期内的工作日数计
 *
 * @param {{start_date: string, end_date: string, days: number|string}} leave
 * @param {{start: string, end: string}} period
 * @returns {number} 周期内请假天数
 */
function leaveDaysInPeriod(leave, period) {
  const dates = weekdaysBetween(String(leave.start_date), String(leave.end_date));
  const inPeriod = dates.filter((d) => d >= period.start && d <= period.end).length;
  if (dates.length > 0 && inPeriod === dates.length) return Number(leave.days) || 0;
  return inPeriod;
}

const hasPunch = (record) => PUNCH_FIELDS.some((field) => !!record[field]);

/**
 * 从一位员工在周期内的每日考勤与已批准请假中提取报表需要的事实
 *
 * @param {Object[]} records - 每日考勤（date/status/leave_id 与打卡时间字段）
 * @param {Object[]} leaves - 已批准请假
 * @param {{start: string, end: string}} period
 * @returns {{system_leave_days: number, leave_days_without_punch: number,
 *   leave_punch_dates: string[], absent_dates: string[]}}
 */
function summarizeDailyFacts(records, leaves, period) {
  const inPeriod = records.filter((r) => r.date >= period.start && r.date <= period.end);
  const leaveRecords = inPeriod.filter((r) => r.leave_id || r.status === 'leave');
  const leavePunch = leaveRecords.filter(hasPunch);
  return {
    system_leave_days: leaves.reduce((sum, l) => sum + leaveDaysInPeriod(l, period), 0),
    leave_days_without_punch: leaveRecords.length - leavePunch.length,
    leave_punch_dates: leavePunch.map((r) => r.date).sort(),
    absent_dates: inPeriod.filter((r) => r.status === 'absent').map((r) => r.date).sort()
  };
}

/**
 * 把系统请假合并进一行打卡机汇总
 *
 * @param {Object} row - AttendanceSummary 的 JSON
 * @param {Object} facts - summarizeDailyFacts 的结果
 * @returns {Object} 合并后的报表行（保留打卡机原值 machine_*）
 */
function mergeSummaryRow(row, facts) {
  const machineLeave = Number(row.leave_days) || 0;
  const machineAbsent = Number(row.absent_days) || 0;
  // 打卡机已登记的请假不会算进机器旷工，只扣除打卡机不知道的那部分
  const unknownToMachine = Math.max(0, facts.leave_days_without_punch - machineLeave);
  return {
    ...row,
    machine_leave_days: machineLeave,
    machine_absent_days: machineAbsent,
    system_leave_days: facts.system_leave_days,
    leave_days: Math.max(machineLeave, facts.system_leave_days),
    absent_days: Math.max(0, machineAbsent - unknownToMachine),
    leave_punch_dates: facts.leave_punch_dates,
    absent_dates: facts.absent_dates
  };
}

/**
 * 读取报表各行员工在相关周期内的每日考勤与已批准请假
 */
async function loadDailyFacts(rows) {
  if (rows.length === 0) return { records: [], leaves: [] };
  const employeeIds = [...new Set(rows.map((r) => r.employee_id))];
  const start = rows.reduce((min, r) => (r.period_start < min ? r.period_start : min), '9999-12-31');
  const end = rows.reduce((max, r) => (r.period_end > max ? r.period_end : max), '0000-01-01');
  const [records, leaves] = await Promise.all([
    Attendance.findAll({
      where: { employee_id: { [Op.in]: employeeIds }, date: { [Op.between]: [start, end] } },
      attributes: ['employee_id', 'date', 'status', 'leave_id', ...PUNCH_FIELDS],
      raw: true
    }),
    Leave.findAll({
      where: {
        employee_id: { [Op.in]: employeeIds },
        status: 'approved',
        start_date: { [Op.lte]: end },
        end_date: { [Op.gte]: start }
      },
      attributes: ['employee_id', 'start_date', 'end_date', 'days'],
      raw: true
    })
  ]);
  return { records, leaves };
}

function mergeDailyFacts(rows, { records, leaves }) {
  return rows.map((row) => {
    const period = { start: row.period_start, end: row.period_end };
    const facts = summarizeDailyFacts(
      records.filter((r) => r.employee_id === row.employee_id),
      leaves.filter((l) => l.employee_id === row.employee_id
        && String(l.start_date) <= period.end && String(l.end_date) >= period.start),
      period
    );
    return mergeSummaryRow(row, facts);
  });
}

function computeTotals(rows) {
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
    acc.leave_punch_count += r.leave_punch_dates.length;
    if (Number(r.late_count) > 0) acc.late_people.add(r.employee_id);
    if (Number(r.early_leave_count) > 0) acc.early_leave_people.add(r.employee_id);
    if (Number(r.leave_days) > 0) acc.leave_people.add(r.employee_id);
    if (r.absent_dates.length > 0) acc.absent_people.add(r.employee_id);
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
    leave_punch_count: 0,
    late_people: new Set(),
    early_leave_people: new Set(),
    leave_people: new Set(),
    absent_people: new Set()
  });
  const {
    late_people: late, early_leave_people: early, leave_people: leave,
    absent_people: absent, ...sums
  } = totals;
  return {
    ...sums,
    late_people_count: late.size,
    early_leave_people_count: early.size,
    leave_people_count: leave.size,
    absent_people_count: absent.size
  };
}

/**
 * 报表：按周期查询每位员工的统计（考勤报表）
 * @param {Object} options
 * @param {string} [options.period_start]
 * @param {string} [options.period_end]
 * @param {string} [options.department_id]
 * @param {string} [options.keyword]
 */
async function getAttendanceReport({
  period_start, period_end, department_id, keyword
} = {}) {
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
  await applyEmployeeKeyword(include[0], keyword);
  if (include[0].where) include[0].required = true;

  const summaries = await AttendanceSummary.findAll({
    where,
    include,
    order: [['period_start', 'DESC']]
  });

  const baseRows = summaries.map((s) => {
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

  const rows = mergeDailyFacts(baseRows, await loadDailyFacts(baseRows));
  return { rows, totals: computeTotals(rows) };
}

module.exports = {
  getAttendanceReport,
  _internal: {
    weekdaysBetween, leaveDaysInPeriod, summarizeDailyFacts, mergeSummaryRow, computeTotals
  }
};
