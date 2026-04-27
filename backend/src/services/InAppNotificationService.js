/**
 * InAppNotificationService
 *
 * 站内通知（网页右上角通知信箱）的发送和查询入口。
 * 第二期所有审批流转、报销结果、缺打卡提醒等都通过该服务投递。
 *
 * 与 NotificationService（钉钉/邮件）解耦：本服务只写数据库，前端轮询读取。
 */

const {
  Notification,
  User
} = require('../models');
const logger = require('../utils/logger');

/**
 * 通知类型常量
 */
const NotificationTypes = Object.freeze({
  // 出差
  BUSINESS_TRIP_SUBMITTED: 'business_trip_submitted',
  BUSINESS_TRIP_APPROVED: 'business_trip_approved',
  BUSINESS_TRIP_REJECTED: 'business_trip_rejected',
  BUSINESS_TRIP_CANCELLED: 'business_trip_cancelled',
  // 请假
  LEAVE_SUBMITTED: 'leave_submitted',
  LEAVE_APPROVED: 'leave_approved',
  LEAVE_REJECTED: 'leave_rejected',
  LEAVE_CANCELLED: 'leave_cancelled',
  // 报销
  REIMBURSEMENT_SUBMITTED: 'reimbursement_submitted',
  REIMBURSEMENT_APPROVED: 'reimbursement_approved',
  REIMBURSEMENT_REJECTED: 'reimbursement_rejected',
  REIMBURSEMENT_PAID: 'reimbursement_paid',
  REIMBURSEMENT_CANCELLED: 'reimbursement_cancelled',
  // 水印打卡
  WATERMARK_MISSING: 'watermark_missing'
});

/**
 * 发送一条站内通知
 *
 * @param {Object} payload
 * @param {string} payload.recipientUserId - 接收人用户ID
 * @param {string} [payload.senderUserId] - 发送人（可空）
 * @param {string} payload.type - 通知类型
 * @param {string} payload.title - 标题
 * @param {string} [payload.content] - 正文
 * @param {string} [payload.relatedResource] - business_trip / reimbursement / attendance
 * @param {string} [payload.relatedId]
 * @param {string} [payload.linkUrl]
 * @param {Object} [options]
 * @param {import('sequelize').Transaction} [options.transaction]
 * @returns {Promise<Notification>}
 */
const send = async (payload, options = {}) => {
  const {
    recipientUserId,
    senderUserId,
    type,
    title,
    content,
    relatedResource,
    relatedId,
    linkUrl
  } = payload;

  if (!recipientUserId || !type || !title) {
    logger.warn('[InAppNotification] 缺少必要字段，跳过', { recipientUserId, type, title });
    return null;
  }

  const notification = await Notification.create(
    {
      recipient_user_id: recipientUserId,
      sender_user_id: senderUserId || null,
      type,
      title,
      content: content || null,
      related_resource: relatedResource || null,
      related_id: relatedId || null,
      link_url: linkUrl || null
    },
    { transaction: options.transaction }
  );

  logger.info(`[InAppNotification] sent ${type} -> user ${recipientUserId}`);
  return notification;
};

/**
 * 批量给一组用户发同样的通知（用于通知所有审批人）
 *
 * @param {string[]} recipientUserIds
 * @param {Object} payload - 与 send 相同（去掉 recipientUserId）
 * @param {Object} [options]
 */
const sendToMany = async (recipientUserIds, payload, options = {}) => {
  const unique = Array.from(new Set(recipientUserIds.filter(Boolean)));
  if (unique.length === 0) return [];
  return Promise.all(
    unique.map((uid) => send({ ...payload, recipientUserId: uid }, options))
  );
};

/**
 * 查询所有审批人用户ID。
 * 当前阶段：审批工作流统一为 admin 审批；之后再扩展为多级（员工-经理-admin）。
 *
 * @param {Object} [filters] - 预留扩展（departmentId 等），目前忽略
 * @returns {Promise<string[]>}
 */
// eslint-disable-next-line no-unused-vars
const getApproverUserIds = async (filters = {}) => {
  const all = await User.findAll({
    where: {
      is_active: true,
      status: 'active',
      role: 'admin'
    },
    attributes: ['user_id']
  });
  return all.map((u) => u.user_id);
};

/**
 * 查询所有"财务/报销审核人"的用户ID列表。
 * 当前阶段：财务角色复用 admin。
 *
 * @returns {Promise<string[]>}
 */
const getFinanceUserIds = async () => {
  const users = await User.findAll({
    where: {
      is_active: true,
      status: 'active',
      role: 'admin'
    },
    attributes: ['user_id']
  });
  return users.map((u) => u.user_id);
};

/**
 * 查询当前用户的通知列表（分页）
 *
 * @param {string} userId
 * @param {Object} [opts]
 * @param {number} [opts.page=1]
 * @param {number} [opts.size=20]
 * @param {boolean} [opts.unreadOnly=false]
 * @param {string} [opts.type]
 */
const list = async (userId, opts = {}) => {
  const {
    page = 1, size = 20, unreadOnly = false, type
  } = opts;

  const limit = Math.max(1, parseInt(size, 10));
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * limit;

  const where = { recipient_user_id: userId };
  if (unreadOnly) where.is_read = false;
  if (type) where.type = type;

  const { count, rows } = await Notification.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'sender',
        attributes: ['user_id', 'username', 'display_name'],
        required: false
      }
    ],
    limit,
    offset,
    order: [['created_at', 'DESC']]
  });

  return { total: count, rows };
};

/**
 * 当前用户未读数
 */
const unreadCount = async (userId) => Notification.count({
  where: { recipient_user_id: userId, is_read: false }
});

/**
 * 标记单条已读
 */
const markRead = async (notificationId, userId) => {
  const record = await Notification.findOne({
    where: { notification_id: notificationId, recipient_user_id: userId }
  });
  if (!record) return null;
  return record.markRead();
};

/**
 * 全部标记已读
 */
const markAllRead = async (userId) => {
  const [affected] = await Notification.update(
    { is_read: true, read_at: new Date() },
    { where: { recipient_user_id: userId, is_read: false } }
  );
  return affected;
};

module.exports = {
  NotificationTypes,
  send,
  sendToMany,
  getApproverUserIds,
  getFinanceUserIds,
  list,
  unreadCount,
  markRead,
  markAllRead
};
