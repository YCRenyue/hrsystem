/**
 * Notification Model - 站内通知模型
 *
 * 用于网页右上角的通知信箱：审批提交、审批结果、撤销提醒、报销结果等。
 * 不再走钉钉，改为站内消息中心；后续如需扩展邮件/短信再叠加 NotificationService。
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Notification extends Model {
  /**
   * 标记为已读
   */
  async markRead() {
    if (this.is_read) return this;
    this.is_read = true;
    this.read_at = new Date();
    await this.save();
    return this;
  }
}

Notification.init(
  {
    notification_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: '通知ID'
    },
    recipient_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'user_id' },
      comment: '接收人用户ID'
    },
    sender_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'user_id' },
      comment: '发送人用户ID（系统自动时为空）'
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '通知类型'
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: '标题'
    },
    content: {
      type: DataTypes.TEXT,
      comment: '正文'
    },
    related_resource: {
      type: DataTypes.STRING(50),
      comment: '关联资源类型'
    },
    related_id: {
      type: DataTypes.STRING(36),
      comment: '关联资源ID'
    },
    link_url: {
      type: DataTypes.STRING(500),
      comment: '前端跳转路径'
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '是否已读'
    },
    read_at: {
      type: DataTypes.DATE,
      comment: '已读时间'
    }
  },
  {
    sequelize,
    modelName: 'Notification',
    tableName: 'notifications',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['recipient_user_id', 'is_read'], name: 'idx_notifications_recipient_unread' },
      { fields: ['created_at'], name: 'idx_notifications_created' },
      { fields: ['type'], name: 'idx_notifications_type' }
    ]
  }
);

module.exports = Notification;
