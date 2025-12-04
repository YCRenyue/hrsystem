/**
 * Leave Controller - 请假管理
 */

const { Leave, Employee, Department, User, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Create leave application
 */
const createLeave = async (req, res) => {
  try {
    const {
      employee_id,
      leave_type,
      start_date,
      end_date,
      days,
      reason,
      attachment_url
    } = req.body;

    if (!employee_id || !leave_type || !start_date || !end_date || !days) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, leave type, dates, and days are required'
      });
    }

    const leave = await Leave.create({
      employee_id,
      leave_type,
      start_date,
      end_date,
      days,
      reason,
      status: 'pending',
      attachment_url
    });

    res.status(201).json({
      success: true,
      message: 'Leave application created successfully',
      data: leave
    });
  } catch (error) {
    console.error('Error creating leave:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create leave application'
    });
  }
};

/**
 * Get leave list with filters and pagination
 */
const getLeaveList = async (req, res) => {
  try {
    const {
      page = 1,
      size = 10,
      employee_id,
      leave_type,
      status,
      start_date,
      end_date
    } = req.query;

    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;

    const where = {};
    if (employee_id) where.employee_id = employee_id;
    if (leave_type) where.leave_type = leave_type;
    if (status) where.status = status;
    if (start_date && end_date) {
      where.start_date = {
        [Op.between]: [start_date, end_date]
      };
    }

    const { count, rows } = await Leave.findAndCountAll({
      where,
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['employee_id', 'employee_number', 'name_encrypted'],
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['department_id', 'name']
            }
          ]
        },
        {
          model: User,
          as: 'approver',
          attributes: ['user_id', 'username'],
          required: false
        }
      ],
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        rows,
        total: count,
        page: parseInt(page),
        size: limit
      }
    });
  } catch (error) {
    console.error('Error getting leaves:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get leave applications'
    });
  }
};

/**
 * Get leave statistics
 */
const getLeaveStats = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const where = {};
    if (start_date && end_date) {
      where.start_date = {
        [Op.between]: [start_date, end_date]
      };
    }

    // Total applications
    const totalApplications = await Leave.count({ where });

    // Pending count
    const pendingCount = await Leave.count({
      where: { ...where, status: 'pending' }
    });

    // By type
    const byType = await Leave.findAll({
      attributes: [
        'leave_type',
        [sequelize.fn('COUNT', sequelize.col('leave_id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('days')), 'total_days']
      ],
      where,
      group: ['leave_type'],
      raw: true
    });

    // By status
    const byStatus = await Leave.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('leave_id')), 'count']
      ],
      where,
      group: ['status'],
      raw: true
    });

    res.json({
      success: true,
      data: {
        totalApplications,
        pendingCount,
        byType,
        byStatus
      }
    });
  } catch (error) {
    console.error('Error getting leave stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get leave statistics'
    });
  }
};

/**
 * Update leave application
 */
const updateLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const leave = await Leave.findByPk(id);
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave application not found'
      });
    }

    // If approving/rejecting, add timestamp
    if (updateData.status === 'approved' || updateData.status === 'rejected') {
      updateData.approved_at = new Date();
    }

    await leave.update(updateData);

    res.json({
      success: true,
      message: 'Leave application updated successfully',
      data: leave
    });
  } catch (error) {
    console.error('Error updating leave:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update leave application'
    });
  }
};

/**
 * Delete leave application
 */
const deleteLeave = async (req, res) => {
  try {
    const { id } = req.params;

    const leave = await Leave.findByPk(id);
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave application not found'
      });
    }

    await leave.destroy();

    res.json({
      success: true,
      message: 'Leave application deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting leave:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete leave application'
    });
  }
};

module.exports = {
  createLeave,
  getLeaveList,
  getLeaveStats,
  updateLeave,
  deleteLeave
};
