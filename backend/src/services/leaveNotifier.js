/**
 * Leave Notifier - 请假申请的站内通知（提交、部门审批通过待 HR 复核、审批结果）
 *
 * 通知失败只记录日志，不影响请假流程本身。
 */

const inAppNotification = require('./InAppNotificationService');
const { findUserIdForEmployee } = require('./approvalService');
const { getLeaveTypeLabel } = require('../constants/leaveTypes');
const { Employee } = require('../models');

/**
 * 通知审批人：有新的请假申请
 *
 * @param {Object} employee - 申请人（Employee 实例）
 * @param {Object} leave - 新建的请假记录
 * @param {string} senderUserId - 提交人 user_id
 */
const notifyApproversOnLeaveSubmit = async (employee, leave, senderUserId) => {
  try {
    const employeeName = typeof employee.getName === 'function' ? employee.getName() : '员工';
    const approverIds = await inAppNotification.getApproverUserIds({
      departmentId: employee.department_id
    });
    const reasonLine = leave.reason ? `事由：${leave.reason}` : '';
    await inAppNotification.sendToMany(approverIds, {
      senderUserId,
      type: inAppNotification.NotificationTypes.LEAVE_SUBMITTED,
      title: '新请假申请待审批',
      content: `${employeeName} 提交了请假申请\n类型：${getLeaveTypeLabel(leave.leave_type)}\n时间：${leave.start_date} 至 ${leave.end_date}\n天数：${leave.days}天\n${reasonLine}`,
      relatedResource: 'leave',
      relatedId: leave.leave_id,
      linkUrl: `/leaves?status=pending&highlight=${leave.leave_id}`
    });
  } catch (err) {
    console.error('[leave.create notify] failed:', err.message);
  }
};

/**
 * 通知 HR：请假申请已通过部门审批，等待 HR 复核
 *
 * @param {Object} leave - 请假记录
 * @param {string} senderUserId - 部门审批人 user_id
 */
const notifyHrForReview = async (leave, senderUserId) => {
  const hrApproverIds = await inAppNotification.getHrApproverUserIds();
  await inAppNotification.sendToMany(hrApproverIds, {
    senderUserId,
    type: inAppNotification.NotificationTypes.LEAVE_SUBMITTED,
    title: '请假申请待HR复核',
    content: `请假申请 ${leave.start_date} 至 ${leave.end_date} 已通过部门审批。`,
    relatedResource: 'leave',
    relatedId: leave.leave_id,
    linkUrl: `/leaves?status=pending&highlight=${leave.leave_id}`
  });
};

/**
 * 通知申请人：请假申请已批准或被拒绝
 *
 * @param {Object} leave - 请假记录
 * @param {boolean} approved - 是否批准
 * @param {string|null} notes - 审批意见
 * @param {string} senderUserId - 审批人 user_id
 */
const notifyApplicantOnLeaveDecision = async (leave, approved, notes, senderUserId) => {
  try {
    const recipientUserId = await findUserIdForEmployee(leave.employee_id);
    if (!recipientUserId) return;
    const result = approved ? '已批准。' : '被拒绝。';
    await inAppNotification.send({
      recipientUserId,
      senderUserId,
      type: approved
        ? inAppNotification.NotificationTypes.LEAVE_APPROVED
        : inAppNotification.NotificationTypes.LEAVE_REJECTED,
      title: approved ? '请假申请已批准' : '请假申请被拒绝',
      content: `请假时间 ${leave.start_date} 至 ${leave.end_date}（${leave.days}天）${result}${notes ? `\n审批意见：${notes}` : ''}`,
      relatedResource: 'leave',
      relatedId: leave.leave_id,
      linkUrl: `/leaves?highlight=${leave.leave_id}`
    });
  } catch (err) {
    console.error('[leave.update notify] failed:', err.message);
  }
};

/**
 * 请假撤销：申请人自己撤销时通知审批人，HR 或负责人撤销时通知申请人
 *
 * @param {Object} leave - 请假记录（撤销前已为待审批或已批准）
 * @param {string} cancellerUserId - 撤销人 user_id
 * @param {boolean} byApplicant - 是否申请人本人撤销
 */
const notifyOnLeaveCancelled = async (leave, cancellerUserId, byApplicant) => {
  try {
    const payload = {
      senderUserId: cancellerUserId,
      type: inAppNotification.NotificationTypes.LEAVE_CANCELLED,
      relatedResource: 'leave',
      relatedId: leave.leave_id,
      linkUrl: `/leaves?highlight=${leave.leave_id}`
    };
    const period = `${leave.start_date} 至 ${leave.end_date}（${leave.days}天）`;
    if (!byApplicant) {
      const recipientUserId = await findUserIdForEmployee(leave.employee_id);
      if (!recipientUserId) return;
      await inAppNotification.send({
        ...payload, recipientUserId, title: '请假已被撤销', content: `你的请假 ${period} 已被撤销。`
      });
      return;
    }
    const employee = await Employee.findByPk(leave.employee_id);
    const employeeName = employee && typeof employee.getName === 'function'
      ? employee.getName()
      : '员工';
    const approverIds = await inAppNotification.getApproverUserIds({
      departmentId: employee ? employee.department_id : null
    });
    await inAppNotification.sendToMany(approverIds.filter((id) => id !== cancellerUserId), {
      ...payload,
      title: '请假已撤销',
      content: `${employeeName} 撤销了请假 ${period}\n类型：${getLeaveTypeLabel(leave.leave_type)}`
    });
  } catch (err) {
    console.error('[leave.cancel notify] failed:', err.message);
  }
};

module.exports = {
  notifyApproversOnLeaveSubmit,
  notifyOnLeaveCancelled,
  notifyHrForReview,
  notifyApplicantOnLeaveDecision
};
