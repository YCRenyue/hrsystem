/**
 * Authentication Service - Login, logout, token management
 */
import apiClient from './api';
import { User, LoginCredentials, ApiResponse } from '../types';

export interface LoginResponse {
  token: string;
  user: User;
}

export const authService = {
  /**
   * Login with username and password
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await apiClient.post<ApiResponse<LoginResponse>>(
      '/auth/login',
      credentials
    );
    const { token, user } = response.data.data!;

    // Store token and user info in localStorage
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_info', JSON.stringify(user));

    return { token, user };
  },

  /**
   * Logout - clear local storage and invalidate token
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_info');
    }
  },

  /**
   * Get current user info from token
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>('/auth/me');
    return response.data.data!;
  },

  /**
   * DingTalk OAuth callback handler
   */
  async handleDingTalkCallback(code: string, state: string): Promise<LoginResponse> {
    const response = await apiClient.post<ApiResponse<LoginResponse>>(
      '/auth/dingtalk/callback',
      { code, state }
    );
    const { token, user } = response.data.data!;

    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_info', JSON.stringify(user));

    return { token, user };
  },

  /**
   * Get stored user info from localStorage
   */
  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user_info');
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  },

  /**
   * Get stored auth token
   */
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  },
};
