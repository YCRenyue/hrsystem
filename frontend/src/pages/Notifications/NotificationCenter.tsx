/**
 * NotificationCenter - 通知中心整页视图
 * 路径：/notifications
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Card, List, Tag, Space, Button, Segmented, App, Empty,
} from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  notificationService,
  NotificationItem,
} from '../../services/notificationService';

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
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

const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationService.list({
        page,
        size: 20,
        unread_only: filter === 'unread',
      });
      setItems(res.data);
      setTotal(res.pagination.total);
    } catch {
      message.error('加载通知失败');
    } finally {
      setLoading(false);
    }
  }, [page, filter, message]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleClick = async (item: NotificationItem) => {
    if (!item.is_read) {
      try {
        await notificationService.markRead(item.notification_id);
      } catch {
        // 忽略
      }
    }
    if (item.link_url) navigate(item.link_url);
    else fetchData();
  };

  const handleMarkAll = async () => {
    try {
      const affected = await notificationService.markAllRead();
      message.success(`已将 ${affected} 条通知标记为已读`);
      fetchData();
    } catch {
      message.error('操作失败');
    }
  };

  return (
    <Card
      title="通知中心"
      extra={(
        <Space>
          <Segmented
            options={[
              { label: '全部', value: 'all' },
              { label: '未读', value: 'unread' },
            ]}
            value={filter}
            onChange={(v) => {
              setPage(1);
              setFilter(v as 'all' | 'unread');
            }}
          />
          <Button icon={<CheckOutlined />} onClick={handleMarkAll}>
            全部已读
          </Button>
        </Space>
      )}
    >
      {items.length === 0 && !loading ? (
        <Empty description="暂无通知" />
      ) : (
        <List
          loading={loading}
          dataSource={items}
          pagination={{
            current: page,
            pageSize: 20,
            total,
            onChange: setPage,
            showSizeChanger: false,
          }}
          renderItem={(item) => {
            const meta = TYPE_LABELS[item.type] || { label: item.type, color: 'default' };
            return (
              <List.Item
                style={{
                  cursor: 'pointer',
                  background: item.is_read ? 'transparent' : '#fafcff',
                  borderLeft: item.is_read ? '3px solid transparent' : '3px solid #1890ff',
                  paddingLeft: 12,
                }}
                onClick={() => handleClick(item)}
              >
                <List.Item.Meta
                  title={(
                    <Space>
                      <Tag color={meta.color}>{meta.label}</Tag>
                      <span style={{ fontWeight: item.is_read ? 400 : 600 }}>{item.title}</span>
                      {!item.is_read && <Tag color="red">新</Tag>}
                    </Space>
                  )}
                  description={(
                    <div>
                      <div
                        style={{
                          color: '#666',
                          whiteSpace: 'pre-wrap',
                          marginBottom: 4,
                        }}
                      >
                        {item.content || ''}
                      </div>
                      <div style={{ color: '#999', fontSize: 12 }}>
                        {item.sender?.display_name ? `来自：${item.sender.display_name} · ` : ''}
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
    </Card>
  );
};

export default NotificationCenter;
