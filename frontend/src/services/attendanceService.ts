/**
 * Attendance Service - API calls for attendance management
 */
import apiClient from './api';
import { ApiResponse } from '../types';

export interface Attendance {
  attendance_id: string;
  employee_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  morning_check_in?: string | null;
  morning_check_out?: string | null;
  afternoon_check_in?: string | null;
  afternoon_check_out?: string | null;
  overtime_check_in?: string | null;
  overtime_check_out?: string | null;
  status: 'normal' | 'late' | 'early_leave' | 'absent' | 'leave' | 'holiday' | 'weekend';
  late_minutes: number;
  early_leave_minutes: number;
  work_hours: number;
  overtime_hours: number;
  notes?: string;
  location?: string;
  device_info?: string;
  source?: string | null;
  created_at: string;
  updated_at: string;
  employee?: {
    employee_id: string;
    employee_number: string;
    name?: string;
    department?: {
      department_id: string;
      name: string;
    };
  };
}

export interface AttendanceSummaryRow {
  summary_id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  external_employee_number: string | null;
  absent_days: number | string;
  leave_days: number | string;
  business_trip_days: number | string;
  work_days: number | string;
  overtime_normal_hours: number | string;
  overtime_holiday_hours: number | string;
  late_count: number;
  late_minutes: number;
  early_leave_count: number;
  early_leave_minutes: number;
  source_file: string | null;
  imported_at: string | null;
  employee?: {
    employee_id: string;
    employee_number: string;
    name?: string | null;
    department?: { department_id: string; name: string } | null;
  };
}

export interface AttendanceReport {
  rows: AttendanceSummaryRow[];
  totals: {
    total_late_count: number;
    total_late_minutes: number;
    total_early_leave_count: number;
    total_early_leave_minutes: number;
    total_leave_days: number;
    total_absent_days: number;
    total_business_trip_days: number;
    total_overtime_hours: number;
    late_people_count: number;
    early_leave_people_count: number;
    leave_people_count: number;
  };
}

export interface CardImportResult {
  sheets_processed: number;
  employees_total: number;
  matched: number;
  daily_created: number;
  daily_updated: number;
  summaries_created: number;
  summaries_updated: number;
  unmatched: Array<{ sheet: string; name: string; external_id?: string }>;
  ambiguous: Array<{ sheet: string; name: string }>;
  periods: string[];
}

export interface AttendanceStats {
  totalRecords: number;
  attendanceRate: number;
  lateCount: number;
  absentCount: number;
  byStatus: Array<{
    status: string;
    count: number;
  }>;
}

export interface AttendanceListParams {
  page?: number;
  size?: number;
  employee_id?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  department_id?: string;
}

export interface AttendanceListResponse {
  rows: Attendance[];
  total: number;
  page: number;
  size: number;
}

export const attendanceService = {
  /**
   * Get attendance list with filters and pagination
   */
  async getList(params: AttendanceListParams): Promise<AttendanceListResponse> {
    const response = await apiClient.get<ApiResponse<AttendanceListResponse>>(
      '/attendances',
      { params }
    );
    return response.data.data!;
  },

  /**
   * Get attendance statistics
   */
  async getStats(params?: {
    start_date?: string;
    end_date?: string;
    department_id?: string;
  }): Promise<AttendanceStats> {
    const response = await apiClient.get<ApiResponse<AttendanceStats>>(
      '/attendances/stats',
      { params }
    );
    return response.data.data!;
  },

  /**
   * Create attendance record
   */
  async create(data: Partial<Attendance>): Promise<Attendance> {
    const response = await apiClient.post<ApiResponse<Attendance>>('/attendances', data);
    return response.data.data!;
  },

  /**
   * Update attendance record
   */
  async update(id: string, data: Partial<Attendance>): Promise<Attendance> {
    const response = await apiClient.put<ApiResponse<Attendance>>(
      `/attendances/${id}`,
      data
    );
    return response.data.data!;
  },

  /**
   * Delete attendance record
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/attendances/${id}`);
  },

  /**
   * Download Excel template
   */
  async downloadTemplate(): Promise<Blob> {
    const response = await apiClient.get('/attendances/template', {
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
    const response = await apiClient.post('/attendances/import', formData, {
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
    status?: string;
    department_id?: string;
  }): Promise<Blob> {
    const response = await apiClient.get('/attendances/export', {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  /**
   * Import 考勤卡表 Excel (multi-sheet, name-based matching)
   */
  async importCardExcel(file: File): Promise<CardImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/attendances/import-card', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.data;
  },

  /**
   * 考勤报表：按周期聚合数据
   */
  async getReport(params?: {
    period_start?: string;
    period_end?: string;
    department_id?: string;
  }): Promise<AttendanceReport> {
    const response = await apiClient.get<ApiResponse<AttendanceReport>>(
      '/attendances/report',
      { params }
    );
    return response.data.data!;
  }
};
