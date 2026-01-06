/**
 * Attendance Controller - 考勤管理
 */

const { Op } = require('sequelize');
const {
  Attendance, Employee, Department, sequelize
} = require('../models');
const permissionService = require('../services/PermissionService');
const ExcelService = require('../services/ExcelService');
const { ValidationError } = require('../middleware/errorHandler');

/**
 * 考勤状态映射
 */
const statusMap = {
  normal: '正常',
  late: '迟到',
  early_leave: '早退',
  absent: '缺勤',
  leave: '请假',
  holiday: '节假日',
  weekend: '周末'
};

/**
 * 状态中文转英文
 */
const statusReverseMap = {
  正常: 'normal',
  迟到: 'late',
  早退: 'early_leave',
  缺勤: 'absent',
  请假: 'leave',
  节假日: 'holiday',
  周末: 'weekend'
};

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
        // Decrypt name using Employee model method
        if (row.employee && typeof row.employee.getName === 'function') {
          data.employee.name = row.employee.getName();
        }
        delete data.employee.name_encrypted;

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

/**
 * Download attendance Excel template
 */
const downloadTemplate = async (req, res) => {
  const columns = [
    { header: '员工编号', key: 'employee_number', width: 15 },
    {
      header: '日期', key: 'date', width: 15, note: '格式: YYYY-MM-DD'
    },
    {
      header: '签到时间', key: 'check_in_time', width: 12, note: '格式: HH:MM:SS'
    },
    {
      header: '签退时间', key: 'check_out_time', width: 12, note: '格式: HH:MM:SS'
    },
    {
      header: '状态',
      key: 'status',
      width: 10,
      note: '可选值: 正常, 迟到, 早退, 缺勤, 请假, 节假日, 周末'
    },
    { header: '迟到分钟', key: 'late_minutes', width: 12 },
    { header: '早退分钟', key: 'early_leave_minutes', width: 12 },
    {
      header: '工作时长', key: 'work_hours', width: 12, note: '单位: 小时'
    },
    {
      header: '加班时长', key: 'overtime_hours', width: 12, note: '单位: 小时'
    },
    { header: '打卡地点', key: 'location', width: 20 },
    { header: '备注', key: 'notes', width: 30 }
  ];

  const sampleData = [
    {
      employee_number: 'EMP001',
      date: '2025-01-15',
      check_in_time: '09:00:00',
      check_out_time: '18:00:00',
      status: '正常',
      late_minutes: 0,
      early_leave_minutes: 0,
      work_hours: 8,
      overtime_hours: 0,
      location: '公司总部',
      notes: '示例数据'
    }
  ];

  const workbook = ExcelService.createTemplate(columns, sampleData);
  const filename = `attendance_template_${new Date().toISOString().split('T')[0]}.xlsx`;

  await ExcelService.sendExcelResponse(res, workbook, filename);
};

/**
 * Import attendance from Excel
 */
