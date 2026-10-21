/**
 * Attendance Punch Import
 *
 * 根据「刷卡记录」中的原始打卡生成每日考勤：
 *  - 5 分钟内的重复打卡算一次
 *  - 最早一次为上班、最晚一次为下班；11:00-12:30 之间算午休下班，
 *    12:30-14:30 之间算午休上班；其余中间打卡记入备注（额外打卡）
 *  - 工作日只有一次打卡记为缺卡；没有打卡记为缺勤
 *  - 上班时间：生产部 07:30，其他部门 08:00；下班时间统一 17:00
 *  - 工作时长：上下班打卡与上班时段的重叠时长，扣除 12:00-13:00 午休
 *  - 加班时长：工作日 17:00 之后的时长；周末全部打卡时长（扣除午休）都算加班
 *  - 导出当天（制表日期当天及之后）数据不完整，不导入
 *  - 已关联请假/出差的记录只更新打卡时间，不改状态；手工录入的记录不动
 */

const { Attendance } = require('../../models');
const { dedupeTimes, timeToMinutes } = require('./punchRecordParser');

const SOURCE_TAG = 'card_import';
const DUPLICATE_GAP_MINUTES = 5;
const WORK_END = 17 * 60;
const LUNCH_BREAK = { start: 12 * 60, end: 13 * 60 };
const SCHEDULES = {
  default: { workStart: 8 * 60 },
  production: { workStart: 7 * 60 + 30 }
};
const PRODUCTION_DEPARTMENT_KEYWORD = '生产';
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

/**
 * 按部门名称选择作息：生产部 07:30 上班，其余 08:00
 * @param {string} [departmentName]
 * @returns {{workStart: number}}
 */
function scheduleForDepartment(departmentName) {
  return departmentName && departmentName.includes(PRODUCTION_DEPARTMENT_KEYWORD)
    ? SCHEDULES.production
    : SCHEDULES.default;
}

function isWeekend(date) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

/**
 * 根据打卡计算当天状态与迟到/早退分钟数
 */
function deriveStatus(date, slots, schedule = SCHEDULES.default) {
  const result = { status: 'normal', late_minutes: 0, early_leave_minutes: 0 };
  if (isWeekend(date)) return { ...result, status: 'weekend' };
  if (slots.count === 0) return { ...result, status: 'absent' };

  if (slots.morning_check_in) {
    result.late_minutes = Math.max(0, timeToMinutes(slots.morning_check_in) - schedule.workStart);
  }
  if (slots.afternoon_check_out) {
    result.early_leave_minutes = Math.max(
      0,
      WORK_END - timeToMinutes(slots.afternoon_check_out)
    );
  }
  if (slots.count === 1) result.status = 'missing_punch';
  else if (result.late_minutes > 0) result.status = 'late';
  else if (result.early_leave_minutes > 0) result.status = 'early_leave';
  return result;
}

const overlapMinutes = (from, to, rangeStart, rangeEnd) => Math.max(
  0,
  Math.min(to, rangeEnd) - Math.max(from, rangeStart)
);

/** 区间内扣除午休后的分钟数 */
const minutesExcludingLunch = (from, to) => Math.max(0, to - from)
  - overlapMinutes(from, to, LUNCH_BREAK.start, LUNCH_BREAK.end);

const toHours = (minutes) => Math.round((minutes / 60) * 10) / 10;

/**
 * 根据最早、最晚打卡计算工作时长和加班时长（小时，保留 1 位小数）
 * 只有一次打卡或没有打卡时无法计算，记为 0
 */
function computeHours(date, slots, schedule = SCHEDULES.default) {
  if (!slots.morning_check_in || !slots.afternoon_check_out) {
    return { work_hours: 0, overtime_hours: 0 };
  }
  const first = timeToMinutes(slots.morning_check_in);
  const last = timeToMinutes(slots.afternoon_check_out);
  if (isWeekend(date)) {
    return { work_hours: 0, overtime_hours: toHours(minutesExcludingLunch(first, last)) };
  }
  const workFrom = Math.max(first, schedule.workStart);
  const workTo = Math.min(last, WORK_END);
  return {
    work_hours: toHours(minutesExcludingLunch(workFrom, workTo)),
    overtime_hours: toHours(Math.max(0, last - Math.max(first, WORK_END)))
  };
}

const toDbTime = (t) => (t ? `${t}:00` : null);

/**
 * 生成一天的考勤数据
 */
function buildDailyRecord(date, times, schedule = SCHEDULES.default) {
  const slots = assignSlots(times);
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
    hours: computeHours(date, slots, schedule),
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

const isProtected = (record) => !!record.leave_id || !!record.business_trip_id
  || PROTECTED_STATUSES.includes(record.status);

/**
 * 写入一位员工的每日考勤
 * @param {Object} employee - 含 employee_id 与 department（name）
 * @returns {Promise<{created:number, updated:number, manual_kept:number}>}
 */
async function upsertEmployeeAttendances(employee, entry, dates, transaction) {
  const employeeId = employee.employee_id;
  const schedule = scheduleForDepartment(employee.department && employee.department.name);
  const stats = { created: 0, updated: 0, manual_kept: 0 };
  for (const date of dates) {
    const daily = buildDailyRecord(date, entry.days[date] || [], schedule);
    const existing = await Attendance.findOne({
      where: { employee_id: employeeId, date },
      transaction
    });
    if (!existing) {
      await Attendance.create({
        employee_id: employeeId,
        date,
        ...daily.punches,
        ...daily.derived,
        ...daily.hours,
        notes: daily.notes,
        source: SOURCE_TAG
      }, { transaction });
      stats.created += 1;
    } else if (isProtected(existing)) {
      await existing.update(daily.punches, { transaction });
      stats.updated += 1;
    } else if (existing.source === SOURCE_TAG) {
      await existing.update({
        ...daily.punches, ...daily.derived, ...daily.hours, notes: daily.notes
      }, { transaction });
      stats.updated += 1;
    } else {
      stats.manual_kept += 1;
    }
  }
  return stats;
}

module.exports = {
  upsertEmployeeAttendances,
  selectImportDates,
  isWeekend,
  _internal: {
    assignSlots, deriveStatus, buildDailyRecord, computeHours, scheduleForDepartment
  }
};
