/**
 * User Service - API calls for user management
 */
import apiClient from './api';
import { ApiResponse } from '../types';

export interface UserProfile {
  user_id: string;
  username: string;
  email: string;
  role: string;
  employee_id?: string;
  department_id?: string;
  can_view_sensitive: boolean;
  data_scope: 'all' | 'department' | 'self';
  created_at: string;
  employee?: {
    employee_id: string;
    employee_number: string;
    name_encrypted?: string;
    name_masked?: string;
    phone_encrypted?: string;
    phone_masked?: string;
    email?: string;
    department?: {
      department_id: string;
      name: string;
    };
  };
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
  }
};
