/**
 * Leave Controller - 请假管理
 */

const { Op } = require('sequelize');
const {
  Leave, Employee, Department, User, sequelize
} = require('../models');
const permissionService = require('../services/PermissionService');

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
        message: '员工ID、请假类型、日期和天数为必填项'
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

    return res.status(201).json({
      success: true,
      message: '请假申请创建成功',
      data: leave
    });
  } catch (error) {
    console.error('Error creating leave:', error);
    return res.status(500).json({
      success: false,
      message: '创建请假申请失败'
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

    const limit = parseInt(size, 10);
    const offset = (parseInt(page, 10) - 1) * limit;

    // 基础查询条件
    const where = {};
    if (leave_type) where.leave_type = leave_type;
    if (status) where.status = status;
    if (start_date && end_date) {
      where.start_date = {
        [Op.between]: [start_date, end_date]
      };
    }

    const include = [
      {
        model: Employee,
        as: 'employee',
        attributes: ['employee_id', 'employee_number', 'name_encrypted', 'department_id'],
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
    ];

    // 根据用户角色应用数据过滤
    if (req.user.data_scope === 'all') {
      // admin/hr_admin: 可以查看所有数据
      if (employee_id) where.employee_id = employee_id;
    } else if (req.user.data_scope === 'department') {
      // department_manager: 只能查看本部门数据
      include[0].where = { department_id: req.user.department_id };
      if (employee_id) {
        where.employee_id = employee_id;
      }
    } else {
      // employee: 只能查看自己的数据
      where.employee_id = req.user.employee_id;
    }

    const { count, rows } = await Leave.findAndCountAll({
      where,
      include,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      distinct: true
    });

    // 处理敏感数据
    const canViewSensitive = permissionService.canViewSensitiveData(req.user);
    const processedRows = rows.map((row) => {
      const data = row.toJSON();
      if (data.employee) {
        data.employee = permissionService.processSensitiveFields(
          data.employee,
          canViewSensitive,
          'mask'
        );
      }
      return data;
    });

    res.json({
      success: true,
      data: {
        rows: processedRows,
        total: count,
        page: parseInt(page, 10),
        size: limit
      }
    });
  } catch (error) {
    console.error('Error getting leaves:', error);
    res.status(500).json({
      success: false,
      message: '获取请假记录失败'
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
      message: '获取请假统计失败'
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
        message: '请假记录不存在'
      });
    }

    // If approving/rejecting, add timestamp
    if (updateData.status === 'approved' || updateData.status === 'rejected') {
      updateData.approved_at = new Date();
    }

    await leave.update(updateData);

    return res.json({
      success: true,
      message: '请假申请更新成功',
      data: leave
    });
  } catch (error) {
    console.error('Error updating leave:', error);
    return res.status(500).json({
      success: false,
      message: '更新请假申请失败'
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
        message: '请假记录不存在'
      });
    }

    await leave.destroy();

    return res.json({
      success: true,
      message: '请假申请删除成功'
    });
  } catch (error) {
    console.error('Error deleting leave:', error);
    return res.status(500).json({
      success: false,
      message: '删除请假申请失败'
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
