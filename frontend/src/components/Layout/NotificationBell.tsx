/**
 * NotificationBell - 右上角通知信箱
 *
 * 功能：
 *  - 红色徽章显示未读数（每 60 秒轮询一次）
 *  - 点击展开 Popover，显示最新 10 条
 *  - 点击单条标记已读并跳转到 link_url
 *  - 顶部"全部已读"按钮
 *  - 底部"查看全部"跳转 /notifications
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Badge, Popover, List, Button, Space, Tag, Empty, Spin,
} from 'antd';
import { BellOutlined, CheckOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  notificationService,
  NotificationItem,
} from '../../services/notificationService';

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  leave_submitted: { label: '请假待审批', color: 'orange' },
  leave_approved: { label: '请假已批准', color: 'blue' },
  leave_rejected: { label: '请假被拒绝', color: 'red' },
  leave_cancelled: { label: '请假已撤销', color: 'default' },
  business_trip_submitted: { label: '出差待审批', color: 'orange' },
  business_trip_approved: { label: '出差已批准', color: 'blue' },
  business_trip_rejected: { label: '出差被拒绝', color: 'red' },
  business_trip_cancelled: { label: '出差已撤销', color: 'default' },
  reimbursement_submitted: { label: '报销待审核', color: 'orange' },
  reimbursement_approved: { label: '报销已通过', color: 'blue' },
  reimbursement_rejected: { label: '报销被驳回', color: 'red' },
  reimbursement_paid: { label: '报销已发放', color: 'green' },
  reimbursement_cancelled: { label: '报销已撤销', color: 'default' },
  watermark_missing: { label: '缺打卡提醒', color: 'gold' },
};

const POLL_INTERVAL_MS = 60000;

const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshUnread = useCallback(async () => {
    try {
      const count = await notificationService.unreadCount();
      setUnread(count);
    } catch {
      // 静默失败 - 通知信箱不应阻断主流程
    }
  }, []);

  const refreshList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationService.list({ page: 1, size: 10 });
      setItems(res.data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始拉一次未读数 + 定时轮询
  useEffect(() => {
    refreshUnread();
    const timer = setInterval(refreshUnread, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refreshUnread]);

  // 打开抽屉时拉最新 10 条
  useEffect(() => {
    if (open) refreshList();
  }, [open, refreshList]);

  const handleItemClick = async (item: NotificationItem) => {
    setOpen(false);
    if (!item.is_read) {
      try {
        await notificationService.markRead(item.notification_id);
        refreshUnread();
      } catch {
        // 忽略
      }
    }
    if (item.link_url) {
      navigate(item.link_url);
    }
  };

  const handleMarkAll = async () => {
    try {
      await notificationService.markAllRead();
      await Promise.all([refreshUnread(), refreshList()]);
    } catch {
      // 忽略
    }
  };

  const popoverContent = (
    <div style={{ width: 360 }}>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontWeight: 500 }}>通知信箱</span>
        <Space>
          <Button
            size="small"
            type="link"
            icon={<CheckOutlined />}
            onClick={handleMarkAll}
            disabled={unread === 0}
          >
            全部已读
          </Button>
        </Space>
      </Space>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      ) : items.length === 0 ? (
        <Empty description="暂无通知" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          size="small"
          dataSource={items}
          renderItem={(item) => {
            const meta = TYPE_LABELS[item.type] || { label: item.type, color: 'default' };
            return (
              <List.Item
                style={{
                  cursor: 'pointer',
                  background: item.is_read ? 'transparent' : '#e6f4ff',
                  padding: '8px 12px',
                  borderRadius: 4,
                }}
                onClick={() => handleItemClick(item)}
              >
                <List.Item.Meta
                  title={(
                    <Space>
                      <Tag color={meta.color}>{meta.label}</Tag>
                      <span style={{ fontWeight: item.is_read ? 400 : 600 }}>
                        {item.title}
                      </span>
                    </Space>
                  )}
                  description={(
                    <div>
                      <div
                        style={{
                          color: '#666',
                          whiteSpace: 'pre-wrap',
                          fontSize: 12,
                        }}
                      >
                        {item.content && item.content.length > 80
                          ? `${item.content.slice(0, 80)}…`
                          : item.content}
                      </div>
                      <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                        {dayjs(item.created_at).format('YYYY-MM-DD HH:mm')}
                      </div>
                    </div>
                  )}
                />
              </List.Item>
            );
          }}
        />
      )}

      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <Button
          type="link"
          size="small"
          onClick={() => {
            setOpen(false);
            navigate('/notifications');
          }}
        >
          查看全部
        </Button>
      </div>
    </div>
  );

  return (
    <Popover
      content={popoverContent}
      trigger="click"
      placement="bottomRight"
      open={open}
      onOpenChange={setOpen}
    >
      <Badge count={unread} overflowCount={99} offset={[-2, 4]}>
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: 18 }} />}
          aria-label="通知信箱"
        />
      </Badge>
    </Popover>
  );
};

export default NotificationBell;