const importFromExcel = async (req, res) => {
  if (!req.file) {
    throw new ValidationError('No file uploaded');
  }

  const results = await ExcelService.importFromBuffer(
    req.file.buffer,
    async (row, _rowNum) => {
      const employeeNumber = ExcelService.getCellValue(row.getCell(1));
      const date = ExcelService.parseExcelDate(row.getCell(2).value);
      const checkInTime = ExcelService.getCellValue(row.getCell(3));
      const checkOutTime = ExcelService.getCellValue(row.getCell(4));
      const statusText = ExcelService.getCellValue(row.getCell(5));
      const lateMinutes = ExcelService.getCellValue(row.getCell(6)) || 0;
      const earlyLeaveMinutes = ExcelService.getCellValue(row.getCell(7)) || 0;
      const workHours = ExcelService.getCellValue(row.getCell(8));
      const overtimeHours = ExcelService.getCellValue(row.getCell(9)) || 0;
      const location = ExcelService.getCellValue(row.getCell(10));
      const notes = ExcelService.getCellValue(row.getCell(11));

      if (!employeeNumber) {
        throw new Error('员工编号为必填项');
      }

      if (!date) {
        throw new Error('日期为必填项');
      }

      // Find employee
      const employee = await Employee.findOne({
        where: { employee_number: employeeNumber }
      });

      if (!employee) {
        throw new Error(`员工 ${employeeNumber} 不存在`);
      }

      // Convert status text to enum value
      const status = statusReverseMap[statusText] || 'normal';

      // Check for duplicate
      const existing = await Attendance.findOne({
        where: {
          employee_id: employee.employee_id,
          date
        }
      });

      const data = {
        employee_id: employee.employee_id,
        date,
        check_in_time: checkInTime || null,
        check_out_time: checkOutTime || null,
        status,
        late_minutes: parseInt(lateMinutes, 10) || 0,
        early_leave_minutes: parseInt(earlyLeaveMinutes, 10) || 0,
        work_hours: workHours ? parseFloat(workHours) : null,
        overtime_hours: parseFloat(overtimeHours) || 0,
        location: location || null,
        notes: notes || null
      };

      if (existing) {
        await existing.update(data);
      } else {
        await Attendance.create(data);
      }
    }
  );

  res.json({
    success: true,
    data: results
  });
};

/**
 * Export attendance to Excel
 */
const exportToExcel = async (req, res) => {
  const {
    start_date, end_date, status, department_id
  } = req.query;

  const where = {};
  if (status) where.status = status;
  if (start_date && end_date) {
    where.date = { [Op.between]: [start_date, end_date] };
  }

  const include = [
    {
      model: Employee,
      as: 'employee',
      attributes: ['employee_number', 'name_encrypted', 'department_id'],
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['name']
        }
      ]
    }
  ];

  if (department_id) {
    include[0].where = { department_id };
  }

  const records = await Attendance.findAll({
    where,
    include,
    order: [['date', 'DESC']]
  });

  const data = records.map((record) => ({
    employee_number: record.employee?.employee_number || '',
    employee_name: record.employee?.getName() || '',
    department_name: record.employee?.department?.name || '',
    date: record.date,
    check_in_time: record.check_in_time || '',
    check_out_time: record.check_out_time || '',
    status: statusMap[record.status] || record.status,
    late_minutes: record.late_minutes || 0,
    early_leave_minutes: record.early_leave_minutes || 0,
    work_hours: record.work_hours || '',
    overtime_hours: record.overtime_hours || 0,
    location: record.location || '',
    notes: record.notes || ''
  }));

  const columns = [
    { header: '员工编号', key: 'employee_number', width: 15 },
    { header: '姓名', key: 'employee_name', width: 12 },
    { header: '部门', key: 'department_name', width: 15 },
    { header: '日期', key: 'date', width: 15 },
    { header: '签到时间', key: 'check_in_time', width: 12 },
    { header: '签退时间', key: 'check_out_time', width: 12 },
    { header: '状态', key: 'status', width: 10 },
    { header: '迟到分钟', key: 'late_minutes', width: 12 },
    { header: '早退分钟', key: 'early_leave_minutes', width: 12 },
    { header: '工作时长', key: 'work_hours', width: 12 },
    { header: '加班时长', key: 'overtime_hours', width: 12 },
    { header: '打卡地点', key: 'location', width: 20 },
    { header: '备注', key: 'notes', width: 30 }
  ];

  const workbook = await ExcelService.exportToExcel(data, columns, '考勤记录');
  const filename = `attendance_${new Date().toISOString().split('T')[0]}.xlsx`;

  await ExcelService.sendExcelResponse(res, workbook, filename);
};

module.exports = {
  createAttendance,
  getAttendanceList,
  getAttendanceStats,
  updateAttendance,
  deleteAttendance,
  downloadTemplate,
  importFromExcel,
  exportToExcel
};
