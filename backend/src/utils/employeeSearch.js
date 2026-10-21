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
 * 给关联员工的 include 追加“工号或姓名”搜索条件，保留原有条件（如数据范围）
 *
 * @param {Object} employeeInclude - Sequelize include 中的 Employee 项
 * @param {string} keyword - 搜索关键字，为空时不做任何事
 * @returns {Promise<void>}
 */
const applyEmployeeKeyword = async (employeeInclude, keyword) => {
  if (!keyword || !String(keyword).trim()) return;
  const keywordWhere = await buildEmployeeKeywordWhere(keyword);
  const existing = employeeInclude.where;
  // eslint-disable-next-line no-param-reassign
  employeeInclude.where = existing ? { [Op.and]: [existing, keywordWhere] } : keywordWhere;
};

module.exports = {
  findEmployeeIdsByName,
  buildEmployeeKeywordWhere,
  applyEmployeeKeyword
};
