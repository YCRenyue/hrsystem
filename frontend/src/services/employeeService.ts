/**
 * Employee Service - API calls for employee management
 */
import apiClient from './api';
import {
  Employee,
  EmployeeCreateInput,
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
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Employee>>>('/employees', {
      params,
    });
    return response.data.data!;
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
    data: EmployeeCreateInput
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

  /**
   * Send onboarding form email to employee
   */
  /**
   * Sign a document confirmation (policy or training)
   */
  async signDocument(
    employeeId: string,
    documentType: 'policy_ack' | 'training_pledge'
  ): Promise<{ documentType: string; signedAt: string }> {
    const response = await apiClient.put<
      ApiResponse<{ documentType: string; signedAt: string }>
    >(`/employees/${employeeId}/sign-document`, { documentType });
    return response.data.data!;
  },

  /**
   * Save or update training pledge details (HR only)
   */
  async saveTrainingPledge(
    employeeId: string,
    data: { training_cost: number; service_years: number }
  ): Promise<{ pledge_id: string; employee_id: string; training_cost: number; service_years: number }> {
    const response = await apiClient.put<
      ApiResponse<{ pledge_id: string; employee_id: string; training_cost: number; service_years: number }>
    >(`/employees/${employeeId}/training-pledge`, data);
    return response.data.data!;
  },

  async sendOnboardingEmail(employeeId: string): Promise<{
    success: boolean;
    message: string;
    channel?: string;
    formUrl?: string;
  }> {
    const response = await apiClient.post<ApiResponse<{
      success: boolean;
      message: string;
      channel?: string;
      formUrl?: string;
    }>>(`/onboarding/send/${employeeId}`);
    return response.data.data!;
  },
};
