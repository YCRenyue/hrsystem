/**
 * Reimbursement Service - 出差报销单 API 客户端
 */
import api from './api';

export type ReimbursementCategory =
  | 'transport'
  | 'accommodation'
  | 'meal'
  | 'local_transport'
  | 'other';

export interface ReimbursementItem {
  item_id?: string;
  category: ReimbursementCategory;
  amount: number;
  occurred_on: string;
  description?: string;
  invoice_key?: string;
  invoice_name?: string;
}

export interface ReimbursementSummary {
  reimbursement_id: string;
  reimbursement_number: string;
  employee_id: string;
  trip_id: string;
  total_amount: number;
  currency: string;
  status: string;
  submitted_at?: string;
  approved_at?: string;
  paid_at?: string;
  cancelled_at?: string;
  notes?: string;
  created_at: string;
  employee?: { employee_id: string; employee_number: string; name: string };
  trip?: {
    trip_id: string;
    trip_number: string;
    destination: string;
    start_datetime: string;
    end_datetime: string;
    status?: string;
  };
  approver?: { user_id: string; display_name: string };
}

export interface ReimbursementDetail extends ReimbursementSummary {
  approval_notes?: string;
  payment_reference?: string;
  cancellation_reason?: string;
  submitter?: { user_id: string; display_name: string };
  payer?: { user_id: string; display_name: string };
  canceller?: { user_id: string; display_name: string };
  items: ReimbursementItem[];
}

export interface ReimbursementLimits {
  daily_limits: { accommodation: number; meal: number };
  categories: ReimbursementCategory[];
}

export const reimbursementService = {
  async list(params: {
    page?: number;
    size?: number;
    status?: string;
    trip_id?: string;
    employee_id?: string;
    keyword?: string;
  } = {}) {
    const res = await api.get('/reimbursements', { params });
    return res.data;
  },

  async getLimits(): Promise<ReimbursementLimits> {
    const res = await api.get('/reimbursements/limits');
    return res.data.data;
  },

  async getById(id: string): Promise<ReimbursementDetail> {
    const res = await api.get(`/reimbursements/${id}`);
    return res.data.data;
  },

  async create(payload: {
    trip_id: string;
    employee_id?: string;
    items: ReimbursementItem[];
    notes?: string;
    submit?: boolean;
  }) {
    const res = await api.post('/reimbursements', payload);
    return res.data.data;
  },

  async update(id: string, payload: { items?: ReimbursementItem[]; notes?: string }) {
    const res = await api.put(`/reimbursements/${id}`, payload);
    return res.data.data;
  },

  async submit(id: string) {
    const res = await api.post(`/reimbursements/${id}/submit`);
    return res.data.data;
  },

  async approve(id: string, decision: 'approved' | 'rejected', notes?: string) {
    const res = await api.post(`/reimbursements/${id}/approve`, { decision, notes });
    return res.data.data;
  },

  async pay(id: string, paymentReference?: string) {
    const res = await api.post(`/reimbursements/${id}/pay`, {
      payment_reference: paymentReference,
    });
    return res.data.data;
  },

  async cancel(id: string, reason?: string) {
    const res = await api.post(`/reimbursements/${id}/cancel`, { reason });
    return res.data.data;
  },

  async remove(id: string) {
    const res = await api.delete(`/reimbursements/${id}`);
    return res.data;
  },

  async uploadInvoice(reimbursementId: string, file: File) {
    const form = new FormData();
    form.append('file', file);
    const res = await api.post(`/upload/reimbursement/${reimbursementId}/invoice`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data as {
      object_key: string;
      name: string;
      type: string;
      uploaded_at: string;
      url: string | null;
    };
  },
};

export default reimbursementService;
