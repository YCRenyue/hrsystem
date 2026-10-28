/**
 * Document Notifier - 制度确认、培训服务承诺函、劳动合同的站内通知
 *
 *  - 有文件待签署：提醒员工本人（建账号后的制度确认、HR 配置承诺函或合同后）
 *  - 员工签署完成：提醒 HR
 *
 * 通知失败只记录日志，不影响签署和配置流程本身。
 */

const inAppNotification = require('./InAppNotificationService');
const approvalService = require('./approvalService');
const logger = require('../utils/logger');

const DOCUMENT_LABELS = Object.freeze({
  policy_ack: '公司制度阅读确认表',
  training_pledge: '培训服务承诺函',
  employment_contract: '劳动合同'
});

/**
 * 提醒员工有文件待签署。已有同一份文件的未读提醒时不重复发送。
 *
 * @param {Object} params
 * @param {string} params.employeeId - 员工ID
 * @param {string} params.documentType - policy_ack / training_pledge / employment_contract
 * @param {string} [params.recipientUserId] - 已知员工账号时直接传入
 * @param {string} [params.senderUserId] - 配置人 user_id
 * @param {Object} [options]
 * @param {import('sequelize').Transaction} [options.transaction]
 */
const notifyDocumentToSign = async (params, options = {}) => {
  const { employeeId, documentType, senderUserId } = params;
  try {
    const recipientUserId = params.recipientUserId
      || await approvalService.findUserIdForEmployee(employeeId);
    if (!recipientUserId) return;
    const type = inAppNotification.NotificationTypes.DOCUMENT_TO_SIGN;
    const alreadyNotified = await inAppNotification.exists({
      recipientUserId, type, relatedResource: documentType, relatedId: employeeId, unreadOnly: true
    });
    if (alreadyNotified) return;
    const label = DOCUMENT_LABELS[documentType] || '文件';
    await inAppNotification.send({
      recipientUserId,
      senderUserId,
      type,
      title: `${label}待签署`,
      content: `请进入“制度确认”阅读《${label}》并完成签署。`,
      relatedResource: documentType,
      relatedId: employeeId,
      linkUrl: '/document-confirmations/my'
    }, options);
  } catch (err) {
    logger.error('[documentNotifier.toSign] failed', { error: err.message, documentType });
  }
};

/**
 * 提醒 HR：员工已签署某份文件
 *
 * @param {Object} employee - Employee 实例
 * @param {string} documentType
 * @param {string} senderUserId - 签署人 user_id
 */
const notifyDocumentSigned = async (employee, documentType, senderUserId) => {
  try {
    const employeeName = typeof employee.getName === 'function' ? employee.getName() : '员工';
    const label = DOCUMENT_LABELS[documentType] || '文件';
    const hrIds = await inAppNotification.getHrApproverUserIds();
    await inAppNotification.sendToMany(hrIds.filter((id) => id !== senderUserId), {
      senderUserId,
      type: inAppNotification.NotificationTypes.DOCUMENT_SIGNED,
      title: `${label}已签署`,
      content: `${employeeName}（${employee.employee_number}）已签署《${label}》。`,
      relatedResource: documentType,
      relatedId: employee.employee_id,
      linkUrl: '/document-confirmations'
    });
  } catch (err) {
    logger.error('[documentNotifier.signed] failed', { error: err.message, documentType });
  }
};

module.exports = {
  DOCUMENT_LABELS,
  notifyDocumentToSign,
  notifyDocumentSigned
};
