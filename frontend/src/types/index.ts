/**
 * Core type definitions for HR System
 */

export enum Gender {
  MALE = 'male',
  FEMALE = 'female'
}

export enum EmploymentStatus {
  PENDING = 'pending',
  PROBATION = 'probation',
  REGULAR = 'regular',
  RESIGNED = 'resigned',
  TERMINATED = 'terminated'
}

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  INTERN = 'intern',
  CONTRACTOR = 'contractor'
}

export enum OnboardingStatus {
  PENDING = 'pending',
  SENT = 'sent',
  COMPLETED = 'completed',
  TIMEOUT = 'timeout'
}

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  HR_ADMIN = 'hr_admin',
  EMPLOYEE = 'employee'
}

export interface Department {
  department_id: string;
  department_name: string;
  parent_department_id?: string;
  manager_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Position {
  position_id: string;
  title: string;
  department_id: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  employee_id: string;
  employee_number: string;
  name: string; // Decrypted on frontend
  name_en?: string;
  gender: Gender;
  birth_date?: string;
  phone?: string; // May be masked based on permissions
  email?: string;
  id_card?: string; // May be masked
  hire_date: string;
  probation_end_date?: string;
  department_id: string;
  department?: Department;
  position_id: string;
  position?: Position;
  manager_id?: string;
  employment_type: EmploymentType;
  employment_status: EmploymentStatus;
  work_location?: string;
  address?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  avatar_url?: string;
  id_card_front_s3_path?: string;
  id_card_back_s3_path?: string;
  dingtalk_user_id?: string;
  data_complete: boolean;
  remarks?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  user_id: string;
  username: string;
  email?: string;
  role: UserRole;
  employee_id?: string;
  employee?: Employee;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface OnboardingProcess {
  process_id: string;
  employee_id: string;
  employee?: Employee;
  process_status: OnboardingStatus;
  notification_method?: 'dingtalk' | 'sms' | 'manual';
  sent_time?: string;
  completed_time?: string;
  form_token: string;
  form_link: string;
  reminder_count: number;
  created_at: string;
  updated_at: string;
}

export interface OperationLog {
  log_id: string;
  user_id: string;
  user?: User;
  operation_type: string;
  table_name: string;
  record_id: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

// Form types
export interface EmployeeCreateInput {
  employee_number: string;
  name: string;
  name_en?: string;
  gender: Gender;
  birth_date?: string;
  phone?: string;
  email?: string;
  id_card?: string;
  hire_date: string;
  probation_end_date?: string;
  department_id: string;
  position_id: string;
  manager_id?: string;
  employment_type: EmploymentType;
  work_location?: string;
  address?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  remarks?: string;
}

export interface EmployeeUpdateInput extends Partial<EmployeeCreateInput> {
  employment_status?: EmploymentStatus;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface DingTalkAuthResponse {
  code: string;
  state: string;
}

// Query/Filter types
export interface EmployeeQueryParams {
  page?: number;
  size?: number;
  keyword?: string;
  department_id?: string;
  employment_status?: EmploymentStatus;
  employment_type?: EmploymentType;
  hire_date_from?: string;
  hire_date_to?: string;
}
