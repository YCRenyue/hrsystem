/**
 * Leave Excel Controller - 请假记录的 Excel 模板下载、导入、导出
 */

const { Op } = require('sequelize');
const {
  Leave, Employee, Department, User
} = require('../models');
const ExcelService = require('../services/ExcelService');
const { ValidationError } = require('../middleware/errorHandler');
const { formatLocalDate } = require('../utils/dateUtils');
const { getLeaveTypeLabel } = require('../constants/leaveTypes');

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
  const filename = `leave_template_${formatLocalDate(new Date())}.xlsx`;

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
    leave_type: getLeaveTypeLabel(record.leave_type),
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
  const filename = `leave_${formatLocalDate(new Date())}.xlsx`;

  await ExcelService.sendExcelResponse(res, workbook, filename);
};

module.exports = {
  downloadTemplate,
  importFromExcel,
  exportToExcel
};
