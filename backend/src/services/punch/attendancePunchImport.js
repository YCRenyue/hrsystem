/**
 * Attendance Punch Import
 *
 * 根据「刷卡记录」中的原始打卡生成每日考勤：
 *  - 5 分钟内的重复打卡算一次
 *  - 最早一次为上班、最晚一次为下班；11:00-12:30 之间算午休下班，
 *    12:30-14:30 之间算午休上班；其余中间打卡记入备注（额外打卡）
 *  - 工作日只有一次打卡记为缺卡；没有打卡记为缺勤
 *  - 迟到/早退、工作时长、加班时长按公司冬夏令时作息计算（见 ./workSchedule.js）
 *  - 导出当天（制表日期当天及之后）数据不完整，不导入
 *  - 已关联请假/出差的记录只更新打卡时间，不改状态；手工录入的记录不动
 */

const { Attendance } = require('../../models');
const { dedupeTimes, timeToMinutes } = require('./punchRecordParser');
const { resolveSchedule, computeLateEarly, computeHours } = require('./workSchedule');

const SOURCE_TAG = 'card_import';
const DUPLICATE_GAP_MINUTES = 5;
const NOON = 12 * 60;
const LUNCH_OUT_WINDOW = { start: 11 * 60, end: 12 * 60 + 30 };
const LUNCH_IN_WINDOW = { start: 12 * 60 + 30, end: 14 * 60 + 30 };
const PROTECTED_STATUSES = ['leave', 'business_trip'];

const inWindow = (time, w) => {
  const m = timeToMinutes(time);
  return m >= w.start && m < w.end;
};

/**
 * 把一天的打卡分配到上下班各时段
 * @param {string[]} rawTimes - 升序时间
 * @returns {{morning_check_in, morning_check_out, afternoon_check_in,
 *   afternoon_check_out, extras: string[], count: number}}
 */
function assignSlots(rawTimes) {
  const times = dedupeTimes(rawTimes, DUPLICATE_GAP_MINUTES);
  const slots = {
    morning_check_in: null,
    morning_check_out: null,
    afternoon_check_in: null,
    afternoon_check_out: null,
    extras: [],
    count: times.length
  };
  if (times.length === 1) {
    const [only] = times;
    const key = timeToMinutes(only) < NOON ? 'morning_check_in' : 'afternoon_check_out';
    slots[key] = only;
    return slots;
  }
  if (times.length === 0) return slots;

  [slots.morning_check_in] = times;
  slots.afternoon_check_out = times[times.length - 1];
  times.slice(1, -1).forEach((t) => {
    if (!slots.morning_check_out && inWindow(t, LUNCH_OUT_WINDOW)) {
      slots.morning_check_out = t;
    } else if (!slots.afternoon_check_in && inWindow(t, LUNCH_IN_WINDOW)) {
      slots.afternoon_check_in = t;
    } else {
      slots.extras.push(t);
    }
  });
  return slots;
}

function isWeekend(date) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

/**
 * 根据打卡计算当天状态与迟到/早退分钟数
 */
function deriveStatus(date, slots, schedule) {
  const result = { status: 'normal', late_minutes: 0, early_leave_minutes: 0 };
  if (isWeekend(date)) return { ...result, status: 'weekend' };
  if (slots.count === 0) return { ...result, status: 'absent' };

  Object.assign(result, computeLateEarly(slots, schedule));
  if (slots.count === 1) result.status = 'missing_punch';
  else if (result.late_minutes > 0) result.status = 'late';
  else if (result.early_leave_minutes > 0) result.status = 'early_leave';
  return result;
}

const toDbTime = (t) => (t ? `${t}:00` : null);

/**
 * 生成一天的考勤数据
 */
