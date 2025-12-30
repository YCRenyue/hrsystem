/**
 * API Service - Axios instance and interceptors
 */
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

/**
 * Create axios instance with default configuration
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor - Add auth token to requests
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - Handle common errors
 */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response) {
      const { status, config } = error.response;

      // Handle 401 Unauthorized - redirect to login
      // Skip redirect for login endpoint to allow showing error message
      if (status === 401) {
        const isLoginRequest = config.url?.includes('/auth/login');
        if (!isLoginRequest) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_info');
          window.location.href = '/login';
        }
      }

      // Handle 403 Forbidden
      if (status === 403) {
        console.error('Access denied');
      }

      // Handle 404 Not Found
      if (status === 404) {
        console.error('Resource not found');
      }

      // Handle 500 Internal Server Error
      if (status >= 500) {
        console.error('Server error occurred');
      }
    } else if (error.request) {
      console.error('Network error - no response received');
    }

    return Promise.reject(error);
  }
);

export default apiClient;
