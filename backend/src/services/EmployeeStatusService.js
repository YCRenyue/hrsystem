/**
 * Employee Status Transition Service
 * 员工状态流转服务 - 基于状态机模式
 */

const Employee = require('../models/Employee');
const logger = require('../utils/logger');

/**
 * 员工状态枚举
 */
const EmployeeStatus = {
  PENDING: 'pending', // 待入职
  ACTIVE: 'active', // 在职
  INACTIVE: 'inactive' // 离职
};

/**
 * 状态转换规则定义
 */
const STATUS_TRANSITIONS = {
  [EmployeeStatus.PENDING]: [EmployeeStatus.ACTIVE],
  [EmployeeStatus.ACTIVE]: [EmployeeStatus.INACTIVE],
  [EmployeeStatus.INACTIVE]: [] // 离职后不可转换
};

class EmployeeStatusService {
  /**
   * 检查状态转换是否有效
   * @param {string} currentStatus - 当前状态
   * @param {string} newStatus - 新状态
   * @returns {boolean} 是否允许转换
   */
  canTransition(currentStatus, newStatus) {
    if (currentStatus === newStatus) {
      return false;
    }

    const allowedTransitions = STATUS_TRANSITIONS[currentStatus];
    return allowedTransitions && allowedTransitions.includes(newStatus);
  }

  /**
   * 获取状态可转换的目标状态列表
   * @param {string} status - 当前状态
   * @returns {Array<string>} 可转换的状态列表
   */
  getStatusTransitions(status) {
    return STATUS_TRANSITIONS[status] || [];
  }

  /**
   * 激活员工（待入职 -> 在职）
   * @param {string} employeeId - 员工ID
   * @param {number} probationMonths - 试用期月数，默认3个月
   * @returns {Promise<Object>} 操作结果
   */
  async activate(employeeId, probationMonths = 3) {
    const employee = await Employee.findByPk(employeeId);

    if (!employee) {
      throw new Error('Employee not found');
    }

    if (!this.canTransition(employee.status, EmployeeStatus.ACTIVE)) {
      throw new Error(`Invalid status transition from ${employee.status} to ${EmployeeStatus.ACTIVE}`);
    }

    return this._updateStatus(employee, EmployeeStatus.ACTIVE, {
      probationMonths
    });
  }

  /**
   * 员工离职（在职 -> 离职）
   * @param {string} employeeId - 员工ID
   * @param {string} leaveDate - 离职日期
   * @returns {Promise<Object>} 操作结果
   */
  async deactivate(employeeId, leaveDate = null) {
    const employee = await Employee.findByPk(employeeId);

    if (!employee) {
      throw new Error('Employee not found');
    }

    if (!this.canTransition(employee.status, EmployeeStatus.INACTIVE)) {
      throw new Error(`Invalid status transition from ${employee.status} to ${EmployeeStatus.INACTIVE}`);
    }

    return this._updateStatus(employee, EmployeeStatus.INACTIVE, {
      leaveDate: leaveDate || new Date()
    });
  }

  /**
   * 更新员工状态（内部方法）
   * @private
   */
  async _updateStatus(employee, newStatus, options = {}) {
    const oldStatus = employee.status;
    employee.status = newStatus;

    this._applyStatusSpecificUpdates(employee, newStatus, options);

    await employee.save();

    logger.info('Employee status updated', {
      employeeId: employee.employee_id,
      oldStatus,
      newStatus
    });

    return {
      success: true,
      oldStatus,
      newStatus,
      employee
    };
  }

  /**
   * 根据新状态应用特定更新
   * @private
   */
  _applyStatusSpecificUpdates(employee, status, options) {
    if (status === EmployeeStatus.ACTIVE) {
      this._handleActivation(employee, options);
    } else if (status === EmployeeStatus.INACTIVE) {
      this._handleDeactivation(employee, options);
    }
  }

  /**
   * 处理员工激活
   * @private
   */
  _handleActivation(employee, { probationMonths = 3 }) {
    if (!employee.entry_date) {
      employee.entry_date = new Date();
    }

    if (!employee.probation_end_date) {
      const entryDate = new Date(employee.entry_date);
      const probationEnd = new Date(entryDate);
      probationEnd.setMonth(probationEnd.getMonth() + probationMonths);
      employee.probation_end_date = probationEnd;
    }
  }

  /**
   * 处理员工离职
   * @private
   */
  _handleDeactivation(employee, { leaveDate }) {
    employee.leave_date = leaveDate;
  }
}

module.exports = EmployeeStatusService;
module.exports.EmployeeStatus = EmployeeStatus;
