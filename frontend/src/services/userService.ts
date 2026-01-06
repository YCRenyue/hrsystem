/**
 * User Service - API calls for user management
 */
import apiClient from './api';
import { ApiResponse } from '../types';

export interface UserProfile {
  user_id: string;
  username: string;
  display_name?: string;
  email: string;
  role: string;
  employee_id?: string;
  department_id?: string;
  can_view_sensitive: boolean;
  data_scope: 'all' | 'department' | 'self';
  status: string;
  is_active: boolean;
  last_login_at?: string;
  must_change_password?: boolean;
  created_at: string;
  employee?: {
    employee_id: string;
    employee_number: string;
    position?: string;
    name?: string;
    name_masked?: string;
    phone_masked?: string;
    department?: {
      department_id: string;
      name: string;
    };
  };
}

export interface UserListResponse {
  items: UserProfile[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface UserPreferences {
  theme?: 'light' | 'dark';
  fontSize?: 'small' | 'medium' | 'large';
  language?: 'zh-CN' | 'en-US';
  backgroundColor?: string;
  primaryColor?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateUserRoleData {
  role?: 'admin' | 'hr_admin' | 'department_manager' | 'employee';
  data_scope?: 'all' | 'department' | 'self';
  can_view_sensitive?: boolean;
  status?: 'active' | 'inactive' | 'locked';
}

export interface UserListParams {
  page?: number;
  size?: number;
  keyword?: string;
  role?: string;
  status?: string;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

export const userService = {
  /**
   * Get current user profile
   */
  async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get<ApiResponse<UserProfile>>('/users/profile');
    return response.data.data!;
  },

  /**
   * Update user profile
   */
  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    const response = await apiClient.put<ApiResponse<UserProfile>>('/users/profile', data);
    return response.data.data!;
  },

  /**
   * Change password
   */
  async changePassword(data: ChangePasswordData): Promise<void> {
    await apiClient.post('/users/change-password', data);
  },

  /**
   * Get user preferences
   */
  async getPreferences(): Promise<UserPreferences> {
    const response = await apiClient.get<ApiResponse<UserPreferences>>('/users/preferences');
    return response.data.data!;
  },

  /**
   * Update user preferences
   */
  async updatePreferences(data: UserPreferences): Promise<UserPreferences> {
    const response = await apiClient.put<ApiResponse<UserPreferences>>(
      '/users/preferences',
      data
    );
    return response.data.data!;
  },

  // ============================================
  // Admin user management methods
  // ============================================

  /**
   * Get paginated list of all users (Admin only)
   */
  async getUsers(params: UserListParams = {}): Promise<UserListResponse> {
    const response = await apiClient.get<ApiResponse<UserListResponse>>('/users', { params });
    return response.data.data!;
  },

  /**
   * Get single user by ID (Admin only)
   */
  async getUserById(id: string): Promise<UserProfile> {
    const response = await apiClient.get<ApiResponse<UserProfile>>(`/users/${id}`);
    return response.data.data!;
  },

  /**
   * Update user role and permissions (Admin only)
   */
  async updateUserRole(id: string, data: UpdateUserRoleData): Promise<UserProfile> {
    const response = await apiClient.put<ApiResponse<UserProfile>>(`/users/${id}/role`, data);
    return response.data.data!;
  },

  /**
   * Reset user password to default (Admin only)
   */
  async resetUserPassword(id: string): Promise<{ message: string }> {
    const response = await apiClient.post<ApiResponse<{ message: string }>>(
      `/users/${id}/reset-password`
    );
    return { message: response.data.message || 'Password reset successful' };
  },

  /**
   * Delete user (Admin only)
   */
  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  }
};
