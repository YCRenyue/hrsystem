/**
 * Leave Controller - 请假管理
 */

const { Op } = require('sequelize');
const {
  Leave, Employee, Department, User, sequelize
} = require('../models');
const permissionService = require('../services/PermissionService');
const ExcelService = require('../services/ExcelService');
const { ValidationError } = require('../middleware/errorHandler');

/**
 * 请假类型映射
 */
const leaveTypeMap = {
  annual: '年假',
  sick: '病假',
  personal: '事假',
  compensatory: '调休',
  maternity: '产假',
  paternity: '陪产假',
  marriage: '婚假',
  bereavement: '丧假',
  unpaid: '无薪假',
  other: '其他'
};

/**
 * 请假类型中文转英文
 */
const leaveTypeReverseMap = {
  年假: 'annual',
  病假: 'sick',
  事假: 'personal',
  调休: 'compensatory',
  产假: 'maternity',
  陪产假: 'paternity',
  婚假: 'marriage',
  丧假: 'bereavement',
  无薪假: 'unpaid',
  其他: 'other'
};

/**
 * 审批状态映射
 */
const statusMap = {
  pending: '待审批',
  approved: '已批准',
  rejected: '已拒绝',
  cancelled: '已取消'
};

/**
 * 审批状态中文转英文
 */
const statusReverseMap = {
  待审批: 'pending',
  已批准: 'approved',
  已拒绝: 'rejected',
  已取消: 'cancelled'
};

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
      if (data.created_at instanceof Date) {
        data.created_at = row.created_at.toISOString();
      }
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

/**
 * Download leave Excel template
 */
const downloadTemplate = async (req, res) => {
  const columns = [
    { header: '员工编号', key: 'employee_number', width: 15 },
    {
      header: '请假类型',
      key: 'leave_type',
      width: 12,
      note: '可选值: 年假, 病假, 事假, 调休, 产假, 陪产假, 婚假, 丧假, 无薪假, 其他'
    },
    {
      header: '开始日期', key: 'start_date', width: 15, note: '格式: YYYY-MM-DD'
    },
    {
      header: '结束日期', key: 'end_date', width: 15, note: '格式: YYYY-MM-DD'
    },
    { header: '请假天数', key: 'days', width: 12 },
    { header: '请假原因', key: 'reason', width: 30 },
    {
      header: '审批状态',
      key: 'status',
      width: 12,
      note: '可选值: 待审批, 已批准, 已拒绝, 已取消 (默认: 待审批)'
    },
    { header: '审批意见', key: 'approval_notes', width: 30 }
  ];

  const sampleData = [
    {
      employee_number: 'EMP001',
      leave_type: '年假',
      start_date: '2025-01-15',
      end_date: '2025-01-17',
      days: 3,
      reason: '个人事务',
      status: '待审批',
      approval_notes: ''
    }
  ];

  const workbook = ExcelService.createTemplate(columns, sampleData);
  const filename = `leave_template_${new Date().toISOString().split('T')[0]}.xlsx`;

  await ExcelService.sendExcelResponse(res, workbook, filename);
};

/**
 * Import leave from Excel
 */
const importFromExcel = async (req, res) => {
  if (!req.file) {
    throw new ValidationError('No file uploaded');
  }

  const results = await ExcelService.importFromBuffer(
    req.file.buffer,
    async (row, _rowNum) => {
      const employeeNumber = ExcelService.getCellValue(row.getCell(1));
      const leaveTypeText = ExcelService.getCellValue(row.getCell(2));
      const startDate = ExcelService.parseExcelDate(row.getCell(3).value);
      const endDate = ExcelService.parseExcelDate(row.getCell(4).value);
      const days = ExcelService.getCellValue(row.getCell(5));
      const reason = ExcelService.getCellValue(row.getCell(6));
      const statusText = ExcelService.getCellValue(row.getCell(7));
      const approvalNotes = ExcelService.getCellValue(row.getCell(8));

      if (!employeeNumber) {
        throw new Error('员工编号为必填项');
      }

      if (!leaveTypeText) {
        throw new Error('请假类型为必填项');
      }

      if (!startDate || !endDate) {
        throw new Error('开始日期和结束日期为必填项');
      }

      if (!days) {
        throw new Error('请假天数为必填项');
      }

      // Find employee
      const employee = await Employee.findOne({
        where: { employee_number: employeeNumber }
      });

      if (!employee) {
        throw new Error(`员工 ${employeeNumber} 不存在`);
      }

      // Convert type and status text to enum values
      const leaveType = leaveTypeReverseMap[leaveTypeText] || 'other';
      const status = statusReverseMap[statusText] || 'pending';

      const data = {
        employee_id: employee.employee_id,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        days: parseFloat(days),
        reason: reason || null,
        status,
        approval_notes: approvalNotes || null,
        approved_at: (status === 'approved' || status === 'rejected') ? new Date() : null
      };

      await Leave.create(data);
    }
  );

  res.json({
    success: true,
    data: results
  });
};

/**
 * Export leave to Excel
 */
const exportToExcel = async (req, res) => {
  const {
    start_date, end_date, leave_type, status
  } = req.query;

  const where = {};
  if (leave_type) where.leave_type = leave_type;
  if (status) where.status = status;
  if (start_date && end_date) {
    where.start_date = { [Op.between]: [start_date, end_date] };
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
    },
    {
      model: User,
      as: 'approver',
      attributes: ['username'],
      required: false
    }
  ];

  const records = await Leave.findAll({
    where,
    include,
    order: [['created_at', 'DESC']]
  });

  const data = records.map((record) => ({
    employee_number: record.employee?.employee_number || '',
    employee_name: record.employee?.getName() || '',
    department_name: record.employee?.department?.name || '',
    leave_type: leaveTypeMap[record.leave_type] || record.leave_type,
    start_date: record.start_date,
    end_date: record.end_date,
    days: record.days,
    reason: record.reason || '',
    status: statusMap[record.status] || record.status,
    approver_name: record.approver?.username || '',
    approval_notes: record.approval_notes || '',
    approved_at: record.approved_at || '',
    created_at: record.created_at
  }));

  const columns = [
    { header: '员工编号', key: 'employee_number', width: 15 },
    { header: '姓名', key: 'employee_name', width: 12 },
    { header: '部门', key: 'department_name', width: 15 },
    { header: '请假类型', key: 'leave_type', width: 12 },
    { header: '开始日期', key: 'start_date', width: 15 },
    { header: '结束日期', key: 'end_date', width: 15 },
    { header: '请假天数', key: 'days', width: 12 },
    { header: '请假原因', key: 'reason', width: 30 },
    { header: '审批状态', key: 'status', width: 12 },
    { header: '审批人', key: 'approver_name', width: 12 },
    { header: '审批意见', key: 'approval_notes', width: 30 },
    { header: '审批时间', key: 'approved_at', width: 20 },
    { header: '申请时间', key: 'created_at', width: 20 }
  ];

  const workbook = await ExcelService.exportToExcel(data, columns, '请假记录');
  const filename = `leave_${new Date().toISOString().split('T')[0]}.xlsx`;

  await ExcelService.sendExcelResponse(res, workbook, filename);
};

module.exports = {
  createLeave,
  getLeaveList,
  getLeaveStats,
  updateLeave,
  deleteLeave,
  downloadTemplate,
  importFromExcel,
  exportToExcel
};
