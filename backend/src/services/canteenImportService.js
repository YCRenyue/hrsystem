/**
 * Canteen Service
 *
 * 食堂用餐资格判断与食堂报表。导入逻辑见 ./punch/canteenPunchImport.js
 * （解析打卡机导出文件的「刷卡记录」表）。
 */

const { Op } = require('sequelize');
const { CanteenMeal, Leave, BusinessTrip } = require('../models');
const { importCanteenPunches } = require('./punch/canteenPunchImport');

/**
 * 判断某员工某天是否可以记食堂用餐（非周末、未请假、未出差）
 * @param {string} employeeId
 * @param {string} date - YYYY-MM-DD
 * @returns {Promise<boolean>}
 */
async function isMealEligible(employeeId, date) {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (weekday === 0 || weekday === 6) return false;
  const [leaveCount, tripCount] = await Promise.all([
    Leave.count({
      where: {
        employee_id: employeeId,
        status: 'approved',
        start_date: { [Op.lte]: date },
        end_date: { [Op.gte]: date }
      }
    }),
    BusinessTrip.count({
      where: {
        employee_id: employeeId,
        status: { [Op.in]: ['approved', 'in_progress', 'completed'] },
        start_datetime: { [Op.lte]: new Date(`${date}T23:59:59`) },
        end_datetime: { [Op.gte]: new Date(`${date}T00:00:00`) }
      }
    })
  ]);
  return leaveCount === 0 && tripCount === 0;
}

/**
 * 食堂报表：按日期区间聚合
 *
 * 返回：
 *   - daily: 每日中餐/晚餐人数
 *   - weekly: 每周(ISO周起始为周一)中餐/晚餐人次
 *   - perEmployee: 每位员工的中餐/晚餐次数
 *   - totals: 全局总计
 */
async function getCanteenReport({ start_date, end_date, department_id } = {}) {
  const where = {};
  if (start_date && end_date) {
    where.meal_date = { [Op.between]: [start_date, end_date] };
  } else if (start_date) {
    where.meal_date = { [Op.gte]: start_date };
  } else if (end_date) {
    where.meal_date = { [Op.lte]: end_date };
  }

  const include = [{
    association: 'employee',
    attributes: ['employee_id', 'employee_number', 'name_encrypted', 'department_id'],
    include: [{ association: 'department', attributes: ['department_id', 'name'] }]
  }];

  if (department_id) {
    include[0].where = { department_id };
    include[0].required = true;
  }

  const meals = await CanteenMeal.findAll({
    where,
    include,
    order: [['meal_date', 'ASC']]
  });

  const dailyMap = new Map(); // date -> { lunch, dinner }
  const weeklyMap = new Map(); // weekKey -> { lunch, dinner, weekStart, weekEnd }
  const perEmpMap = new Map(); // employeeId -> { employee, lunch, dinner }
  let totalLunch = 0;
  let totalDinner = 0;

  const getMondayOfWeek = (dateStr) => {
    const d = new Date(`${dateStr}T00:00:00`);
    const day = d.getDay(); // 0 Sun ... 6 Sat
    const diff = (day === 0 ? -6 : 1 - day);
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  };
  const addDays = (dateStr, n) => {
    const d = new Date(`${dateStr}T00:00:00`);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };

  meals.forEach((m) => {
    const date = typeof m.meal_date === 'string'
      ? m.meal_date
      : new Date(m.meal_date).toISOString().slice(0, 10);
    const type = m.meal_type;

    // daily
    if (!dailyMap.has(date)) dailyMap.set(date, { date, lunch: 0, dinner: 0 });
    const dayBucket = dailyMap.get(date);
    if (type === 'lunch') { dayBucket.lunch += 1; totalLunch += 1; }
    if (type === 'dinner') { dayBucket.dinner += 1; totalDinner += 1; }

    // weekly
    const weekStart = getMondayOfWeek(date);
    const weekEnd = addDays(weekStart, 6);
    const weekKey = weekStart;
    if (!weeklyMap.has(weekKey)) {
      weeklyMap.set(weekKey, {
        week_start: weekStart, week_end: weekEnd, lunch: 0, dinner: 0
      });
    }
    const weekBucket = weeklyMap.get(weekKey);
    if (type === 'lunch') weekBucket.lunch += 1;
    if (type === 'dinner') weekBucket.dinner += 1;

    // per employee
    const eid = m.employee_id;
    if (!perEmpMap.has(eid)) {
      const emp = m.employee;
      const name = emp && typeof emp.getName === 'function' ? emp.getName() : null;
      perEmpMap.set(eid, {
        employee_id: eid,
        employee_number: emp?.employee_number || null,
        name,
        department_name: emp?.department?.name || null,
        lunch: 0,
        dinner: 0,
        total: 0
      });
    }
    const bucket = perEmpMap.get(eid);
    if (type === 'lunch') bucket.lunch += 1;
    if (type === 'dinner') bucket.dinner += 1;
    bucket.total += 1;
  });

  const daily = Array.from(dailyMap.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
  const weekly = Array.from(weeklyMap.values()).sort((a, b) => (a.week_start < b.week_start ? -1 : 1));
  const perEmployee = Array.from(perEmpMap.values()).sort((a, b) => b.total - a.total);

  return {
    daily,
    weekly,
    per_employee: perEmployee,
    totals: {
      total_lunch: totalLunch,
      total_dinner: totalDinner,
      total_meals: totalLunch + totalDinner,
      unique_employees: perEmpMap.size,
      days_covered: dailyMap.size
    }
  };
}

/**
 * 某位员工在某个周期内的详细用餐记录（按日）
 */
async function getEmployeeMealDetail({ employee_id, start_date, end_date } = {}) {
  if (!employee_id) throw new Error('employee_id 为必填项');

  const where = { employee_id };
  if (start_date && end_date) {
    where.meal_date = { [Op.between]: [start_date, end_date] };
  } else if (start_date) {
    where.meal_date = { [Op.gte]: start_date };
  } else if (end_date) {
    where.meal_date = { [Op.lte]: end_date };
  }

  const meals = await CanteenMeal.findAll({
    where,
    order: [['meal_date', 'ASC'], ['meal_type', 'ASC']]
  });

  // 把单行化为按日 + {lunch_time, dinner_time}
  const byDate = new Map();
  meals.forEach((m) => {
    const date = typeof m.meal_date === 'string'
      ? m.meal_date
      : new Date(m.meal_date).toISOString().slice(0, 10);
    if (!byDate.has(date)) {
      byDate.set(date, {
        date, lunch_time: null, dinner_time: null, breakfast_time: null
      });
    }
    const b = byDate.get(date);
    if (m.meal_type === 'lunch') b.lunch_time = m.meal_time;
    if (m.meal_type === 'dinner') b.dinner_time = m.meal_time;
    if (m.meal_type === 'breakfast') b.breakfast_time = m.meal_time;
  });

  const rows = Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
  const lunchCount = rows.filter((r) => !!r.lunch_time).length;
  const dinnerCount = rows.filter((r) => !!r.dinner_time).length;

  return {
    rows,
    totals: {
      lunch_count: lunchCount,
      dinner_count: dinnerCount,
      total_meals: lunchCount + dinnerCount,
      days_covered: rows.length
    }
  };
}

module.exports = {
  importCardWorkbook: importCanteenPunches,
  getCanteenReport,
  getEmployeeMealDetail,
  isMealEligible
};
