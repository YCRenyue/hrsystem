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
  ImportPreviewData,
  ImportResultData,
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
   * Offboard employee: mark as resigned with a leave date (records are never deleted)
   */
  async offboardEmployee(employeeId: string, leaveDate: string): Promise<Employee> {
    const response = await apiClient.post<ApiResponse<Employee>>(
      `/employees/${employeeId}/offboard`,
      { leave_date: leaveDate }
    );
    return response.data.data!;
  },

  /**
   * Preview Excel import: parse and validate without writing to DB
   */
  async previewImport(file: File): Promise<ApiResponse<ImportPreviewData>> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ApiResponse<ImportPreviewData>>(
      '/employees/import/preview',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  /**
   * Confirm Excel import: write validated rows to DB
   */
  async confirmImport(file: File): Promise<ApiResponse<ImportResultData>> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ApiResponse<ImportResultData>>(
      '/employees/import/confirm',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
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
   * Sign a document confirmation (policy ack / training pledge / employment contract).
   * Sends the signed-document screenshot together with the sign request so the
   * backend can treat the OSS upload and the DB status flip as one atomic
   * operation (see backend employeeController.signDocument) - a document can
   * never end up marked "signed" without its evidence screenshot on file.
   *
   * @param password - the caller's current login password (step-up auth,
   *   re-verified server-side immediately before signing)
   */
  async signDocument(
    employeeId: string,
    documentType: 'policy_ack' | 'training_pledge' | 'employment_contract',
    screenshot: File,
    password: string,
    partyInfo?: Record<string, string>
  ): Promise<{ documentType: string; signedAt: string }> {
    const formData = new FormData();
    formData.append('documentType', documentType);
    formData.append('password', password);
    formData.append('screenshot', screenshot);
    if (partyInfo) {
      formData.append('partyInfo', JSON.stringify(partyInfo));
    }
    const response = await apiClient.put<ApiResponse<{ documentType: string; signedAt: string }>>(
      `/employees/${employeeId}/sign-document`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data.data!;
  },

  /**
   * Save or update training pledge details (HR only)
   */
  async saveTrainingPledge(
    employeeId: string,
    data: {
      training_cost: number;
      service_years: number;
      party_a_name: string;
      party_a_address: string;
    }
  ): Promise<{
    pledge_id: string;
    employee_id: string;
    training_cost: number;
    service_years: number;
    party_a_name: string;
    party_a_address: string;
  }> {
    const response = await apiClient.put<
      ApiResponse<{
        pledge_id: string;
        employee_id: string;
        training_cost: number;
        service_years: number;
        party_a_name: string;
        party_a_address: string;
      }>
    >(`/employees/${employeeId}/training-pledge`, data);
    return response.data.data!;
  },

  /**
   * Save or update employment contract terms (HR only)
   */
  async saveEmploymentContract(
    employeeId: string,
    data: {
      party_a_name: string;
      party_a_address: string;
      contract_type: string;
      position: string;
      work_location: string;
      contract_start_date: string;
      contract_end_date: string;
      monthly_salary: number;
    }
  ): Promise<{
    contract_id: string;
    employee_id: string;
    party_a_name: string;
    party_a_address: string;
    contract_type: string;
    position: string;
    work_location: string;
    contract_start_date: string;
    contract_end_date: string;
    monthly_salary: number;
  }> {
    const response = await apiClient.put<
      ApiResponse<{
        contract_id: string;
        employee_id: string;
        party_a_name: string;
        party_a_address: string;
        contract_type: string;
        position: string;
        work_location: string;
        contract_start_date: string;
        contract_end_date: string;
        monthly_salary: number;
      }>
    >(`/employees/${employeeId}/employment-contract`, data);
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
