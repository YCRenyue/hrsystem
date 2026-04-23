/**
 * Canteen Service - 食堂报表与导入 API
 */
import apiClient from './api';
import { ApiResponse } from '../types';

export interface CanteenDailyBucket {
  date: string;
  lunch: number;
  dinner: number;
}

export interface CanteenWeeklyBucket {
  week_start: string;
  week_end: string;
  lunch: number;
  dinner: number;
}

export interface CanteenPerEmployee {
  employee_id: string;
  employee_number: string | null;
  name: string | null;
  department_name: string | null;
  lunch: number;
  dinner: number;
  total: number;
}

export interface CanteenReport {
  daily: CanteenDailyBucket[];
  weekly: CanteenWeeklyBucket[];
  per_employee: CanteenPerEmployee[];
  totals: {
    total_lunch: number;
    total_dinner: number;
    total_meals: number;
    unique_employees: number;
    days_covered: number;
  };
}

export interface CanteenEmployeeDetailRow {
  date: string;
  breakfast_time: string | null;
  lunch_time: string | null;
  dinner_time: string | null;
}

export interface CanteenEmployeeDetail {
  rows: CanteenEmployeeDetailRow[];
  totals: {
    lunch_count: number;
    dinner_count: number;
    total_meals: number;
    days_covered: number;
  };
}

export interface CanteenImportResult {
  sheets_processed: number;
  employees_total: number;
  matched: number;
  meals_created: number;
  meals_updated: number;
  periods: string[];
  unmatched: Array<{ sheet: string; name: string; external_id?: string }>;
  ambiguous: Array<{ sheet: string; name: string }>;
}

export const canteenService = {
  async getReport(params?: {
    start_date?: string;
    end_date?: string;
    department_id?: string;
  }): Promise<CanteenReport> {
    const response = await apiClient.get<ApiResponse<CanteenReport>>(
      '/canteen-meals/report',
      { params }
    );
    return response.data.data!;
  },

  async getEmployeeDetail(
    employeeId: string,
    params?: { start_date?: string; end_date?: string }
  ): Promise<CanteenEmployeeDetail> {
    const response = await apiClient.get<ApiResponse<CanteenEmployeeDetail>>(
      `/canteen-meals/employee/${employeeId}/detail`,
      { params }
    );
    return response.data.data!;
  },

  async importCardExcel(file: File): Promise<CanteenImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/canteen-meals/import-card', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.data;
  }
};
