/**
 * Attendance Controller - 考勤管理
 */

const { Op } = require('sequelize');
const {
  Attendance, Employee, Department, sequelize
} = require('../models');
const permissionService = require('../services/PermissionService');

/**
 * Create attendance record
 */
const createAttendance = async (req, res) => {
  try {
    const {
      employee_id,
      date,
      check_in_time,
      check_out_time,
      status,
      late_minutes,
      early_leave_minutes,
      work_hours,
      overtime_hours,
      notes,
      location,
      device_info
    } = req.body;

    if (!employee_id || !date) {
      return res.status(400).json({
        success: false,
        message: '员工ID和日期为必填项'
      });
    }

    // Check for duplicate
    const existing = await Attendance.findOne({
      where: { employee_id, date }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: '该日期的考勤记录已存在'
      });
    }

    const attendance = await Attendance.create({
      employee_id,
      date,
      check_in_time,
      check_out_time,
      status: status || 'normal',
      late_minutes: late_minutes || 0,
      early_leave_minutes: early_leave_minutes || 0,
      work_hours,
      overtime_hours: overtime_hours || 0,
      notes,
      location,
      device_info
    });

    return res.status(201).json({
      success: true,
      message: '考勤记录创建成功',
      data: attendance
    });
  } catch (error) {
    console.error('Error creating attendance:', error);
    return res.status(500).json({
      success: false,
      message: '创建考勤记录失败'
    });
  }
};

/**
 * Get attendance list with filters and pagination
 */
const getAttendanceList = async (req, res) => {
  try {
    const {
      page = 1,
      size = 10,
      employee_id,
      start_date,
      end_date,
      status,
      department_id
    } = req.query;

    const limit = parseInt(size, 10);
    const offset = (parseInt(page, 10) - 1) * limit;

    // 基础查询条件
    const where = {};
    if (status) where.status = status;
    if (start_date && end_date) {
      where.date = {
        [Op.between]: [start_date, end_date]
      };
    }

    // 根据用户权限过滤数据
    // admin和hr_admin: 可以查看所有数据或指定部门
    // department_manager: 只能查看本部门数据
    // employee: 只能查看自己的数据
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
      }
    ];

    // 根据用户角色应用数据过滤
    if (req.user.data_scope === 'all') {
      // admin/hr_admin: 可以查看所有数据
      if (employee_id) where.employee_id = employee_id;
      if (department_id) {
        include[0].where = { department_id };
      }
    } else if (req.user.data_scope === 'department') {
      // department_manager: 只能查看本部门数据
      include[0].where = { department_id: req.user.department_id };
      if (employee_id) {
        // 只能查询本部门的员工
        where.employee_id = employee_id;
      }
    } else {
      // employee: 只能查看自己的数据
      where.employee_id = req.user.employee_id;
    }

    const { count, rows } = await Attendance.findAndCountAll({
      where,
      include,
      limit,
      offset,
      order: [['date', 'DESC']],
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
    console.error('Error getting attendances:', error);
    res.status(500).json({
      success: false,
      message: '获取考勤记录失败'
    });
  }
};

/**
 * Get attendance statistics
 */
const getAttendanceStats = async (req, res) => {
  try {
    const { start_date, end_date, _department_id } = req.query;

    const where = {};
    if (start_date && end_date) {
      where.date = {
        [Op.between]: [start_date, end_date]
      };
    }

    // Total records
    const totalRecords = await Attendance.count({ where });

    // By status
    const byStatus = await Attendance.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('attendance_id')), 'count']
      ],
      where,
      group: ['status'],
      raw: true
    });

    // Attendance rate
    const normalCount = byStatus.find((s) => s.status === 'normal')?.count || 0;
    const attendanceRate = totalRecords > 0
      ? Math.round((normalCount / totalRecords) * 100)
      : 0;

    // Late count
    const lateCount = byStatus.find((s) => s.status === 'late')?.count || 0;

    // Absent count
    const absentCount = byStatus.find((s) => s.status === 'absent')?.count || 0;

    res.json({
      success: true,
      data: {
        totalRecords,
        attendanceRate,
        lateCount,
        absentCount,
        byStatus
      }
    });
  } catch (error) {
    console.error('Error getting attendance stats:', error);
    res.status(500).json({
      success: false,
      message: '获取考勤统计失败'
    });
  }
};

/**
 * Update attendance record
 */
const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const attendance = await Attendance.findByPk(id);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: '考勤记录不存在'
      });
    }

    await attendance.update(updateData);

    return res.json({
      success: true,
      message: '考勤记录更新成功',
      data: attendance
    });
  } catch (error) {
    console.error('Error updating attendance:', error);
    return res.status(500).json({
      success: false,
      message: '更新考勤记录失败'
    });
  }
};

/**
 * Delete attendance record
 */
const deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    const attendance = await Attendance.findByPk(id);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: '考勤记录不存在'
      });
    }

    await attendance.destroy();

    return res.json({
      success: true,
      message: '考勤记录删除成功'
    });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    return res.status(500).json({
      success: false,
      message: '删除考勤记录失败'
    });
  }
};

module.exports = {
  createAttendance,
  getAttendanceList,
  getAttendanceStats,
  updateAttendance,
  deleteAttendance
};
