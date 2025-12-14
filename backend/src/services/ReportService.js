/**
 * Report Service
 *
 * 生成各类HR报表，支持权限控制和数据范围过滤
 */

const { Op } = require('sequelize');
const { sequelize: _sequelize } = require('../config/database');
const {
  Employee, Leave, Attendance, Department
} = require('../models');
const logger = require('../utils/logger');
const permissionService = require('./PermissionService');

class ReportService {
  /**
   * 获取假期报表
   *
   * @param {Object} user - 当前用户
   * @param {Object} filters - 筛选条件
   * @returns {Promise<Object>} 假期报表数据
   */
  async getLeaveReport(user, filters = {}) {
    const {
      start_date,
      end_date,
      leave_type,
      department_id,
      employee_id,
      status = 'approved' // 默认只统计已批准的假期
    } = filters;

    try {
      // 构建查询条件
      const whereClause = {
        status
      };

      if (start_date && end_date) {
        whereClause[Op.or] = [
          {
            start_date: {
              [Op.between]: [start_date, end_date]
            }
          },
          {
            end_date: {
              [Op.between]: [start_date, end_date]
            }
          }
        ];
      }

      if (leave_type) {
        whereClause.leave_type = leave_type;
      }

      if (employee_id) {
        whereClause.employee_id = employee_id;
      }

      // 应用数据权限过滤（使用统一的PermissionService）
      const employeeWhere = permissionService.applyDataScopeFilter(
        user,
        'employee',
        department_id ? { department_id } : {}
      );

      // 查询假期记录
      const leaves = await Leave.findAll({
        where: whereClause,
        include: [
          {
            model: Employee,
            as: 'employee',
            where: employeeWhere,
            attributes: ['employee_id', 'employee_number', 'name', 'department_id'],
            include: [
              {
                model: Department,
                as: 'department',
                attributes: ['department_id', 'name']
              }
            ]
          }
        ],
        order: [['start_date', 'DESC']]
      });

      // 统计数据
      const statistics = this._calculateLeaveStatistics(leaves);

      // 按类型分组统计
      const byType = this._groupLeavesByType(leaves);

      // 按部门分组统计（如果用户有权限查看多部门）
      const byDepartment = user.data_scope === 'all'
        ? this._groupLeavesByDepartment(leaves)
        : null;

      return {
        leaves: leaves.map((leave) => this._formatLeaveRecord(leave)),
        statistics,
        byType,
        byDepartment,
        total: leaves.length
      };
    } catch (error) {
      logger.error('获取假期报表失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取考勤报表
   *
   * @param {Object} user - 当前用户
   * @param {Object} filters - 筛选条件
   * @returns {Promise<Object>} 考勤报表数据
   */
  async getAttendanceReport(user, filters = {}) {
    const {
      start_date,
      end_date,
      department_id,
      employee_id,
      status
    } = filters;

    try {
      // 构建查询条件
      const whereClause = {};

      if (start_date && end_date) {
        whereClause.date = {
          [Op.between]: [start_date, end_date]
        };
      }

      if (status) {
        whereClause.status = status;
      }

      if (employee_id) {
        whereClause.employee_id = employee_id;
      }

      // 应用数据权限过滤（使用统一的PermissionService）
      const employeeWhere = permissionService.applyDataScopeFilter(
        user,
        'employee',
        department_id ? { department_id } : {}
      );

      // 查询考勤记录
      const attendances = await Attendance.findAll({
        where: whereClause,
        include: [
          {
            model: Employee,
            as: 'employee',
            where: employeeWhere,
            attributes: ['employee_id', 'employee_number', 'name', 'department_id'],
            include: [
              {
                model: Department,
                as: 'department',
                attributes: ['department_id', 'name']
              }
            ]
          }
        ],
        order: [['date', 'DESC']]
      });

      // 统计数据
      const statistics = this._calculateAttendanceStatistics(attendances);

      // 按状态分组统计
      const byStatus = this._groupAttendancesByStatus(attendances);

      // 按部门分组统计
      const byDepartment = user.data_scope === 'all'
        ? this._groupAttendancesByDepartment(attendances)
        : null;

      // 异常考勤汇总
      const abnormalRecords = attendances.filter((a) => ['late', 'early_leave', 'absent'].includes(a.status));

      return {
        attendances: attendances.map((att) => this._formatAttendanceRecord(att)),
        statistics,
        byStatus,
        byDepartment,
        abnormalRecords: abnormalRecords.map((att) => this._formatAttendanceRecord(att)),
        total: attendances.length
      };
    } catch (error) {
      logger.error('获取考勤报表失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取入职/离职人员报表
   *
   * @param {Object} user - 当前用户
   * @param {Object} filters - 筛选条件
   * @returns {Promise<Object>} 入离职报表数据
   */
  async getOnboardingOffboardingReport(user, filters = {}) {
    const {
      start_date,
      end_date,
      department_id,
      report_type = 'onboarding' // 'onboarding' | 'offboarding' | 'both'
    } = filters;

    try {
      const employeeWhere = this._applyDataScopeFilter(user, department_id);

      let onboardingData = null;
      let offboardingData = null;

      // 入职人员统计
      if (report_type === 'onboarding' || report_type === 'both') {
        const onboardingWhere = { ...employeeWhere };
        if (start_date && end_date) {
          onboardingWhere.entry_date = {
            [Op.between]: [start_date, end_date]
          };
        }

        const onboardingEmployees = await Employee.findAll({
          where: onboardingWhere,
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['department_id', 'name']
            }
          ],
          order: [['entry_date', 'DESC']]
        });

        onboardingData = {
          employees: onboardingEmployees.map((emp) => this._formatEmployeeRecord(emp)),
          total: onboardingEmployees.length,
          byDepartment: user.data_scope === 'all'
            ? this._groupEmployeesByDepartment(onboardingEmployees)
            : null,
          byMonth: this._groupEmployeesByMonth(onboardingEmployees, 'entry_date')
        };
      }

      // 离职人员统计
      if (report_type === 'offboarding' || report_type === 'both') {
        const offboardingWhere = {
          ...employeeWhere,
          status: 'inactive'
        };

        if (start_date && end_date && filters.departure_date) {
          offboardingWhere.departure_date = {
            [Op.between]: [start_date, end_date]
          };
        }

        const offboardingEmployees = await Employee.findAll({
          where: offboardingWhere,
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['department_id', 'name']
            }
          ],
          order: [['departure_date', 'DESC']]
        });

        offboardingData = {
          employees: offboardingEmployees.map((emp) => this._formatEmployeeRecord(emp)),
          total: offboardingEmployees.length,
          byDepartment: user.data_scope === 'all'
            ? this._groupEmployeesByDepartment(offboardingEmployees)
            : null,
          byMonth: this._groupEmployeesByMonth(offboardingEmployees, 'departure_date')
        };
      }

      return {
        onboarding: onboardingData,
        offboarding: offboardingData,
        period: { start_date, end_date }
      };
    } catch (error) {
      logger.error('获取入离职报表失败:', error.message);
      throw error;
    }
  }

  /**
   * 应用数据范围过滤
   *
   * @private
   * @param {Object} user - 当前用户
   * @param {string} department_id - 指定的部门ID（可选）
   * @returns {Object} Sequelize where条件
   */
  _applyDataScopeFilter(user, department_id) {
    const where = {};

    if (user.data_scope === 'all') {
      // Admin/HR可以查看所有数据
      if (department_id) {
        where.department_id = department_id;
      }
    } else if (user.data_scope === 'department') {
      // 部门经理只能查看本部门数据
      where.department_id = user.department_id;
    } else if (user.data_scope === 'self') {
      // 员工只能查看自己的数据
      where.employee_id = user.employee_id;
    }

    return where;
  }

  /**
   * 计算假期统计数据
   *
   * @private
   */
  _calculateLeaveStatistics(leaves) {
    return {
      total_leaves: leaves.length,
      total_days: leaves.reduce((sum, leave) => sum + parseFloat(leave.days || 0), 0),
      avg_days: leaves.length > 0
        ? (leaves.reduce((sum, leave) => sum + parseFloat(leave.days || 0), 0) / leaves.length).toFixed(1)
        : 0
    };
  }

  /**
   * 按类型分组假期
   *
   * @private
   */
  _groupLeavesByType(leaves) {
    const grouped = {};
    const typeNames = {
      annual: '年假',
      sick: '病假',
      personal: '事假',
      compensatory: '调休',
      maternity: '产假',
      paternity: '陪产假',
      marriage: '婚假',
      bereavement: '丧假',
      other: '其他'
    };

    leaves.forEach((leave) => {
      const type = leave.leave_type;
      if (!grouped[type]) {
        grouped[type] = {
          type,
          name: typeNames[type] || type,
          count: 0,
          total_days: 0
        };
      }
      grouped[type].count += 1;
      grouped[type].total_days += parseFloat(leave.days || 0);
    });

    return Object.values(grouped);
  }

  /**
   * 按部门分组假期
   *
   * @private
   */
  _groupLeavesByDepartment(leaves) {
    const grouped = {};

    leaves.forEach((leave) => {
      const deptId = leave.employee?.department?.department_id;
      const deptName = leave.employee?.department?.name;

      if (!deptId) return;

      if (!grouped[deptId]) {
        grouped[deptId] = {
          department_id: deptId,
          department_name: deptName,
          count: 0,
          total_days: 0
        };
      }

      grouped[deptId].count += 1;
      grouped[deptId].total_days += parseFloat(leave.days || 0);
    });

    return Object.values(grouped);
  }

  /**
   * 计算考勤统计数据
   *
   * @private
   */
  _calculateAttendanceStatistics(attendances) {
    const stats = {
      total: attendances.length,
      normal: 0,
      late: 0,
      early_leave: 0,
      absent: 0,
      leave: 0,
      total_late_minutes: 0,
      total_early_leave_minutes: 0,
      total_work_hours: 0,
      total_overtime_hours: 0
    };

    attendances.forEach((att) => {
      stats[att.status] = (stats[att.status] || 0) + 1;
      stats.total_late_minutes += att.late_minutes || 0;
      stats.total_early_leave_minutes += att.early_leave_minutes || 0;
      stats.total_work_hours += parseFloat(att.work_hours || 0);
      stats.total_overtime_hours += parseFloat(att.overtime_hours || 0);
    });

    return stats;
  }

  /**
   * 按状态分组考勤
   *
   * @private
   */
  _groupAttendancesByStatus(attendances) {
    const grouped = {};
    const statusNames = {
      normal: '正常',
      late: '迟到',
      early_leave: '早退',
      absent: '缺勤',
      leave: '请假',
      holiday: '节假日',
      weekend: '周末'
    };

    attendances.forEach((att) => {
      const { status } = att;
      if (!grouped[status]) {
        grouped[status] = {
          status,
          name: statusNames[status] || status,
          count: 0
        };
      }
      grouped[status].count += 1;
    });

    return Object.values(grouped);
  }

  /**
   * 按部门分组考勤
   *
   * @private
   */
  _groupAttendancesByDepartment(attendances) {
    const grouped = {};

    attendances.forEach((att) => {
      const deptId = att.employee?.department?.department_id;
      const deptName = att.employee?.department?.name;

      if (!deptId) return;

      if (!grouped[deptId]) {
        grouped[deptId] = {
          department_id: deptId,
          department_name: deptName,
          total: 0,
          normal: 0,
          late: 0,
          early_leave: 0,
          absent: 0
        };
      }

      grouped[deptId].total += 1;
      grouped[deptId][att.status] = (grouped[deptId][att.status] || 0) + 1;
    });

    return Object.values(grouped);
  }

  /**
   * 按部门分组员工
   *
   * @private
   */
  _groupEmployeesByDepartment(employees) {
    const grouped = {};

    employees.forEach((emp) => {
      const deptId = emp.department?.department_id;
      const deptName = emp.department?.name;

      if (!deptId) return;

      if (!grouped[deptId]) {
        grouped[deptId] = {
          department_id: deptId,
          department_name: deptName,
          count: 0
        };
      }

      grouped[deptId].count += 1;
    });

    return Object.values(grouped);
  }

  /**
   * 按月分组员工
   *
   * @private
   */
  _groupEmployeesByMonth(employees, dateField) {
    const grouped = {};

    employees.forEach((emp) => {
      const date = emp[dateField];
      if (!date) return;

      const month = date.substring(0, 7); // YYYY-MM

      if (!grouped[month]) {
        grouped[month] = {
          month,
          count: 0
        };
      }

      grouped[month].count += 1;
    });

    return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * 格式化假期记录
   *
   * @private
   */
  _formatLeaveRecord(leave) {
    return {
      leave_id: leave.leave_id,
      employee: {
        employee_id: leave.employee?.employee_id,
        employee_number: leave.employee?.employee_number,
        name: leave.employee?.name,
        department: leave.employee?.department?.name
      },
      leave_type: leave.leave_type,
      start_date: leave.start_date,
      end_date: leave.end_date,
      days: parseFloat(leave.days),
      reason: leave.reason,
      status: leave.status
    };
  }

  /**
   * 格式化考勤记录
   *
   * @private
   */
  _formatAttendanceRecord(att) {
    return {
      attendance_id: att.attendance_id,
      employee: {
        employee_id: att.employee?.employee_id,
        employee_number: att.employee?.employee_number,
        name: att.employee?.name,
        department: att.employee?.department?.name
      },
      date: att.date,
      check_in_time: att.check_in_time,
      check_out_time: att.check_out_time,
      status: att.status,
      late_minutes: att.late_minutes,
      early_leave_minutes: att.early_leave_minutes,
      work_hours: parseFloat(att.work_hours || 0),
      overtime_hours: parseFloat(att.overtime_hours || 0)
    };
  }

  /**
   * 格式化员工记录
   *
   * @private
   */
  _formatEmployeeRecord(emp) {
    return {
      employee_id: emp.employee_id,
      employee_number: emp.employee_number,
      name: emp.name,
      department: emp.department?.name,
      entry_date: emp.entry_date,
      departure_date: emp.departure_date,
      status: emp.status
    };
  }
}

module.exports = new ReportService();
