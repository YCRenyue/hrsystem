/**
 * Approval Service
 *
 * 请假、出差等审批流共用的查询：
 *   - 申请提交后从哪一级开始审批
 *   - 员工对应的登录账号（用于给申请人发通知）
 */

const { User } = require('../models');

/**
 * 计算初始审批级别：所在部门有在职的部门负责人则从部门审批开始，否则直接到 HR
 *
 * @param {string|null} departmentId - 申请人所在部门
 * @returns {Promise<'department'|'hr'>} 初始审批级别
 */
const getInitialApprovalStage = async (departmentId) => {
  if (!departmentId) return 'hr';
  const count = await User.count({
    where: {
      role: 'department_manager',
      department_id: departmentId,
      status: 'active',
      is_active: true
    }
  });
  return count > 0 ? 'department' : 'hr';
};

/**
 * 找到员工对应的登录账号
 *
 * @param {string|null} employeeId - 员工 ID
 * @returns {Promise<string|null>} user_id，没有账号时为 null
 */
const findUserIdForEmployee = async (employeeId) => {
  if (!employeeId) return null;
  const user = await User.findOne({
    where: { employee_id: employeeId },
    attributes: ['user_id']
  });
  return user ? user.user_id : null;
};

module.exports = { getInitialApprovalStage, findUserIdForEmployee };
