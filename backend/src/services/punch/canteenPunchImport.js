/**
 * Canteen Punch Import
 *
 * 从食堂打卡机导出文件的「刷卡记录」表导入用餐记录：
 *  - 10:00-14:00 的刷卡算午餐，15:30-19:30 的刷卡算晚餐
 *  - 同一餐多次刷卡只算一次，记录最早时间
 *  - 不在饭点的刷卡、非工作日刷卡、请假/出差期间的刷卡不计入用餐，
 *    记为待复核异常，由 HR 决定计为午餐/晚餐或忽略
 *  - 重新导入时覆盖本来源的记录，手工录入的记录保持不变
 */

const { Op } = require('sequelize');
const {
  CanteenMeal, Leave, BusinessTrip, PunchAnomaly, sequelize
} = require('../../models');
const { parsePunchWorkbook, timeToMinutes } = require('./punchRecordParser');
const { matchEmployees, findPunchesAfterLeave } = require('./employeeMatcher');
const { formatLocalDate } = require('../../utils/dateUtils');

const SOURCE_TAG = 'card_import';
const DEVICE = 'canteen';
const MEAL_WINDOWS = {
  lunch: { start: 10 * 60, end: 14 * 60 },
  dinner: { start: 15 * 60 + 30, end: 19 * 60 + 30 }
};
const ANOMALY_SAMPLE_LIMIT = 100;

/**
 * 判断一次刷卡属于哪一餐，不在饭点返回 null
 * @param {string} time - "HH:MM"
 * @returns {'lunch'|'dinner'|null}
 */
function classifyMealTime(time) {
  const minutes = timeToMinutes(time);
  const hit = Object.entries(MEAL_WINDOWS)
    .find(([, w]) => minutes >= w.start && minutes < w.end);
  return hit ? hit[0] : null;
}

/**
 * 把一天的刷卡分为午餐/晚餐/异常
 * @param {string[]} times - 升序时间
 * @returns {{meals: Object<string,string>, outside: string[], merged: number}}
 */
function splitDayPunches(times) {
  const meals = {};
  const outside = [];
  let merged = 0;
  times.forEach((t) => {
    const type = classifyMealTime(t);
    if (!type) outside.push(t);
    else if (meals[type]) merged += 1;
    else meals[type] = t;
  });
  return { meals, outside, merged };
}

function isWeekend(date) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

/**
 * 读取员工在周期内已批准的请假/出差，返回判断函数
 */
async function loadAbsenceChecker(employeeId, period, transaction) {
  const [leaves, trips] = await Promise.all([
    Leave.findAll({
      where: {
        employee_id: employeeId,
        status: 'approved',
        start_date: { [Op.lte]: period.end },
        end_date: { [Op.gte]: period.start }
      },
      transaction
    }),
    BusinessTrip.findAll({
      where: {
        employee_id: employeeId,
        status: { [Op.in]: ['approved', 'in_progress', 'completed'] },
        start_datetime: { [Op.lte]: new Date(`${period.end}T23:59:59`) },
        end_datetime: { [Op.gte]: new Date(`${period.start}T00:00:00`) }
      },
      transaction
    })
  ]);
  return (date) => leaves.some((l) => l.start_date <= date && l.end_date >= date)
    || trips.some((t) => {
      const start = formatLocalDate(new Date(t.start_datetime));
      const end = formatLocalDate(new Date(t.end_datetime));
      return start <= date && end >= date;
    });
}

/**
 * 把一位员工的刷卡整理为用餐记录与异常
 * @returns {{meals: Array, anomalies: Array, merged: number}}
 */
function planEmployeeMeals(entry, isOnLeaveOrTrip) {
  const meals = [];
  const anomalies = [];
  let merged = 0;
  Object.entries(entry.days).forEach(([date, times]) => {
    const day = splitDayPunches(times);
    merged += day.merged;
    day.outside.forEach((t) => anomalies.push({ date, time: t, reason: 'outside_meal_window' }));
    let blockReason = null;
    if (isWeekend(date)) blockReason = 'non_workday';
    else if (isOnLeaveOrTrip(date)) blockReason = 'on_leave_or_trip';
    Object.entries(day.meals).forEach(([type, time]) => {
      if (blockReason) anomalies.push({ date, time, reason: blockReason });
      else meals.push({ date, type, time });
    });
  });
  return { meals, anomalies, merged };
}

/**
 * 写入用餐记录：覆盖导入来源的记录，保留手工记录，删除本周期已不存在的导入记录
 */
