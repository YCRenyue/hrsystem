/**
 * Attendance Controller
 * 考勤管理控制器
 */

const { Attendance, Employee, Department } = require('../models');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const permissionService = require('../services/PermissionService');

/**
 * Get paginated list of attendance records
 * 获取考勤记录分页列表
 */
const getAttendanceList = async (req, res) => {
  try {
    const {
      page = 1,
      size = 10,
      start_date,
      end_date,
      status,
      department_id,
      employee_id,
      sort_by = 'date',
      sort_order = 'DESC',
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(size);
    const limit = parseInt(size);

    // Build where clause with permission-based filtering
    let where = permissionService.applyDataScopeFilter(req.user, 'attendance', {});

    // Date range filter
    if (start_date && end_date) {
      where.date = {
        [Op.between]: [start_date, end_date],
      };
    } else if (start_date) {
      where.date = {
        [Op.gte]: start_date,
      };
    } else if (end_date) {
      where.date = {
        [Op.lte]: end_date,
      };
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Employee filter (for specific employee lookup)
    if (employee_id) {
      where.employee_id = employee_id;
    }

    // Build include for employee and department
    const include = [
      {
        model: Employee,
        as: 'employee',
        attributes: ['employee_id', 'employee_number', 'email'],
        include: [
          {
            model: Department,
            as: 'department',
            attributes: ['department_id', 'name', 'code'],
          },
        ],
      },
    ];

    // Department filter (if provided and user has permission)
    if (department_id && req.user.data_scope === 'all') {
      include[0].where = { department_id };
    }

    // Build order clause
    const validSortFields = ['date', 'check_in_time', 'check_out_time', 'status', 'work_hours'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'date';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { count, rows } = await Attendance.findAndCountAll({
      where,
      include,
      offset,
      limit,
      order: [[sortField, sortDirection]],
      distinct: true,
    });

    // Process attendance records with sensitive data handling
    const canViewSensitive = permissionService.canViewSensitiveData(req.user);
    const processedRows = rows.map(attendance => {
      const record = attendance.toJSON();

      // Process employee data
      if (record.employee) {
        record.employee = permissionService.processSensitiveFields(
          record.employee,
          canViewSensitive,
          'mask'
        );

        // Flatten employee data for easier frontend access
        record.employee_number = record.employee.employee_number;
        record.employee_name = record.employee.name;
        record.department_name = record.employee.department?.name || '';
      }

      return record;
    });

    res.json({
      success: true,
      data: processedRows,
      pagination: {
        total: count,
        page: parseInt(page),
        size: parseInt(size),
        totalPages: Math.ceil(count / parseInt(size)),
      },
    });
  } catch (error) {
    console.error('Error fetching attendance list:', error);
    res.status(500).json({
      success: false,
      message: '获取考勤记录失败',
      error: error.message,
    });
  }
};

/**
 * Get single attendance record by ID
 * 获取单条考勤记录详情
 */
const getAttendanceById = async (req, res) => {
  try {
    const { id } = req.params;

    const attendance = await Attendance.findByPk(id, {
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['employee_id', 'employee_number', 'email'],
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['department_id', 'name', 'code'],
            },
          ],
        },
      ],
    });

    if (!attendance) {
      throw new NotFoundError('Attendance', id);
    }

    // Check if user has permission to access this attendance record
    const attendanceData = attendance.toJSON();
    const canAccess = permissionService.canAccessResource(
      req.user,
      { employee_id: attendanceData.employee_id },
      'attendance'
    );

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: '无权访问此考勤记录',
      });
    }

    // Process sensitive data
    const canViewSensitive = permissionService.canViewSensitiveData(req.user);
    if (attendanceData.employee) {
      attendanceData.employee = permissionService.processSensitiveFields(
        attendanceData.employee,
        canViewSensitive,
        'mask'
      );
    }

    res.json({
      success: true,
      data: attendanceData,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    console.error('Error fetching attendance:', error);
    res.status(500).json({
      success: false,
      message: '获取考勤记录失败',
      error: error.message,
    });
  }
};

