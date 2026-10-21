/**
 * Business Trip Notifier - 出差申请的站内通知（提交、审批结果、撤销）
 */

const inAppNotification = require('./InAppNotificationService');
const { findUserIdForEmployee } = require('./approvalService');
const { formatLocalDateTime } = require('../utils/dateUtils');

const MANAGEMENT_ROLES = ['admin', 'hr_admin', 'department_manager'];

/**
 * 通知所有审批人：有新出差申请待审批
 */
const notifyApproversOnSubmit = async (trip, employee, submitterUserId) => {
  try {
    const approverIds = await inAppNotification.getApproverUserIds({
      departmentId: employee?.department_id
    });
    const employeeName = (employee && typeof employee.getName === 'function')
      ? employee.getName()
      : '员工';
    await inAppNotification.sendToMany(approverIds, {
      senderUserId: submitterUserId,
      type: inAppNotification.NotificationTypes.BUSINESS_TRIP_SUBMITTED,
      title: '新出差申请待审批',
      content: `${employeeName} 提交了出差申请 ${trip.trip_number}\n目的地：${trip.destination}\n时间：${formatLocalDateTime(trip.start_datetime)} 至 ${formatLocalDateTime(trip.end_datetime)}`,
      relatedResource: 'business_trip',
      relatedId: trip.trip_id,
      linkUrl: `/business-trips/${trip.trip_id}`
    });
  } catch (e) {
    // 通知失败不阻断业务流程
    // eslint-disable-next-line no-console
    console.error('[notifyApproversOnSubmit] failed:', e.message);
  }
};

/**
 * 通知申请人：审批结果
 */
const notifyApplicantOnApproval = async (trip, decision, approverUserId, notes) => {
  try {
    const recipientUserId = await findUserIdForEmployee(trip.employee_id);
    if (!recipientUserId) return;
    const isApproved = decision === 'approved';
    await inAppNotification.send({
      recipientUserId,
      senderUserId: approverUserId,
      type: isApproved
        ? inAppNotification.NotificationTypes.BUSINESS_TRIP_APPROVED
        : inAppNotification.NotificationTypes.BUSINESS_TRIP_REJECTED,
      title: isApproved ? '出差申请已批准' : '出差申请被拒绝',
      content: `出差单 ${trip.trip_number} ${isApproved ? '已批准，请按计划出行；考勤已自动同步为出差状态。' : '被拒绝。'}${notes ? `\n审批意见：${notes}` : ''}`,
      relatedResource: 'business_trip',
      relatedId: trip.trip_id,
      linkUrl: `/business-trips/${trip.trip_id}`
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[notifyApplicantOnApproval] failed:', e.message);
  }
};

/**
 * 通知相关方：申请被撤销
 *  - 申请人撤销 → 通知审批人/原审批人
 *  - 管理者撤销 → 通知申请人
 */
const notifyOnCancel = async (trip, cancellerRole, cancellerUserId, employee) => {
  try {
    if (MANAGEMENT_ROLES.includes(cancellerRole)) {
      const recipientUserId = await findUserIdForEmployee(trip.employee_id);
      if (recipientUserId) {
        await inAppNotification.send({
          recipientUserId,
          senderUserId: cancellerUserId,
          type: inAppNotification.NotificationTypes.BUSINESS_TRIP_CANCELLED,
          title: '出差申请已被撤销',
          content: `出差单 ${trip.trip_number} 已被管理员撤销。${trip.cancellation_reason ? `原因：${trip.cancellation_reason}` : ''}`,
          relatedResource: 'business_trip',
          relatedId: trip.trip_id,
          linkUrl: `/business-trips/${trip.trip_id}`
        });
      }
    } else {
      const approverIds = await inAppNotification.getApproverUserIds({
        departmentId: employee?.department_id
      });
      const employeeName = (employee && typeof employee.getName === 'function')
        ? employee.getName()
        : '员工';
      await inAppNotification.sendToMany(approverIds, {
        senderUserId: cancellerUserId,
        type: inAppNotification.NotificationTypes.BUSINESS_TRIP_CANCELLED,
        title: '员工撤销出差申请',
        content: `${employeeName} 撤销了出差单 ${trip.trip_number}${trip.cancellation_reason ? `，原因：${trip.cancellation_reason}` : ''}`,
        relatedResource: 'business_trip',
        relatedId: trip.trip_id,
        linkUrl: `/business-trips/${trip.trip_id}`
      });
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[notifyOnCancel] failed:', e.message);
  }
};

module.exports = {
  notifyApproversOnSubmit,
  notifyApplicantOnApproval,
  notifyOnCancel
};
