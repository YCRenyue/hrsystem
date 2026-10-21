/**
 * Work Schedule
 *
 * 公司作息（《盐城仁越公司管规制度—2026》第二条）：
 *  - 夏令时（5 月 1 日 - 9 月 30 日）：08:00-11:30、14:00-18:30
 *  - 冬令时（10 月 1 日 - 4 月 30 日）：08:00-11:30、13:30-18:00
 *  - 生产部：07:30 上班；夏令时 07:30-11:30、14:00-18:00，冬令时 07:30-11:30、13:30-18:00
 *
 * 据此计算迟到/早退分钟、工作时长和加班时长：
 *  - 迟到：上午晚于上班时间 + 下午上班卡晚于下午上班时间
 *  - 早退：最后一次打卡早于下班时间
 *  - 工作时长：最早、最晚打卡与上午、下午两个时段的重叠时长
 *  - 加班：工作日下班时间之后的时长；周末全部打卡时长（扣除午休）
 */

const { timeToMinutes } = require('./punchRecordParser');

const hm = (hours, minutes = 0) => hours * 60 + minutes;
const segment = (start, end) => ({ start, end });

const SCHEDULES = {
  summer: {
    default: { morning: segment(hm(8), hm(11, 30)), afternoon: segment(hm(14), hm(18, 30)) },
    production: { morning: segment(hm(7, 30), hm(11, 30)), afternoon: segment(hm(14), hm(18)) }
  },
  winter: {
    default: { morning: segment(hm(8), hm(11, 30)), afternoon: segment(hm(13, 30), hm(18)) },
    production: { morning: segment(hm(7, 30), hm(11, 30)), afternoon: segment(hm(13, 30), hm(18)) }
  }
};
const SUMMER_MONTHS = { first: 5, last: 9 };
const PRODUCTION_DEPARTMENT_KEYWORD = '生产';

/**
 * 按日期和部门取作息
 * @param {string} date - YYYY-MM-DD
 * @param {string} [departmentName]
 * @returns {{morning: {start:number,end:number}, afternoon: {start:number,end:number}}}
 */
function resolveSchedule(date, departmentName) {
  const month = Number(date.slice(5, 7));
  const season = month >= SUMMER_MONTHS.first && month <= SUMMER_MONTHS.last
    ? 'summer'
    : 'winter';
  const group = departmentName && departmentName.includes(PRODUCTION_DEPARTMENT_KEYWORD)
    ? 'production'
    : 'default';
  return SCHEDULES[season][group];
}

const overlap = (from, to, seg) => Math.max(0, Math.min(to, seg.end) - Math.max(from, seg.start));
const toHours = (minutes) => Math.round((minutes / 60) * 10) / 10;
const toMinutesOrNull = (time) => (time ? timeToMinutes(time) : null);

/**
 * 迟到、早退分钟数（工作日）
 * @param {Object} slots - assignSlots 的结果
 * @param {Object} schedule - resolveSchedule 的结果
 * @returns {{late_minutes:number, early_leave_minutes:number}}
 */
function computeLateEarly(slots, schedule) {
  const first = toMinutesOrNull(slots.morning_check_in);
  const afternoonIn = toMinutesOrNull(slots.afternoon_check_in);
  const last = toMinutesOrNull(slots.afternoon_check_out);
  const morningLate = first === null ? 0 : Math.max(0, first - schedule.morning.start);
  const afternoonLate = afternoonIn === null
    ? 0
    : Math.max(0, afternoonIn - schedule.afternoon.start);
  return {
    late_minutes: morningLate + afternoonLate,
    early_leave_minutes: last === null ? 0 : Math.max(0, schedule.afternoon.end - last)
  };
}

/**
 * 工作时长与加班时长（小时，保留 1 位小数）；少于两次打卡时记 0
 * @param {Object} slots - assignSlots 的结果
 * @param {Object} schedule - resolveSchedule 的结果
 * @param {boolean} weekend
 * @returns {{work_hours:number, overtime_hours:number}}
 */
function computeHours(slots, schedule, weekend) {
  const first = toMinutesOrNull(slots.morning_check_in);
  const last = toMinutesOrNull(slots.afternoon_check_out);
  if (first === null || last === null) return { work_hours: 0, overtime_hours: 0 };

  if (weekend) {
    const lunch = segment(schedule.morning.end, schedule.afternoon.start);
    return { work_hours: 0, overtime_hours: toHours(last - first - overlap(first, last, lunch)) };
  }
  const workMinutes = overlap(first, last, schedule.morning)
    + overlap(first, last, schedule.afternoon);
  const overtimeMinutes = Math.max(0, last - Math.max(first, schedule.afternoon.end));
  return { work_hours: toHours(workMinutes), overtime_hours: toHours(overtimeMinutes) };
}

module.exports = { resolveSchedule, computeLateEarly, computeHours };
