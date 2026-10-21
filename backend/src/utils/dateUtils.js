/**
 * Date helpers
 *
 * 系统统一使用北京时间：后端进程运行在 TZ=Asia/Shanghai，所以这里的“本地”就是北京时间。
 * 取日期请用 formatLocalDate，不要用 toISOString().slice(0, 10)（那是 UTC 日期，
 * 北京时间 0 点至 8 点会差一天）。
 */

const pad = (n) => String(n).padStart(2, '0');

/**
 * 格式化为本地日期 YYYY-MM-DD
 *
 * @param {Date|string|number} value - 时间
 * @returns {string} 例如 2026-10-21
 */
const formatLocalDate = (value) => {
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * 格式化为本地日期时间 YYYY-MM-DD HH:mm
 *
 * @param {Date|string|number} value - 时间
 * @returns {string} 例如 2026-10-21 09:00
 */
const formatLocalDateTime = (value) => {
  const d = value instanceof Date ? value : new Date(value);
  return `${formatLocalDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

module.exports = { formatLocalDate, formatLocalDateTime };
