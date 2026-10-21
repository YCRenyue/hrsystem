/**
 * Leave Controller - 请假管理
 */

const { Op } = require('sequelize');
const {
  Leave, Employee, Department, User, BusinessTrip, sequelize
} = require('../models');
const permissionService = require('../services/PermissionService');
const dataScopeService = require('../services/DataScopeService');
const leaveWorkflowService = require('../services/LeaveWorkflowService');
const inAppNotification = require('../services/InAppNotificationService');
const { getInitialApprovalStage, findUserIdForEmployee } = require('../services/approvalService');
const { ValidationError } = require('../middleware/errorHandler');

const APPROVAL_ROLES = ['admin', 'hr_admin', 'department_manager'];

/**
 * Create leave application
 *
 * 员工本人可提交（自动填入 employee_id）；管理者可代为创建。
 * 提交后向所有审批人（admin）推送站内通知。
 */
const createLeave = async (req, res) => {
  try {
    const {
      employee_id: bodyEmployeeId,
      leave_type,
      start_date,
      end_date,
      days,
      reason,
      attachment_url
    } = req.body;

    // 决定本次申请所属员工：管理者可指定，普通员工只能给自己提交
    const isManager = req.user.data_scope !== 'self' && req.user.role !== 'employee';
    let employeeId = bodyEmployeeId;
    if (!isManager) {
      if (!req.user.employee_id) {
        return res.status(403).json({
          success: false,
          message: '账号未关联员工，无法提交请假申请'
        });
      }
      employeeId = req.user.employee_id;
    } else if (!employeeId) {
      employeeId = req.user.employee_id;
    }

    if (!employeeId || !leave_type || !start_date || !end_date || !days) {
      return res.status(400).json({
        success: false,
        message: '员工ID、请假类型、日期和天数为必填项'
      });
    }

    const employee = await Employee.findByPk(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: '员工不存在' });
    }
    if (!(await dataScopeService.canAccessEmployee(req.user, employeeId))) {
      return res.status(403).json({ success: false, message: '无权为该员工提交申请' });
    }
    if (new Date(start_date) > new Date(end_date) || Number(days) <= 0) {
      return res.status(400).json({ success: false, message: '请假日期或天数无效' });
    }

    const [leaveConflict, tripConflict] = await Promise.all([
      Leave.count({
        where: {
          employee_id: employeeId,
          status: { [Op.in]: ['pending', 'approved'] },
          start_date: { [Op.lte]: end_date },
          end_date: { [Op.gte]: start_date }
        }
      }),
      BusinessTrip.count({
        where: {
          employee_id: employeeId,
          status: { [Op.in]: ['pending', 'approved', 'in_progress'] },
          start_datetime: { [Op.lte]: new Date(`${end_date}T23:59:59`) },
          end_datetime: { [Op.gte]: new Date(`${start_date}T00:00:00`) }
        }
      })
    ]);
    if (leaveConflict || tripConflict) {
      return res.status(409).json({ success: false, message: '该时段已有请假或出差申请' });
    }

    const leave = await Leave.create({
      employee_id: employeeId,
      leave_type,
      start_date,
      end_date,
      days,
      reason,
      status: 'pending',
      approval_stage: await getInitialApprovalStage(employee.department_id),
      attachment_url
    });

    // 推送通知给所有审批人（admin）
    try {
      const employeeName = employee && typeof employee.getName === 'function'
        ? employee.getName()
        : '员工';
      const approverIds = await inAppNotification.getApproverUserIds({
        departmentId: employee.department_id
      });
      await inAppNotification.sendToMany(approverIds, {
        senderUserId: req.user.user_id,
        type: inAppNotification.NotificationTypes.LEAVE_SUBMITTED,
        title: '新请假申请待审批',
        content: `${employeeName} 提交了请假申请\n类型：${leave_type}\n时间：${start_date} 至 ${end_date}\n天数：${days}天\n${reason ? `事由：${reason}` : ''}`,
        relatedResource: 'leave',
        relatedId: leave.leave_id,
        linkUrl: `/leaves?status=pending&highlight=${leave.leave_id}`
      });
    } catch (notifyErr) {
      console.error('[leave.create notify] failed:', notifyErr.message);
    }

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

    if (req.user.data_scope === 'department') {
      const employees = await Employee.findAll({
        where: { department_id: req.user.department_id },
        attributes: ['employee_id'],
        raw: true
      });
      where.employee_id = { [Op.in]: employees.map((item) => item.employee_id) };
    } else if (req.user.data_scope !== 'all') {
      where.employee_id = req.user.employee_id || null;
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
 *
 * 状态变更（approved/rejected）需要 admin 权限；记录审批人，并向申请人推送站内通知。
 */
const updateLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    const leave = await Leave.findByPk(id);
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: '请假记录不存在'
      });
    }

    const isApproval = updateData.status === 'approved' || updateData.status === 'rejected';
    const canAccess = await dataScopeService.canAccessEmployee(req.user, leave.employee_id);
    if (!canAccess) {
      return res.status(403).json({ success: false, message: '无权操作该请假申请' });
    }

    if (isApproval) {
      if (!APPROVAL_ROLES.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: '无审批权限'
        });
      }
      if (req.user.role !== 'admin' && req.user.employee_id === leave.employee_id) {
        return res.status(403).json({ success: false, message: '不能审批自己的申请' });
      }
      if (leave.status !== 'pending') {
        return res.status(400).json({ success: false, message: '仅待审批申请可审批' });
      }
      const isDepartmentStage = leave.approval_stage === 'department';
      const allowedRoles = isDepartmentStage
        ? ['admin', 'department_manager']
        : ['admin', 'hr_admin'];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: isDepartmentStage ? '当前需部门负责人审批' : '当前需HR审批'
        });
      }
      if (isDepartmentStage && updateData.status === 'approved') {
        await leave.update({
          approval_stage: 'hr',
          manager_approver_id: req.user.user_id,
          manager_approved_at: new Date(),
          manager_approval_notes: updateData.approval_notes || null
        });
        const hrApproverIds = await inAppNotification.getHrApproverUserIds();
        await inAppNotification.sendToMany(hrApproverIds, {
          senderUserId: req.user.user_id,
          type: inAppNotification.NotificationTypes.LEAVE_SUBMITTED,
          title: '请假申请待HR复核',
          content: `请假申请 ${leave.start_date} 至 ${leave.end_date} 已通过部门审批。`,
          relatedResource: 'leave',
          relatedId: leave.leave_id,
          linkUrl: `/leaves?status=pending&highlight=${leave.leave_id}`
        });
        return res.json({
          success: true,
          message: '部门审批已通过，等待HR复核',
          data: leave
        });
      }
    }

    if (updateData.status === 'approved') {
      await leaveWorkflowService.approve(leave, req.user, updateData.approval_notes);
    } else if (updateData.status === 'rejected') {
      await leave.update({
        status: 'rejected',
        approved_at: new Date(),
        approver_id: req.user.user_id,
        approval_notes: updateData.approval_notes || null
      });
    } else if (updateData.status === 'cancelled') {
      if (!['pending', 'approved'].includes(leave.status)) {
        return res.status(400).json({ success: false, message: '当前状态不可撤销' });
      }
      await sequelize.transaction((transaction) => (
        leaveWorkflowService.cancel(leave, transaction)
      ));
    } else {
      if (leave.status !== 'pending') {
        return res.status(400).json({ success: false, message: '仅待审批申请可修改' });
      }
      const allowed = ['leave_type', 'start_date', 'end_date', 'days', 'reason', 'attachment_url'];
      const editable = Object.fromEntries(
        Object.entries(updateData).filter(([key]) => allowed.includes(key))
      );
      await leave.update(editable);
    }

    // 审批通过/拒绝 → 通知申请人
    if (isApproval) {
      try {
        const recipientUserId = await findUserIdForEmployee(leave.employee_id);
        if (recipientUserId) {
          const approved = updateData.status === 'approved';
          await inAppNotification.send({
            recipientUserId,
            senderUserId: req.user.user_id,
            type: approved
              ? inAppNotification.NotificationTypes.LEAVE_APPROVED
              : inAppNotification.NotificationTypes.LEAVE_REJECTED,
            title: approved ? '请假申请已批准' : '请假申请被拒绝',
            content: `请假时间 ${leave.start_date} 至 ${leave.end_date}（${leave.days}天）${approved ? '已批准。' : '被拒绝。'}${updateData.approval_notes ? `\n审批意见：${updateData.approval_notes}` : ''}`,
            relatedResource: 'leave',
            relatedId: leave.leave_id,
            linkUrl: `/leaves?highlight=${leave.leave_id}`
          });
        }
      } catch (notifyErr) {
        console.error('[leave.update notify] failed:', notifyErr.message);
      }
    }

    return res.json({
      success: true,
      message: '请假申请更新成功',
      data: leave
    });
  } catch (error) {
    console.error('Error updating leave:', error);
    return res.status(error.statusCode || (error instanceof ValidationError ? 400 : 500)).json({
      success: false,
      message: error.statusCode || error instanceof ValidationError
        ? error.message
        : '更新请假申请失败'
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
