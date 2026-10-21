/**
 * Punch Record Parser
 *
 * 解析打卡机导出文件中的「刷卡记录」工作表（考勤与食堂共用）。
 * 该表每人一行，每天一列，单元格内是当天全部原始打卡时间（换行分隔），
 * 比「考勤卡表」更可靠：卡表会按排班重新分列，未排班日只保留首尾两次，
 * 22:00 之后及半夜的打卡也会被丢弃。
 *
 * 表结构（0 基索引）：
 *   row 1 : "考勤日期 :" 后为周期，如 "2026/02/01 ~ 02/28\t( 仁越饭堂 )"；
 *           "制表时间 :" 后为导出日期，如 "2026/03/01"
 *   row 2 : col 0 工号，col 1 姓名，col 2 部门，col 3+ 为日期序号（1、2、3 ...）
 *   row 3 : 星期
 *   row 4+: 每位员工一行
 */

const XLSX = require('xlsx');

const RAW_SHEET_NAME = '刷卡记录';
const HEADER_ROW = 2;
const FIRST_DATA_ROW = 4;
const FIRST_DAY_COL = 3;

const pad = (n) => String(n).padStart(2, '0');

function toText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

/**
 * 解析周期字符串，如 "2026/03/01 ~ 03/23"
 * @param {string} text
 * @returns {{year:number, month:number, start:string, end:string}|null}
 */
function parsePeriod(text) {
  const parts = toText(text).split('~').map((s) => s.trim());
  if (parts.length !== 2) return null;
  const startMatch = parts[0].match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  const endMatch = parts[1].match(/^(?:(\d{4})[/-])?(\d{1,2})[/-](\d{1,2})/);
  if (!startMatch || !endMatch) return null;
  const year = parseInt(startMatch[1], 10);
  const month = parseInt(startMatch[2], 10);
  const endYear = endMatch[1] ? parseInt(endMatch[1], 10) : year;
  return {
    year,
    month,
    start: `${year}-${pad(month)}-${pad(parseInt(startMatch[3], 10))}`,
    end: `${endYear}-${pad(parseInt(endMatch[2], 10))}-${pad(parseInt(endMatch[3], 10))}`
  };
}

/**
 * 解析日期字符串 "2026/03/01" -> "2026-03-01"
 */
function parseDate(text) {
  const match = toText(text).match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (!match) return null;
  return `${match[1]}-${pad(parseInt(match[2], 10))}-${pad(parseInt(match[3], 10))}`;
}

/**
 * 规范化单个时间 "8:5" -> "08:05"，非法返回 null
 */
function normalizeTime(text) {
  const match = toText(text).match(/^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h > 23 || m > 59) return null;
  return `${pad(h)}:${pad(m)}`;
}

/**
 * 解析单元格内的多次打卡，返回升序的 "HH:MM" 列表
 */
function parsePunchCell(value) {
  return toText(value)
    .split(/[\r\n]+/)
    .map(normalizeTime)
    .filter(Boolean)
    .sort();
}

function timeToMinutes(time) {
  const [h, m] = time.split(':').map((n) => parseInt(n, 10));
  return h * 60 + m;
}

/**
 * 合并间隔不超过 gapMinutes 的连续打卡（保留每组最早一次）
 * @param {string[]} times - 升序时间
 * @param {number} gapMinutes
 * @returns {string[]}
 */
function dedupeTimes(times, gapMinutes) {
  const result = [];
  let lastKept = null;
  times.forEach((t) => {
    const minutes = timeToMinutes(t);
    if (lastKept !== null && minutes - lastKept <= gapMinutes) return;
    result.push(t);
    lastKept = minutes;
  });
  return result;
}

/**
 * 在第 1 行中查找某标签后面的第一个非空值
 */
function findValueAfterLabel(row, label) {
  const idx = row.findIndex((cell) => toText(cell).replace(/\s/g, '').startsWith(label));
  if (idx < 0) return '';
  const next = row.slice(idx + 1).find((cell) => toText(cell));
  return toText(next);
}

/**
 * 根据表头的日期序号推算每列对应的日期（支持跨月周期）
 * @returns {Array<{col:number, date:string}>}
 */
function buildDayColumns(headerRow, period) {
  const columns = [];
  let { year, month } = period;
  let lastDay = 0;
  for (let col = FIRST_DAY_COL; col < headerRow.length; col += 1) {
    const day = parseInt(toText(headerRow[col]), 10);
    if (Number.isNaN(day)) continue;
    if (day < lastDay) {
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
    lastDay = day;
    columns.push({ col, date: `${year}-${pad(month)}-${pad(day)}` });
  }
  return columns;
}

/**
 * 解析整个工作簿中的「刷卡记录」表
 * @param {Buffer} buffer - Excel 文件内容
 * @returns {{period:Object, exportDate:string|null, employees:Array}}
 * @throws {Error} 缺少刷卡记录表或周期无法解析时
 */
function parsePunchWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[RAW_SHEET_NAME];
  if (!sheet) {
    throw new Error(`未找到「${RAW_SHEET_NAME}」工作表，请导出时保留该表`);
  }
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
  const infoRow = matrix[1] || [];
  const period = parsePeriod(findValueAfterLabel(infoRow, '考勤日期'));
  if (!period) {
    throw new Error('无法识别「刷卡记录」表中的考勤日期');
  }
  const exportDate = parseDate(findValueAfterLabel(infoRow, '制表时间'));
  const dayColumns = buildDayColumns(matrix[HEADER_ROW] || [], period);

  const employees = [];
  for (let r = FIRST_DATA_ROW; r < matrix.length; r += 1) {
    const row = matrix[r] || [];
    const name = toText(row[1]);
    if (!name) continue;
    const days = {};
    dayColumns.forEach(({ col, date }) => {
      const times = parsePunchCell(row[col]);
      if (times.length > 0) days[date] = times;
    });
    employees.push({
      externalId: toText(row[0]),
      name,
      department: toText(row[2]),
      days
    });
  }

  return {
    period,
    exportDate,
    dates: dayColumns.map((c) => c.date),
    employees,
    workbook
  };
}

module.exports = {
  parsePunchWorkbook,
  parsePeriod,
  parsePunchCell,
  dedupeTimes,
  timeToMinutes,
  normalizeTime,
  buildDayColumns
};