async function writeMeals(employeeId, period, meals, transaction) {
  const existing = await CanteenMeal.findAll({
    where: { employee_id: employeeId, meal_date: { [Op.between]: [period.start, period.end] } },
    transaction
  });
  const existingByKey = new Map(existing.map((m) => [`${m.meal_date}|${m.meal_type}`, m]));
  const stats = {
    created: 0, updated: 0, removed: 0, manual_kept: 0
  };
  const wanted = new Set();

  for (const meal of meals) {
    const key = `${meal.date}|${meal.type}`;
    wanted.add(key);
    const record = existingByKey.get(key);
    if (record && record.source !== SOURCE_TAG) {
      stats.manual_kept += 1;
    } else if (record) {
      await record.update({ meal_time: meal.time }, { transaction });
      stats.updated += 1;
    } else {
      await CanteenMeal.create({
        employee_id: employeeId,
        meal_date: meal.date,
        meal_type: meal.type,
        meal_time: meal.time,
        location_type: 'canteen',
        payment_method: 'subsidy',
        is_subsidized: true,
        source: SOURCE_TAG
      }, { transaction });
      stats.created += 1;
    }
  }

  for (const record of existing) {
    const key = `${record.meal_date}|${record.meal_type}`;
    if (record.source === SOURCE_TAG && !wanted.has(key)) {
      await record.destroy({ transaction });
      stats.removed += 1;
    }
  }
  return stats;
}

/**
 * 重写员工在本周期的待复核异常；已处理过的异常不再重复生成
 */
async function writeAnomalies({
  employeeId, externalId, period, anomalies
}, transaction) {
  const dateRange = { [Op.between]: [period.start, period.end] };
  await PunchAnomaly.destroy({
    where: {
      device_type: DEVICE, employee_id: employeeId, status: 'pending', punch_date: dateRange
    },
    transaction
  });
  const resolved = await PunchAnomaly.findAll({
    where: { device_type: DEVICE, employee_id: employeeId, punch_date: dateRange },
    attributes: ['punch_date', 'punch_time'],
    transaction
  });
  const resolvedKeys = new Set(resolved.map((a) => `${a.punch_date}|${a.punch_time}`));
  const fresh = anomalies.filter((a) => !resolvedKeys.has(`${a.date}|${a.time}`));
  if (fresh.length === 0) return 0;
  await PunchAnomaly.bulkCreate(fresh.map((a) => ({
    device_type: DEVICE,
    employee_id: employeeId,
    external_id: externalId || null,
    punch_date: a.date,
    punch_time: a.time,
    reason: a.reason
  })), { transaction });
  return fresh.length;
}

function createResult(parsed, sourceFile) {
  return {
    source_file: sourceFile,
    period: `${parsed.period.start}~${parsed.period.end}`,
    employees_total: parsed.employees.length,
    matched: 0,
    unmatched: [],
    ambiguous: [],
    meals_created: 0,
    meals_updated: 0,
    meals_removed: 0,
    manual_kept: 0,
    duplicates_merged: 0,
    anomalies_count: 0,
    anomalies: [],
    punches_after_leave: []
  };
}

/**
 * 主入口：导入食堂打卡机导出文件
 * @param {Buffer} buffer
 * @param {string} [sourceFile]
 * @returns {Promise<Object>} 导入结果
 */
async function importCanteenPunches(buffer, sourceFile = null) {
  const parsed = parsePunchWorkbook(buffer);
  const { matched, unmatched, ambiguous } = await matchEmployees(parsed.employees, DEVICE);
  const result = createResult(parsed, sourceFile);
  Object.assign(result, {
    matched: matched.length,
    unmatched,
    ambiguous,
    punches_after_leave: findPunchesAfterLeave(matched)
  });

  await sequelize.transaction(async (transaction) => {
    for (const { entry, employee } of matched) {
      const empId = employee.employee_id;
      const isAway = await loadAbsenceChecker(empId, parsed.period, transaction);
      const plan = planEmployeeMeals(entry, isAway);
      const stats = await writeMeals(empId, parsed.period, plan.meals, transaction);
      result.meals_created += stats.created;
      result.meals_updated += stats.updated;
      result.meals_removed += stats.removed;
      result.manual_kept += stats.manual_kept;
      result.duplicates_merged += plan.merged;
      const written = await writeAnomalies({
        employeeId: empId,
        externalId: entry.externalId,
        period: parsed.period,
        anomalies: plan.anomalies
      }, transaction);
      result.anomalies_count += written;
      plan.anomalies.forEach((a) => {
        if (result.anomalies.length < ANOMALY_SAMPLE_LIMIT) {
          result.anomalies.push({ name: entry.name, external_id: entry.externalId, ...a });
        }
      });
    }
  });

  return result;
}

module.exports = {
  importCanteenPunches,
  _internal: { classifyMealTime, splitDayPunches, planEmployeeMeals }
};
