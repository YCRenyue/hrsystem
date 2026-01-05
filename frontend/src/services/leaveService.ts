/**
 * Leave Service - API calls for leave management
 */
import apiClient from './api';
import { ApiResponse } from '../types';

export interface Leave {
  leave_id: string;
  employee_id: string;
  leave_type: 'annual' | 'sick' | 'personal' | 'compensatory' | 'unpaid';
  start_date: string;
  end_date: string;
  days: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  approver_id?: string;
  approval_notes?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  employee?: {
    employee_id: string;
    employee_number: string;
    name_encrypted?: string;
    name_masked?: string;
    department?: {
      department_id: string;
      name: string;
    };
  };
  approver?: {
    user_id: string;
    username: string;
  };
}

export interface LeaveStats {
  totalApplications: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  byType: Array<{
    leave_type: string;
    count: number;
  }>;
  byStatus: Array<{
    status: string;
    count: number;
  }>;
}

export interface LeaveListParams {
  page?: number;
  size?: number;
  employee_id?: string;
  leave_type?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}

export interface LeaveListResponse {
  rows: Leave[];
  total: number;
  page: number;
  size: number;
}

export const leaveService = {
  /**
   * Get leave list with filters and pagination
   */
  async getList(params: LeaveListParams): Promise<LeaveListResponse> {
    const response = await apiClient.get<ApiResponse<LeaveListResponse>>(
      '/leaves',
      { params }
    );
    return response.data.data!;
  },

  /**
   * Get leave statistics
   */
  async getStats(params?: {
    start_date?: string;
    end_date?: string;
    department_id?: string;
  }): Promise<LeaveStats> {
    const response = await apiClient.get<ApiResponse<LeaveStats>>(
      '/leaves/stats',
      { params }
    );
    return response.data.data!;
  },

  /**
   * Create leave application
   */
  async create(data: Partial<Leave>): Promise<Leave> {
    const response = await apiClient.post<ApiResponse<Leave>>('/leaves', data);
    return response.data.data!;
  },

  /**
   * Update leave application
   */
  async update(id: string, data: Partial<Leave>): Promise<Leave> {
    const response = await apiClient.put<ApiResponse<Leave>>(
      `/leaves/${id}`,
      data
    );
    return response.data.data!;
  },

  /**
   * Approve leave application
   */
  async approve(id: string, approval_notes?: string): Promise<Leave> {
    const response = await apiClient.put<ApiResponse<Leave>>(
      `/leaves/${id}`,
      {
        status: 'approved',
        approval_notes,
        approved_at: new Date().toISOString()
      }
    );
    return response.data.data!;
  },

  /**
   * Reject leave application
   */
  async reject(id: string, approval_notes?: string): Promise<Leave> {
    const response = await apiClient.put<ApiResponse<Leave>>(
      `/leaves/${id}`,
      {
        status: 'rejected',
        approval_notes,
        approved_at: new Date().toISOString()
      }
    );
    return response.data.data!;
  },

  /**
   * Delete leave application
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/leaves/${id}`);
  },

  /**
   * Download Excel template
   */
  async downloadTemplate(): Promise<Blob> {
    const response = await apiClient.get('/leaves/template', {
      responseType: 'blob'
    });
    return response.data;
  },

  /**
   * Import from Excel
   */
  async importFromExcel(file: File): Promise<{
    success_count: number;
    error_count: number;
    errors: Array<{ row: number; message: string }>;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/leaves/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.data;
  },

  /**
   * Export to Excel
   */
  async exportToExcel(params?: {
    start_date?: string;
    end_date?: string;
    leave_type?: string;
    status?: string;
  }): Promise<Blob> {
    const response = await apiClient.get('/leaves/export', {
      params,
      responseType: 'blob'
    });
    return response.data;
  }
};
