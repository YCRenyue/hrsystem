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

/** 通知类型对应的标签文字和颜色（铃铛和通知中心共用） */
export const NOTIFICATION_TYPE_LABELS: Record<string, { label: string; color: string }> = {
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
  reimbursement_reminder: { label: '待报销', color: 'gold' },
  watermark_missing: { label: '缺打卡提醒', color: 'gold' },
  document_to_sign: { label: '待签署', color: 'orange' },
  document_signed: { label: '已签署', color: 'green' },
  onboarding_submitted: { label: '入职登记', color: 'blue' },
  contract_expiring: { label: '合同到期', color: 'gold' },
  attendance_alert: { label: '考勤异常', color: 'red' },
};

/** 已读状态变化时派发的窗口事件，右上角铃铛据此刷新未读数 */
export const NOTIFICATIONS_CHANGED_EVENT = 'notifications:changed';

const emitChanged = () => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));

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
    emitChanged();
  },

  async markAllRead(): Promise<number> {
    const res = await api.post('/notifications/read-all');
    emitChanged();
    return res.data?.data?.affected || 0;
  },
};

export default notificationService;
