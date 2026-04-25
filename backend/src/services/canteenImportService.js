/**
 * Canteen Import Service
 *
 * 解析「食堂刷卡表」Excel，写入 canteen_meal 表（按日/按餐）。
 *
 * 文件结构与考勤卡表一致（共用布局），但语义不同：打卡 = 在食堂消费一餐。
 *  - 每张工作表（1.2.3 / 4.5.6 / ...）横排 3 位员工，块基址 0 / 15 / 30
 *  - 姓名: row 2, col base+9；工号: row 3, col base+9
 *  - 日期范围: row 1, col 3（例 "2026/02/01 ~ 02/28"）
 *  - 每日数据起始 row 11，逐行列出：
 *      col base+0  : 日期标签
 *      col base+1  : 午餐打卡（11-12 点）
 *      col base+3  : 午餐第二次打卡（若有）
 *      col base+6  : 晚餐打卡（17-18 点）
 *      col base+8  : 晚餐第二次打卡（若有）
 *  - 时段单元格为 "旷工" 表示未到食堂，为空表示无记录，为 HH:MM 表示实际打卡
 */

const XLSX = require('xlsx');
const { Op } = require('sequelize');
const {
  Employee, CanteenMeal, sequelize
} = require('../models');

const BLOCK_BASES = [0, 15, 30];
const DAILY_ROW_START = 11;

// 午餐时段列偏移
const LUNCH_COLS = [1, 3];
// 晚餐时段列偏移
const DINNER_COLS = [6, 8];

function toText(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return '';
  return String(value).trim();
}

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

function readWorkbook(buffer) {
  return XLSX.read(buffer, { type: 'buffer', cellDates: true });
}

function isCardSheetName(name) {
  return /^\d+(?:\.\d+)*$/.test(name);
}

function sheetToMatrix(sheet) {
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
}

/**
 * 从一行数据中，对一组列偏移（午餐或晚餐）求出最早的打卡时间
 * 返回 null 表示该餐未打卡
 */
function pickMealTime(row, base, cols) {
  for (const off of cols) {
    const time = parseTime(row[base + off]);
    if (time) return time;
  }
  return null;
}

/**
 * 从一张食堂卡表中解出 3 位员工的记录
 */
function extractEmployeesFromCardSheet(matrix) {
  if (!matrix || matrix.length < DAILY_ROW_START) return [];

  const periodText = toText(matrix[1] && matrix[1][3]);
  const period = parsePeriod(periodText);
  if (!period) return [];

  const nameRow = matrix[2] || [];
  const idRow = matrix[3] || [];

  const employees = [];

  BLOCK_BASES.forEach((base) => {
    const name = toText(nameRow[base + 9]);
    if (!name) return;

    const externalId = toText(idRow[base + 9]);
    const daily = [];

    for (let r = DAILY_ROW_START; r < matrix.length; r += 1) {
      const row = matrix[r] || [];
      const dayInfo = parseDayCell(row[base + 0]);
      if (!dayInfo) break;

      const lunchTime = pickMealTime(row, base, LUNCH_COLS);
      const dinnerTime = pickMealTime(row, base, DINNER_COLS);

      daily.push({
        day: dayInfo.day,
        weekday: dayInfo.weekday,
        lunch_time: lunchTime,
        dinner_time: dinnerTime
      });
    }

    employees.push({
      name, externalId, period, daily
    });
  });

  return employees;
}

/**
 * 用解密姓名建立 Employee 索引
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
 * Upsert 一位员工在一个周期内的所有用餐记录
 * @returns {{ created, updated }}
 */
async function upsertDailyMeals({
  employeeId, period, daily, sourceTag, transaction
}) {
  const { year, month } = period;
  const pad = (n) => String(n).padStart(2, '0');

  let created = 0;
  let updated = 0;

  for (const entry of daily) {
    const date = `${year}-${pad(month)}-${pad(entry.day)}`;

    const meals = [
      { type: 'lunch', time: entry.lunch_time },
      { type: 'dinner', time: entry.dinner_time }
    ].filter((m) => !!m.time);

    for (const meal of meals) {
      const data = {
        employee_id: employeeId,
        meal_date: date,
        meal_type: meal.type,
        meal_time: meal.time,
        location_type: 'canteen',
        amount: 0,
        subsidy_amount: 0,
        payment_method: 'subsidy',
        is_subsidized: true,
        source: sourceTag
      };

      const existing = await CanteenMeal.findOne({
        where: {
          employee_id: employeeId,
          meal_date: date,
          meal_type: meal.type
        },
        transaction
      });

      if (existing) {
        await existing.update(data, { transaction });
        updated += 1;
      } else {
        await CanteenMeal.create(data, { transaction });
        created += 1;
      }
    }
  }

  return { created, updated };
}

/**
 * 主入口：导入食堂刷卡表
 */
async function importCardWorkbook(buffer, sourceFile = null) {
  const workbook = readWorkbook(buffer);
  const cardSheets = workbook.SheetNames.filter(isCardSheetName);

  if (cardSheets.length === 0) {
    throw new Error('未在该文件中找到形如 "1.2.3" 的食堂卡表工作表');
  }

  const { index: employeeByName, ambiguous } = await buildEmployeeNameIndex();

  const result = {
    sheets_processed: cardSheets.length,
    employees_total: 0,
    matched: 0,
    unmatched: [],
    ambiguous: [],
    meals_created: 0,
    meals_updated: 0,
    periods: new Set(),
    source_file: sourceFile
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

        const { created, updated } = await upsertDailyMeals({
          employeeId: emp.employee_id,
          period: item.period,
          daily: item.daily,
          sourceTag: 'card_import',
          transaction
        });
        result.meals_created += created;
        result.meals_updated += updated;
      }
    }
  });

  return {
    ...result,
    periods: Array.from(result.periods)
  };
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
  importCardWorkbook,
  getCanteenReport,
  getEmployeeMealDetail,
  _internal: {
    parsePeriod,
    parseTime,
    parseDayCell,
    extractEmployeesFromCardSheet,
    sheetToMatrix
  }
};
