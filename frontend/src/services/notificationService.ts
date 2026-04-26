/**
 * Notification Service - 站内通知
 * 与右上角通知信箱组件配合使用，无需直接复用其他 service。
 */
import api from './api';

export interface NotificationItem {
  notification_id: string;
  type: string;
  title: string;
  content?: string;
  related_resource?: string;
  related_id?: string;
  link_url?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  sender?: { user_id: string; username: string; display_name: string } | null;
}

export interface NotificationListResponse {
  data: NotificationItem[];
  pagination: { total: number; page: number; size: number; totalPages: number };
}

export const notificationService = {
  async list(params: {
    page?: number;
    size?: number;
    unread_only?: boolean;
    type?: string;
  } = {}): Promise<NotificationListResponse> {
    const res = await api.get('/notifications', { params });
    return { data: res.data.data, pagination: res.data.pagination };
  },

  async unreadCount(): Promise<number> {
    const res = await api.get('/notifications/unread-count');
    return res.data?.data?.unread || 0;
  },

  async markRead(id: string): Promise<void> {
    await api.post(`/notifications/${id}/read`);
  },

  async markAllRead(): Promise<number> {
    const res = await api.post('/notifications/read-all');
    return res.data?.data?.affected || 0;
  },
};

export default notificationService;
