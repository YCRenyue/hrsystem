/**
 * Dashboard Service - API calls for dashboard statistics
 */
import apiClient from './api';
import { ApiResponse } from '../types';

export interface DashboardStats {
  totalEmployees: number;
  totalDepartments: number;
  pendingEmployees: number;
  completionRate: number;
  employeesByDepartment: Array<{
    department_id: string;
    count: number;
    'department.name': string;
  }>;
  employeesByStatus: Array<{
    status: string;
    count: number;
  }>;
}

export const dashboardService = {
  /**
   * Get dashboard statistics
   */
  async getStats(): Promise<DashboardStats> {
    const response = await apiClient.get<ApiResponse<DashboardStats>>('/dashboard/stats');
    return response.data.data!;
  }
};
