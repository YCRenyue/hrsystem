/**
 * Dashboard Controller - Statistics and overview
 */
const { Employee, Department, Attendance, Leave, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Get dashboard statistics
 */
const getDashboardStats = async (req, res) => {
  try {
    // Get total active employees
    const totalEmployees = await Employee.count({
      where: { status: 'active' }
    });

    // Get total departments
    const totalDepartments = await Department.count();

    // Get pending onboarding employees (status = 'pending')
    const pendingEmployees = await Employee.count({
      where: { status: 'pending' }
    });

    // Calculate completion rate (employees with complete data)
    const employeesWithCompleteData = await Employee.count({
      where: {
        status: 'active',
        data_complete: true
      }
    });

    const completionRate = totalEmployees > 0
      ? Math.round((employeesWithCompleteData / totalEmployees) * 100)
      : 0;

    // Get employee statistics by department
    const employeesByDepartment = await Employee.findAll({
      attributes: [
        'department_id',
        [sequelize.fn('COUNT', sequelize.col('employee_id')), 'count']
      ],
      where: { status: 'active' },
      group: ['department_id'],
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['name']
        }
      ],
      raw: true
    });

    // Get employee statistics by status
    const employeesByStatus = await Employee.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('employee_id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Attendance statistics (current month)
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const attendanceStats = await Attendance.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('attendance_id')), 'count']
      ],
      where: {
        date: {
          [Op.between]: [firstDayOfMonth, lastDayOfMonth]
        }
      },
      group: ['status'],
      raw: true
    });

    const totalAttendance = attendanceStats.reduce((sum, s) => sum + parseInt(s.count), 0);
    const normalAttendance = attendanceStats.find(s => s.status === 'normal')?.count || 0;
    const attendanceRate = totalAttendance > 0
      ? Math.round((normalAttendance / totalAttendance) * 100)
      : 0;

    // Leave statistics (current month)
    const leaveStats = await Leave.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('leave_id')), 'count']
      ],
      where: {
        start_date: {
          [Op.between]: [firstDayOfMonth, lastDayOfMonth]
        }
      },
      group: ['status'],
      raw: true
    });

    const pendingLeaves = leaveStats.find(s => s.status === 'pending')?.count || 0;
    const totalLeaves = leaveStats.reduce((sum, s) => sum + parseInt(s.count), 0);

    res.json({
      success: true,
      data: {
        totalEmployees,
        totalDepartments,
        pendingEmployees,
        completionRate,
        employeesByDepartment,
        employeesByStatus,
        attendanceRate,
        attendanceStats,
        pendingLeaves,
        totalLeaves,
        leaveStats
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
};

module.exports = {
  getDashboardStats
};
