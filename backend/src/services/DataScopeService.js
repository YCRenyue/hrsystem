/**
 * Data scope service.
 * Applies the authenticated user's row-level employee scope consistently.
 */

const Employee = require('../models/Employee');

/**
 * Check whether a user may access an employee record.
 *
 * @param {Object} user Authenticated user payload
 * @param {string} employeeId Employee ID
 * @returns {Promise<boolean>} Whether access is allowed
 */
const canAccessEmployee = async (user, employeeId) => {
  if (!user || !employeeId) return false;
  if (user.data_scope === 'all' || user.role === 'admin') return true;
  if (user.data_scope === 'self' || user.role === 'employee') {
    return user.employee_id === employeeId;
  }
  if (user.data_scope !== 'department' || !user.department_id) return false;

  const count = await Employee.count({
    where: { employee_id: employeeId, department_id: user.department_id }
  });
  return count > 0;
};

/**
 * Apply employee scope to a resource query that joins Employee as `employee`.
 *
 * @param {Object} where Resource where clause
 * @param {Object} employeeInclude Sequelize Employee include
 * @param {Object} user Authenticated user payload
 * @returns {boolean} False when the account has no usable scope
 */
const applyResourceScope = (where, employeeInclude, user) => {
  if (user?.data_scope === 'all' || user?.role === 'admin') return true;
  if (user?.data_scope === 'department' && user.department_id) {
    employeeInclude.where = {
      ...(employeeInclude.where || {}),
      department_id: user.department_id
    };
    employeeInclude.required = true;
    return true;
  }
  if (user?.employee_id) {
    where.employee_id = user.employee_id;
    return true;
  }
  return false;
};

module.exports = { canAccessEmployee, applyResourceScope };
