/**
 * Dashboard Controller - Statistics and overview
 */
const { Employee, Department, sequelize } = require('../models');

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

    res.json({
      success: true,
      data: {
        totalEmployees,
        totalDepartments,
        pendingEmployees,
        completionRate,
        employeesByDepartment,
        employeesByStatus
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