function buildDailyRecord(date, times, departmentName) {
  const slots = assignSlots(times);
  const schedule = resolveSchedule(date, departmentName);
  const derived = deriveStatus(date, slots, schedule);
  return {
    date,
    punches: {
      check_in_time: toDbTime(slots.morning_check_in),
      check_out_time: toDbTime(slots.afternoon_check_out),
      morning_check_in: toDbTime(slots.morning_check_in),
      morning_check_out: toDbTime(slots.morning_check_out),
      afternoon_check_in: toDbTime(slots.afternoon_check_in),
      afternoon_check_out: toDbTime(slots.afternoon_check_out),
      overtime_check_in: null,
      overtime_check_out: null
    },
    derived,
    hours: computeHours(slots, schedule, isWeekend(date)),
    notes: slots.extras.length > 0 ? `额外打卡: ${slots.extras.join(', ')}` : null
  };
}

/**
 * 计算需要导入的日期：周期内、早于导出日期
 * @returns {{dates: string[], skipped: string[]}}
 */
function selectImportDates(allDates, exportDate) {
  if (!exportDate) return { dates: allDates, skipped: [] };
  return {
    dates: allDates.filter((d) => d < exportDate),
    skipped: allDates.filter((d) => d >= exportDate)
  };
}

const isLeave = (record) => !!record.leave_id || record.status === 'leave';

const isProtected = (record) => !!record.leave_id || !!record.business_trip_id
  || PROTECTED_STATUSES.includes(record.status);

/**
 * 写入一天的考勤，返回处理方式：created / updated / leave / protected / manual
 * 请假、出差的记录受保护，只补打卡时间；手工录入的记录保持不变
 */
async function writeDailyRecord(employeeId, daily, transaction) {
  const existing = await Attendance.findOne({
    where: { employee_id: employeeId, date: daily.date },
    transaction
  });
  if (!existing) {
    await Attendance.create({
      employee_id: employeeId,
      date: daily.date,
      ...daily.punches,
      ...daily.derived,
      ...daily.hours,
      notes: daily.notes,
      source: SOURCE_TAG
    }, { transaction });
    return 'created';
  }
  if (isProtected(existing)) {
    await existing.update(daily.punches, { transaction });
    return isLeave(existing) ? 'leave' : 'protected';
  }
  if (existing.source !== SOURCE_TAG) return 'manual';
  await existing.update({
    ...daily.punches, ...daily.derived, ...daily.hours, notes: daily.notes
  }, { transaction });
  return 'updated';
}

/**
 * 写入一位员工的每日考勤
 * @param {Object} employee - 含 employee_id 与 department（name）
 * @returns {Promise<{created:number, updated:number, manual_kept:number,
 *   leave_punch_dates:string[], absent_dates:string[]}>} 另含两类需提醒 HR 的日期：
 *   已请假但当天有打卡、未请假且工作日没有打卡（旷工）
 */
async function upsertEmployeeAttendances(employee, entry, dates, transaction) {
  const employeeId = employee.employee_id;
  const departmentName = employee.department && employee.department.name;
  const stats = {
    created: 0, updated: 0, manual_kept: 0, leave_punch_dates: [], absent_dates: []
  };
  for (const date of dates) {
    const daily = buildDailyRecord(date, entry.days[date] || [], departmentName);
    // eslint-disable-next-line no-await-in-loop -- queries share one transaction connection and must run in order
    const outcome = await writeDailyRecord(employeeId, daily, transaction);
    if (outcome === 'manual') stats.manual_kept += 1;
    else stats[outcome === 'created' ? 'created' : 'updated'] += 1;
    if (outcome === 'leave' && (entry.days[date] || []).length > 0) {
      stats.leave_punch_dates.push(date);
    }
    const derivedWritten = outcome === 'created' || outcome === 'updated';
    if (derivedWritten && daily.derived.status === 'absent') stats.absent_dates.push(date);
  }
  return stats;
}

module.exports = {
  upsertEmployeeAttendances,
  selectImportDates,
  isWeekend,
  buildDailyRecord,
  _internal: { assignSlots, deriveStatus, buildDailyRecord }
};
