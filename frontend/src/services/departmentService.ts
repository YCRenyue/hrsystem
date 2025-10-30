/**
 * Department Service - API calls for department management
 */
import apiClient from './api';
import { Department, ApiResponse } from '../types';

export const departmentService = {
  /**
   * Get all departments
   */
  async getDepartments(): Promise<Department[]> {
    const response = await apiClient.get<ApiResponse<Department[]>>('/departments');
    return response.data.data!;
  },

  /**
   * Get department by ID
   */
  async getDepartmentById(departmentId: string): Promise<Department> {
    const response = await apiClient.get<ApiResponse<Department>>(
      `/departments/${departmentId}`
    );
    return response.data.data!;
  },

  /**
   * Create new department
   */
  async createDepartment(data: {
    department_name: string;
    parent_department_id?: string;
    manager_id?: string;
  }): Promise<Department> {
    const response = await apiClient.post<ApiResponse<Department>>('/departments', data);
    return response.data.data!;
  },

  /**
   * Update department
   */
  async updateDepartment(
    departmentId: string,
    data: {
      department_name?: string;
      parent_department_id?: string;
      manager_id?: string;
    }
  ): Promise<Department> {
    const response = await apiClient.put<ApiResponse<Department>>(
      `/departments/${departmentId}`,
      data
    );
    return response.data.data!;
  },

  /**
   * Delete department
   */
  async deleteDepartment(departmentId: string): Promise<void> {
    await apiClient.delete(`/departments/${departmentId}`);
  },
};
