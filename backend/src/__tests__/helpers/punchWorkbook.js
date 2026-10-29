/**
 * Build an attendance/canteen machine export in the layout documented in
 * services/punch/punchRecordParser.js and HR guide 8.1 (sheet 「刷卡记录」). Fictional data only.
 */
const XLSX = require('xlsx');

/**
 * @param {Object} opts
 * @param {string} opts.start - YYYY-MM-DD, first day of the period
 * @param {string} opts.end - YYYY-MM-DD, last day of the period (same or next month)
 * @param {string} [opts.exportDate] - YYYY-MM-DD 制表时间
 * @param {Array<{id:string, name:string, dept?:string, days:Object<string,string[]>}>} opts.people
 *   days maps YYYY-MM-DD to punch times like ['07:52', '19:05']
 * @param {Object<string, Array[]>} [opts.extraSheets] - more sheets as row matrices
 * @returns {Buffer} xlsx file
 */
function buildPunchWorkbook({
  start, end, exportDate, people, extraSheets = {}
}) {
  const dates = [];
  for (let d = new Date(`${start}T00:00:00Z`); d <= new Date(`${end}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  const slash = (iso) => iso.replace(/-/g, '/');
  const info = ['考勤日期 :', `${slash(start)} ~ ${slash(end).slice(5)}`, '', '制表时间 :',
    exportDate ? slash(exportDate) : ''];
  const header = ['工号', '姓名', '部门', ...dates.map((d) => String(Number(d.slice(8))))];
  const rows = [['刷卡记录'], info, header, ['', '', '', ...dates.map(() => '')]];
  people.forEach((p) => {
    rows.push([p.id, p.name, p.dept || '', ...dates.map((d) => (p.days[d] || []).join('\n'))]);
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), '刷卡记录');
  Object.entries(extraSheets).forEach(([name, matrix]) => {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(matrix), name);
  });
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { buildPunchWorkbook };
