/**
 * Employee Search Helper
 *
 * 由于员工姓名以 AES-256 密文存储（无法直接 LIKE），需要在内存中解密匹配。
 * 适用于员工总量较小（< 数千）的查询场景，例如出差/报销/请假列表的姓名筛选。
 */

const { Op } = require('sequelize');
const { Employee } = require('../models');

/**
 * 根据姓名子串匹配员工 ID
 *
 * 使用方式：在控制器拿到 keyword 后调用本函数得到 employee_id 数组，
 * 再 `WHERE employee_id IN (...)` 加入查询条件。
 *
 * @param {string} keyword - 搜索关键字（中文姓或者完整姓名）
 * @returns {Promise<string[]>} 匹配的 employee_id 列表（无匹配则返回空数组）
 */
const findEmployeeIdsByName = async (keyword) => {
  const trimmed = (keyword || '').trim();
  if (!trimmed) return [];

  // 仅取必要字段，避免触发其它敏感字段解密
  const employees = await Employee.findAll({
    attributes: ['employee_id', 'name_encrypted']
  });

  const matched = [];
  for (const emp of employees) {
    const name = typeof emp.getName === 'function' ? emp.getName() : '';
    if (name && name.includes(trimmed)) {
      matched.push(emp.employee_id);
    }
  }
  return matched;
};

/**
 * 构建按“工号或姓名”模糊搜索员工的 where 条件，用于关联员工的列表查询
 *
 * @param {string} keyword - 搜索关键字
 * @returns {Promise<Object>} 用于 Employee include 的 where 条件
 */
const buildEmployeeKeywordWhere = async (keyword) => {
  const trimmed = (keyword || '').trim();
  const nameMatchedIds = await findEmployeeIdsByName(trimmed);
  return {
    [Op.or]: [
      { employee_number: { [Op.like]: `%${trimmed}%` } },
      ...(nameMatchedIds.length > 0 ? [{ employee_id: { [Op.in]: nameMatchedIds } }] : [])
    ]
  };
};

/**
 * 给关联员工的 include 追加搜索条件，保留原有条件（如数据范围）
 *
 * @param {Object} employeeInclude - Sequelize include 中的 Employee 项
 * @param {Object} criteria - 搜索条件，全部为空时不做任何事
 * @param {string} [criteria.keyword] - 工号或姓名关键字
 * @param {string} [criteria.employeeNumber] - 工号（模糊匹配）
 * @param {string} [criteria.name] - 姓名（模糊匹配）
 * @returns {Promise<void>}
 */
const applyEmployeeFilters = async (employeeInclude, { keyword, employeeNumber, name } = {}) => {
  const conditions = [];
  if (keyword && String(keyword).trim()) {
    conditions.push(await buildEmployeeKeywordWhere(keyword));
  }
  if (employeeNumber && String(employeeNumber).trim()) {
    conditions.push({ employee_number: { [Op.like]: `%${String(employeeNumber).trim()}%` } });
  }
  if (name && String(name).trim()) {
    conditions.push({ employee_id: { [Op.in]: await findEmployeeIdsByName(String(name)) } });
  }
  if (conditions.length === 0) return;
  const existing = employeeInclude.where;
  const all = existing ? [existing, ...conditions] : conditions;
  // eslint-disable-next-line no-param-reassign
  employeeInclude.where = all.length === 1 ? all[0] : { [Op.and]: all };
};

/**
 * 给关联员工的 include 追加“工号或姓名”搜索条件，保留原有条件（如数据范围）
 *
 * @param {Object} employeeInclude - Sequelize include 中的 Employee 项
 * @param {string} keyword - 搜索关键字，为空时不做任何事
 * @returns {Promise<void>}
 */
const applyEmployeeKeyword = (employeeInclude, keyword) => (
  applyEmployeeFilters(employeeInclude, { keyword })
);

module.exports = {
  findEmployeeIdsByName,
  buildEmployeeKeywordWhere,
  applyEmployeeKeyword,
  applyEmployeeFilters
};