/**
 * Get attendance statistics for an employee
 * 获取员工考勤统计
 */
const getAttendanceStats = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      throw new ValidationError('start_date and end_date are required');
    }

    // Check permission to access this employee's data
    const canAccess = permissionService.canAccessResource(
      req.user,
      { employee_id: employeeId },
      'attendance'
    );

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: '无权访问此员工的考勤统计',
      });
    }

    const attendanceRecords = await Attendance.findAll({
      where: {
        employee_id: employeeId,
        date: {
          [Op.between]: [start_date, end_date],
        },
      },
    });

    // Calculate statistics
    const stats = {
      total_days: attendanceRecords.length,
      normal_days: 0,
      late_days: 0,
      early_leave_days: 0,
      absent_days: 0,
      leave_days: 0,
      total_work_hours: 0,
      total_overtime_hours: 0,
    };

    attendanceRecords.forEach(record => {
      const data = record.toJSON();

      if (data.status === 'normal') stats.normal_days++;
      else if (data.status === 'late') stats.late_days++;
      else if (data.status === 'early_leave') stats.early_leave_days++;
      else if (data.status === 'absent') stats.absent_days++;
      else if (data.status === 'leave') stats.leave_days++;

      if (data.work_hours) {
        stats.total_work_hours += parseFloat(data.work_hours);
      }

      if (data.overtime_hours) {
        stats.total_overtime_hours += parseFloat(data.overtime_hours);
      }
    });

    // Round to 1 decimal place
    stats.total_work_hours = Math.round(stats.total_work_hours * 10) / 10;
    stats.total_overtime_hours = Math.round(stats.total_overtime_hours * 10) / 10;

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error('Error fetching attendance stats:', error);
    res.status(500).json({
      success: false,
      message: '获取考勤统计失败',
      error: error.message,
    });
  }
};

/**
 * Export attendance records to Excel
 * 导出考勤记录为Excel
 */
const exportAttendance = async (req, res) => {
  try {
    const {
      start_date,
      end_date,
      status,
      department_id,
      employee_id,
    } = req.query;

    // Build where clause with permission-based filtering
    let where = permissionService.applyDataScopeFilter(req.user, 'attendance', {});

    // Date range filter
    if (start_date && end_date) {
      where.date = {
        [Op.between]: [start_date, end_date],
      };
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Employee filter
    if (employee_id) {
      where.employee_id = employee_id;
    }

    // Build include
    const include = [
      {
        model: Employee,
        as: 'employee',
        attributes: ['employee_id', 'employee_number', 'email'],
        include: [
          {
            model: Department,
            as: 'department',
            attributes: ['department_id', 'name', 'code'],
          },
        ],
      },
    ];

    // Department filter
    if (department_id && req.user.data_scope === 'all') {
      include[0].where = { department_id };
    }

    const attendanceRecords = await Attendance.findAll({
      where,
      include,
      order: [['date', 'DESC']],
    });

    // Process data
    const canViewSensitive = permissionService.canViewSensitiveData(req.user);
    const processedData = attendanceRecords.map(attendance => {
      const record = attendance.toJSON();

      if (record.employee) {
        record.employee = permissionService.processSensitiveFields(
          record.employee,
          canViewSensitive,
          'mask'
        );
      }

      return record;
    });

    // TODO: Implement Excel export using xlsx library
    // For now, return JSON
    res.json({
      success: true,
      data: processedData,
      message: 'Excel export not yet implemented',
    });
  } catch (error) {
    console.error('Error exporting attendance:', error);
    res.status(500).json({
      success: false,
      message: '导出考勤记录失败',
      error: error.message,
    });
  }
};

module.exports = {
  getAttendanceList,
  getAttendanceById,
  getAttendanceStats,
  exportAttendance,
};
