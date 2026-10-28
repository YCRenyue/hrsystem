/**
 * HR Notifier - 入职、合同到期、考勤异常相关的站内通知
 *
 *  - 新员工提交入职登记表：提醒 HR 核对
 *  - 劳动合同即将到期：提醒 HR 办理续签
 *  - 导入考勤后的旷工和"已请假但当天有打卡"：提醒员工本人和部门负责人
 *
 * 只写站内通知（铃铛），失败只记录日志，不影响业务流程本身。
 */

const { User } = require('../models');
const inAppNotification = require('./InAppNotificationService');
const logger = require('../utils/logger');

const nameOf = (employee) => (
  typeof employee.getName === 'function' ? employee.getName() : '员工'
);

/**
 * 提醒 HR：新员工已提交入职登记表
 *
 * @param {Object} employee - Employee 实例
 */
const notifyHrOnboardingSubmitted = async (employee) => {
  try {
    const hrIds = await inAppNotification.getHrApproverUserIds();
    await inAppNotification.sendToMany(hrIds, {
      type: inAppNotification.NotificationTypes.ONBOARDING_SUBMITTED,
      title: '入职登记表已提交',
      content: `${nameOf(employee)}（${employee.employee_number}）已提交入职登记表，请核对个人信息。`,
      relatedResource: 'employee',
      relatedId: employee.employee_id,
      linkUrl: `/employees/${employee.employee_id}`
    });
  } catch (err) {
    logger.error('[hrNotifier.onboarding] failed', { error: err.message });
  }
};

/**
 * 提醒 HR：员工劳动合同即将到期
 *
 * @param {Object} employee - Employee 实例
 * @param {number} daysUntilExpiry
 */
const notifyHrContractExpiring = async (employee, daysUntilExpiry) => {
  try {
    const hrIds = await inAppNotification.getHrApproverUserIds();
    await inAppNotification.sendToMany(hrIds, {
      type: inAppNotification.NotificationTypes.CONTRACT_EXPIRING,
      title: '劳动合同即将到期',
      content: `${nameOf(employee)}（${employee.employee_number}）的劳动合同将在 `
        + `${daysUntilExpiry} 天后（${employee.contract_expiry_date}）到期，请及时办理续签。`,
      relatedResource: 'employee',
      relatedId: employee.employee_id,
      linkUrl: `/employees/${employee.employee_id}`
    });
  } catch (err) {
    logger.error('[hrNotifier.contract] failed', { error: err.message });
  }
};

/**
 * 一位员工的考勤提醒正文，例如"旷工：2026-03-02、2026-03-03"
 *
 * @param {{absentDates:string[], leavePunchDates:string[]}} alert
 * @returns {string[]}
 */
const describeAlert = ({ absentDates, leavePunchDates }) => {
  const lines = [];
  if (absentDates.length > 0) {
    lines.push(`旷工（未请假也未打卡）：${absentDates.join('、')}`);
  }
  if (leavePunchDates.length > 0) {
    lines.push(`已请假但当天有打卡：${leavePunchDates.join('、')}`);
  }
  return lines;
};

const findDepartmentManagerIds = async (departmentId) => {
  if (!departmentId) return [];
  const managers = await User.findAll({
    where: {
      role: 'department_manager',
      department_id: departmentId,
      is_active: true
    },
    attributes: ['user_id']
  });
  return managers.map((m) => m.user_id);
};

const sendEmployeeAlert = async (alert) => {
  const user = await User.findOne({
    where: { employee_id: alert.employee.employee_id },
    attributes: ['user_id']
  });
  if (!user) return;
  await inAppNotification.send({
    recipientUserId: user.user_id,
    type: inAppNotification.NotificationTypes.ATTENDANCE_ALERT,
    title: '考勤异常提醒',
    content: `${describeAlert(alert).join('\n')}\n如有疑问请联系 HR，需要补请假的请及时提交。`,
    relatedResource: 'attendance',
    relatedId: alert.employee.employee_id,
    linkUrl: '/leaves'
  });
};

/**
 * 导入考勤后提醒员工本人和部门负责人：旷工、已请假但当天有打卡。
 * 每位员工一条，每个部门负责人一条本部门汇总。
 *
 * @param {Array<{employee:Object, absentDates:string[], leavePunchDates:string[]}>} alerts
 */
const notifyAttendanceAlerts = async (alerts) => {
  const byDepartment = new Map();
  for (const alert of alerts) {
    try {
      // eslint-disable-next-line no-await-in-loop -- few employees per import; keeps DB load low
      await sendEmployeeAlert(alert);
    } catch (err) {
      logger.error('[hrNotifier.attendance] employee alert failed', { error: err.message });
    }
    const deptId = alert.employee.department_id;
    if (!byDepartment.has(deptId)) byDepartment.set(deptId, []);
    byDepartment.get(deptId).push(alert);
  }

  for (const [deptId, deptAlerts] of byDepartment) {
    try {
      // eslint-disable-next-line no-await-in-loop -- one query per department
      const managerIds = await findDepartmentManagerIds(deptId);
      const lines = deptAlerts.map((a) => `${nameOf(a.employee)}：${describeAlert(a).join('；')}`);
      // eslint-disable-next-line no-await-in-loop -- one batch per department
      await inAppNotification.sendToMany(managerIds, {
        type: inAppNotification.NotificationTypes.ATTENDANCE_ALERT,
        title: `本部门考勤异常 ${deptAlerts.length} 人`,
        content: lines.join('\n'),
        relatedResource: 'attendance',
        relatedId: deptId,
        linkUrl: '/attendance'
      });
    } catch (err) {
      logger.error('[hrNotifier.attendance] manager alert failed', { error: err.message });
    }
  }
};

module.exports = {
  notifyHrOnboardingSubmitted,
  notifyHrContractExpiring,
  notifyAttendanceAlerts,
  _internal: { describeAlert }
};
