/**
 * Notification Controller - 站内通知 REST 接口
 *
 * 仅本人可读取本人的通知；审批/系统消息由后端服务调用 InAppNotificationService.send() 写入。
 */

const inAppNotification = require('../services/InAppNotificationService');
const { NotFoundError } = require('../middleware/errorHandler');

/**
 * GET /api/notifications
 *  Query: page, size, unread_only, type
 */
const listNotifications = async (req, res) => {
  const {
    page = 1, size = 20, unread_only: unreadOnly, type
  } = req.query;

  const result = await inAppNotification.list(req.user.user_id, {
    page: parseInt(page, 10),
    size: parseInt(size, 10),
    unreadOnly: unreadOnly === 'true' || unreadOnly === '1',
    type
  });

  return res.json({
    success: true,
    data: result.rows.map((n) => ({
      notification_id: n.notification_id,
      type: n.type,
      title: n.title,
      content: n.content,
      related_resource: n.related_resource,
      related_id: n.related_id,
      link_url: n.link_url,
      is_read: n.is_read,
      read_at: n.read_at,
      created_at: n.created_at,
      sender: n.sender
        ? {
          user_id: n.sender.user_id,
          username: n.sender.username,
          display_name: n.sender.display_name
        }
        : null
    })),
    pagination: {
      total: result.total,
      page: parseInt(page, 10),
      size: parseInt(size, 10),
      totalPages: Math.ceil(result.total / parseInt(size, 10))
    }
  });
};

/**
 * GET /api/notifications/unread-count
 */
const getUnreadCount = async (req, res) => {
  const count = await inAppNotification.unreadCount(req.user.user_id);
  return res.json({ success: true, data: { unread: count } });
};

/**
 * POST /api/notifications/:id/read
 */
const markRead = async (req, res) => {
  const updated = await inAppNotification.markRead(req.params.id, req.user.user_id);
  if (!updated) throw new NotFoundError('通知', req.params.id);
  return res.json({ success: true, data: { notification_id: updated.notification_id } });
};

/**
 * POST /api/notifications/read-all
 */
const markAllRead = async (req, res) => {
  const affected = await inAppNotification.markAllRead(req.user.user_id);
  return res.json({ success: true, data: { affected } });
};

module.exports = {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead
};
