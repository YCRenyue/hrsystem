/**
 * Dashboard Controller - Statistics and overview
 */
const { Op } = require('sequelize');
const {
  Employee, Department, Attendance, Leave, sequelize
} = require('../models');

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

    const totalAttendance = attendanceStats.reduce((sum, s) => sum + parseInt(s.count, 10), 0);
    const normalAttendance = attendanceStats.find((s) => s.status === 'normal')?.count || 0;
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

    const pendingLeaves = leaveStats.find((s) => s.status === 'pending')?.count || 0;
    const totalLeaves = leaveStats.reduce((sum, s) => sum + parseInt(s.count, 10), 0);

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

/**
 * Get department distribution chart data
 */
const getDepartmentDistribution = async (req, res) => {
  try {
    const distribution = await Employee.findAll({
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

    const formattedData = distribution.map((item) => ({
      department: item['department.name'] || '未分配',
      count: parseInt(item.count, 10)
    }));

    res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error('Error fetching department distribution:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch department distribution'
    });
  }
};

/**
 * Get hiring trend data for the past 12 months
 */
const getHiringTrend = async (req, res) => {
  try {
    const today = new Date();
    const twelveMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 11, 1);

    // Get hired employees grouped by month
    const hiredData = await Employee.findAll({
      attributes: [
        [sequelize.fn('DATE_FORMAT', sequelize.col('entry_date'), '%Y-%m'), 'month'],
        [sequelize.fn('COUNT', sequelize.col('employee_id')), 'count']
      ],
      where: {
        entry_date: {
          [Op.gte]: twelveMonthsAgo
        }
      },
      group: [sequelize.fn('DATE_FORMAT', sequelize.col('entry_date'), '%Y-%m')],
      raw: true
    });

    // Create array for last 12 months
    const trendData = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      const hired = hiredData.find((d) => d.month === monthKey)?.count || 0;

      trendData.push({
        month: monthKey,
        hired: parseInt(hired, 10)
      });
    }

    res.json({
      success: true,
      data: trendData
    });
  } catch (error) {
    console.error('Error fetching hiring trend:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hiring trend'
    });
  }
};

/**
 * Get attendance analysis data
 */
const getAttendanceAnalysis = async (req, res) => {
  try {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Get daily attendance data
    const dailyAttendance = await Attendance.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('date')), 'date'],
        'status',
        [sequelize.fn('COUNT', sequelize.col('attendance_id')), 'count']
      ],
      where: {
        date: {
          [Op.between]: [firstDayOfMonth, lastDayOfMonth]
        }
      },
      group: [sequelize.fn('DATE', sequelize.col('date')), 'status'],
      raw: true
    });

    // Get status distribution
    const statusDistribution = await Attendance.findAll({
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

    res.json({
      success: true,
      data: {
        dailyAttendance,
        statusDistribution: statusDistribution.map((item) => ({
          status: item.status,
          count: parseInt(item.count, 10)
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching attendance analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance analysis'
    });
  }
};

/**
 * Get leave analysis data
 */
const getLeaveAnalysis = async (req, res) => {
  try {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Get leave type distribution with total days
    const typeDistribution = await Leave.findAll({
      attributes: [
        'leave_type',
        [sequelize.fn('SUM', sequelize.col('days')), 'days'],
        [sequelize.fn('COUNT', sequelize.col('leave_id')), 'count']
      ],
      where: {
        start_date: {
          [Op.between]: [firstDayOfMonth, lastDayOfMonth]
        },
        status: 'approved'
      },
      group: ['leave_type'],
      raw: true
    });

    res.json({
      success: true,
      data: {
        typeDistribution: typeDistribution.map((item) => ({
          type: item.leave_type,
          days: parseInt(item.days, 10) || 0,
          count: parseInt(item.count, 10)
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching leave analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave analysis'
    });
  }
};

module.exports = {
  getDashboardStats,
  getDepartmentDistribution,
  getHiringTrend,
  getAttendanceAnalysis,
  getLeaveAnalysis
};
