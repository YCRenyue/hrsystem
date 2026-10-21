/**
 * Punch Service - 打卡导入结果、工号对照表与异常打卡复核 API
 */
import apiClient from './api';

export type PunchDeviceType = 'attendance' | 'canteen';
export type AnomalyResolution = 'lunch' | 'dinner' | 'ignore';

export interface PunchEmployeeBrief {
  employee_id: string;
  employee_number: string | null;
  name: string | null;
  department_name: string | null;
  status?: string;
}

export interface PunchUnmatchedEntry {
  external_id: string;
  name: string;
  department?: string;
  punch_days: number;
  reason?: string;
}

export interface PunchAfterLeave {
  external_id: string;
  name: string;
  leave_date: string;
  dates: string[];
}

/** 两种导入结果共有的字段 */
export interface PunchImportResultBase {
  source_file: string | null;
  period: string;
  employees_total: number;
  matched: number;
  unmatched: PunchUnmatchedEntry[];
  ambiguous: PunchUnmatchedEntry[];
  manual_kept: number;
  punches_after_leave: PunchAfterLeave[];
}

export interface CanteenImportResult extends PunchImportResultBase {
  meals_created: number;
  meals_updated: number;
  meals_removed: number;
  duplicates_merged: number;
  anomalies_count: number;
  anomalies: Array<{
    name: string;
    external_id: string;
    date: string;
    time: string;
    reason: string;
  }>;
}

export interface AttendanceImportResult extends PunchImportResultBase {
  export_date: string | null;
  skipped_dates: string[];
  daily_created: number;
  daily_updated: number;
  summaries_created: number;
  summaries_updated: number;
  summary_warnings: Array<{
    external_id: string;
    name: string;
    machine_absent_days: number;
    workdays_without_punch: number;
  }>;
}

export interface PunchMapping {
  mapping_id: string;
  device_type: PunchDeviceType;
  external_id: string;
  external_name: string | null;
  employee: PunchEmployeeBrief | null;
  created_at: string;
}

export interface PunchAnomaly {
  anomaly_id: string;
  device_type: PunchDeviceType;
  external_id: string | null;
  punch_date: string;
  punch_time: string;
  reason: string;
  status: 'pending' | 'resolved';
  resolution: AnomalyResolution | null;
  resolved_at: string | null;
  employee: PunchEmployeeBrief | null;
}

/** 异常原因的中文说明 */
export const ANOMALY_REASON_LABELS: Record<string, string> = {
  outside_meal_window: '不在饭点',
  non_workday: '非工作日',
  on_leave_or_trip: '请假/出差期间',
};

export const punchService = {
  async listMappings(deviceType?: PunchDeviceType): Promise<PunchMapping[]> {
    const response = await apiClient.get('/punch/mappings', {
      params: deviceType ? { device_type: deviceType } : {},
    });
    return response.data.data;
  },

  async saveMapping(input: {
    device_type: PunchDeviceType;
    external_id: string;
    external_name?: string;
    employee_id: string;
  }): Promise<void> {
    await apiClient.post('/punch/mappings', input);
  },

  async deleteMapping(mappingId: string): Promise<void> {
    await apiClient.delete(`/punch/mappings/${mappingId}`);
  },

  async listAnomalies(params: {
    device_type?: PunchDeviceType;
    status?: 'pending' | 'resolved' | 'all';
    start_date?: string;
    end_date?: string;
  }): Promise<PunchAnomaly[]> {
    const response = await apiClient.get('/punch/anomalies', { params });
    return response.data.data;
  },

  async resolveAnomalies(
    ids: string[],
    resolution: AnomalyResolution
  ): Promise<{ resolved: number; skipped: number }> {
    const response = await apiClient.post('/punch/anomalies/resolve-batch', { ids, resolution });
    return response.data.data;
  },

  async listEmployeeOptions(): Promise<PunchEmployeeBrief[]> {
    const response = await apiClient.get('/punch/employee-options');
    return response.data.data;
  },
};
