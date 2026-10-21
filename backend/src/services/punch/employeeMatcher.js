/**
 * Punch Employee Matcher
 *
 * 把「刷卡记录」中的人员匹配到系统员工：
 *  1. 先按 HR 维护的对照表（设备 + 机器工号）匹配
 *  2. 没有对照时按姓名匹配；系统内同名员工不猜测，列入待确认
 *  3. 同一文件内同名多条：只有一条有打卡时用那一条，其余无打卡的忽略；
 *     多条都有打卡时列入待确认，由 HR 在对照表里指定
 */

const { Employee, PunchCardMapping } = require('../../models');

const hasPunches = (entry) => Object.keys(entry.days).length > 0;

/**
 * 去掉同名重复中没有打卡的条目，返回 { entries, ambiguousNames }
 * 有对照表的条目总是保留。
 * @param {Array} entries - 解析出的人员
 * @param {Map} mappingByExternalId
 */
function resolveFileDuplicates(entries, mappingByExternalId) {
  const byName = new Map();
  entries.forEach((entry) => {
    if (!byName.has(entry.name)) byName.set(entry.name, []);
    byName.get(entry.name).push(entry);
  });

  const kept = [];
  const ambiguousNames = new Set();
  byName.forEach((group, name) => {
    if (group.length === 1) {
      kept.push(group[0]);
      return;
    }
    const mapped = group.filter((e) => mappingByExternalId.has(e.externalId));
    const unmappedActive = group.filter(
      (e) => !mappingByExternalId.has(e.externalId) && hasPunches(e)
    );
    kept.push(...mapped);
    if (unmappedActive.length === 1 && mapped.length === 0) {
      kept.push(unmappedActive[0]);
    } else if (unmappedActive.length > 0) {
      ambiguousNames.add(name);
      kept.push(...unmappedActive);
    }
  });
  return { entries: kept, ambiguousNames };
}

/**
 * 读取员工姓名索引（解密姓名）
 * @returns {Promise<{byName: Map, duplicateNames: Set, byId: Map}>}
 */
async function loadEmployeeIndex() {
  const employees = await Employee.findAll({
    attributes: ['employee_id', 'employee_number', 'name_encrypted', 'status', 'leave_date'],
    include: [{ association: 'department', attributes: ['name'] }]
  });
  const byName = new Map();
  const byId = new Map();
  const duplicateNames = new Set();
  employees.forEach((emp) => {
    byId.set(emp.employee_id, emp);
    const name = (emp.getName() || '').trim();
    if (!name) return;
    if (byName.has(name)) duplicateNames.add(name);
    else byName.set(name, emp);
  });
  return { byName, byId, duplicateNames };
}

/**
 * 读取某设备的对照表
 * @param {'attendance'|'canteen'} deviceType
 * @returns {Promise<Map<string, string>>} externalId -> employee_id
 */
async function loadMappings(deviceType) {
  const rows = await PunchCardMapping.findAll({
    where: { device_type: deviceType },
    attributes: ['external_id', 'employee_id']
  });
  return new Map(rows.map((r) => [r.external_id, r.employee_id]));
}

const summarizeEntry = (entry, reason) => ({
  external_id: entry.externalId,
  name: entry.name,
  department: entry.department,
  punch_days: Object.keys(entry.days).length,
  ...(reason ? { reason } : {})
});

/**
 * 匹配单个条目
 * @returns {{employee?:Object, reason?:string}}
 */
function matchEntry(entry, { mappings, index, ambiguousNames }) {
  const mappedId = mappings.get(entry.externalId);
  if (mappedId) {
    const employee = index.byId.get(mappedId);
    return employee ? { employee } : { reason: '对照表中的员工已不存在' };
  }
  if (ambiguousNames.has(entry.name)) return { reason: '打卡文件中同名多条且都有打卡' };
  if (index.duplicateNames.has(entry.name)) return { reason: '系统中存在同名员工' };
  const employee = index.byName.get(entry.name);
  return employee ? { employee } : {};
}

/**
 * 匹配全部人员
 * @param {Array} entries - punchRecordParser 解析出的 employees
 * @param {'attendance'|'canteen'} deviceType
 * @returns {Promise<{matched:Array, unmatched:Array, ambiguous:Array}>}
 */
async function matchEmployees(entries, deviceType) {
  const [index, mappings] = await Promise.all([loadEmployeeIndex(), loadMappings(deviceType)]);
  const resolved = resolveFileDuplicates(entries, mappings);
  const context = { mappings, index, ambiguousNames: resolved.ambiguousNames };

  const matched = [];
  const unmatched = [];
  const ambiguous = [];
  const usedEmployeeIds = new Set();

  resolved.entries.forEach((entry) => {
    const { employee, reason } = matchEntry(entry, context);
    if (employee && usedEmployeeIds.has(employee.employee_id)) {
      ambiguous.push(summarizeEntry(entry, '多条打卡记录对应同一员工'));
    } else if (employee) {
      usedEmployeeIds.add(employee.employee_id);
      matched.push({ entry, employee });
    } else if (!hasPunches(entry)) {
      // 整个周期没有打卡的人员无需处理，不列出
    } else if (reason) {
      ambiguous.push(summarizeEntry(entry, reason));
    } else {
      unmatched.push(summarizeEntry(entry));
    }
  });

  return { matched, unmatched, ambiguous };
}

/**
 * 离职日期之后仍有打卡的提醒
 * @returns {Array<{external_id, name, leave_date, dates}>}
 */
function findPunchesAfterLeave(matched) {
  return matched
    .map(({ entry, employee }) => {
      if (!employee.leave_date) return null;
      const leaveDate = String(employee.leave_date).slice(0, 10);
      const dates = Object.keys(entry.days).filter((d) => d > leaveDate);
      if (dates.length === 0) return null;
      return {
        external_id: entry.externalId, name: entry.name, leave_date: leaveDate, dates
      };
    })
    .filter(Boolean);
}

module.exports = {
  matchEmployees,
  findPunchesAfterLeave,
  _internal: { resolveFileDuplicates, matchEntry }
};
