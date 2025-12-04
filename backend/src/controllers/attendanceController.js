/**
 * Attendance Controller - 考勤管理
 */

const { Attendance, Employee, Department, sequelize } = require('../models');
const { Op } = require('sequelize');

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
        message: 'Employee ID and date are required'
      });
    }

    // Check for duplicate
    const existing = await Attendance.findOne({
      where: { employee_id, date }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Attendance record already exists for this date'
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

    res.status(201).json({
      success: true,
      message: 'Attendance record created successfully',
      data: attendance
    });
  } catch (error) {
    console.error('Error creating attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create attendance record'
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

    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;

    const where = {};
    if (employee_id) where.employee_id = employee_id;
    if (status) where.status = status;
    if (start_date && end_date) {
      where.date = {
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
      }
    ];

    if (department_id) {
      include[0].where = { department_id };
    }

    const { count, rows } = await Attendance.findAndCountAll({
      where,
      include,
      limit,
      offset,
      order: [['date', 'DESC']]
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
    console.error('Error getting attendances:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get attendance records'
    });
  }
};

/**
 * Get attendance statistics
 */
const getAttendanceStats = async (req, res) => {
  try {
    const { start_date, end_date, department_id } = req.query;

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
    const normalCount = byStatus.find(s => s.status === 'normal')?.count || 0;
    const attendanceRate = totalRecords > 0
      ? Math.round((normalCount / totalRecords) * 100)
      : 0;

    // Late count
    const lateCount = byStatus.find(s => s.status === 'late')?.count || 0;

    // Absent count
    const absentCount = byStatus.find(s => s.status === 'absent')?.count || 0;

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
      message: 'Failed to get attendance statistics'
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
        message: 'Attendance record not found'
      });
    }

    await attendance.update(updateData);

    res.json({
      success: true,
      message: 'Attendance record updated successfully',
      data: attendance
    });
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update attendance record'
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
        message: 'Attendance record not found'
      });
    }

    await attendance.destroy();

    res.json({
      success: true,
      message: 'Attendance record deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete attendance record'
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
