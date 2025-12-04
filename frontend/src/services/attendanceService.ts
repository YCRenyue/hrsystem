/**
 * Attendance Service
 * 考勤相关API服务
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export interface AttendanceRecord {
  attendance_id: string;
  employee_id: string;
  employee_number: string;
  employee_name: string;
  department_name: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: 'normal' | 'late' | 'early_leave' | 'absent' | 'leave' | 'holiday' | 'weekend';
  late_minutes: number;
  early_leave_minutes: number;
  work_hours: number | null;
  overtime_hours: number;
  location: string | null;
  device_info: string | null;
  notes: string | null;
}

export interface AttendanceQueryParams {
  page?: number;
  size?: number;
  start_date?: string;
  end_date?: string;
  status?: string;
  department_id?: string;
  employee_id?: string;
}

export interface AttendanceListResponse {
  success: boolean;
  data: AttendanceRecord[];
  pagination: {
    total: number;
    page: number;
    size: number;
    totalPages: number;
  };
  message?: string;
}

/**
 * 获取考勤记录列表
 */
export const getAttendanceList = async (
  params: AttendanceQueryParams
): Promise<AttendanceListResponse> => {
  const response = await axios.get(`${API_BASE_URL}/attendance`, {
    params,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return response.data;
};

/**
 * 获取单个考勤记录详情
 */
export const getAttendanceById = async (
  attendanceId: string
): Promise<{ success: boolean; data: AttendanceRecord; message?: string }> => {
  const response = await axios.get(`${API_BASE_URL}/attendance/${attendanceId}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return response.data;
};

/**
 * 导出考勤记录
 */
export const exportAttendance = async (params: AttendanceQueryParams): Promise<Blob> => {
  const response = await axios.get(`${API_BASE_URL}/attendance/export`, {
    params,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    responseType: 'blob',
  });
  return response.data;
};

/**
 * 获取员工考勤统计
 */
export const getAttendanceStats = async (
  employeeId: string,
  startDate: string,
  endDate: string
): Promise<{
  success: boolean;
  data: {
    total_days: number;
    normal_days: number;
    late_days: number;
    early_leave_days: number;
    absent_days: number;
    leave_days: number;
    total_work_hours: number;
    total_overtime_hours: number;
  };
  message?: string;
}> => {
  const response = await axios.get(`${API_BASE_URL}/attendance/stats/${employeeId}`, {
    params: { start_date: startDate, end_date: endDate },
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return response.data;
};

export default {
  getAttendanceList,
  getAttendanceById,
  exportAttendance,
  getAttendanceStats,
};
