/**
 * Employee Service - API calls for employee management
 */
import apiClient from './api';
import {
  Employee,
  EmployeeCreateInput,
  EmployeeUpdateInput,
  EmployeeQueryParams,
  PaginatedResponse,
  ApiResponse,
} from '../types';

export const employeeService = {
  /**
   * Get paginated list of employees
   */
  async getEmployees(
    params: EmployeeQueryParams = {}
  ): Promise<PaginatedResponse<Employee>> {
    const response = await apiClient.get<PaginatedResponse<Employee>>('/employees', {
      params,
    });
    return response.data;
  },

  /**
   * Get single employee by ID
   */
  async getEmployeeById(employeeId: string): Promise<Employee> {
    const response = await apiClient.get<ApiResponse<Employee>>(`/employees/${employeeId}`);
    return response.data.data!;
  },

  /**
   * Create new employee
   */
  async createEmployee(data: EmployeeCreateInput): Promise<Employee> {
    const response = await apiClient.post<ApiResponse<Employee>>('/employees', data);
    return response.data.data!;
  },

  /**
   * Update employee information
   */
  async updateEmployee(
    employeeId: string,
    data: EmployeeUpdateInput
  ): Promise<Employee> {
    const response = await apiClient.put<ApiResponse<Employee>>(
      `/employees/${employeeId}`,
      data
    );
    return response.data.data!;
  },

  /**
   * Delete employee
   */
  async deleteEmployee(employeeId: string): Promise<void> {
    await apiClient.delete(`/employees/${employeeId}`);
  },

  /**
   * Import employees from Excel file
   */
  async importFromExcel(file: File): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<ApiResponse<any>>(
      '/employees/import',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  /**
   * Export employees to Excel
   */
  async exportToExcel(params: EmployeeQueryParams = {}): Promise<Blob> {
    const response = await apiClient.get('/employees/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Upload ID card image
   */
  async uploadIdCard(
    employeeId: string,
    file: File,
    type: 'front' | 'back'
  ): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await apiClient.post<ApiResponse<{ url: string }>>(
      `/employees/${employeeId}/id-card`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data!.url;
  },
};
