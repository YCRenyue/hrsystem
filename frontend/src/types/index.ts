/**
 * Core type definitions for HR System
 */

export enum Gender {
  MALE = 'male',
  FEMALE = 'female'
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
  ADMIN = 'admin',
  HR_ADMIN = 'hr_admin',
  DEPARTMENT_MANAGER = 'department_manager',
  EMPLOYEE = 'employee'
}

export enum DataScope {
  ALL = 'all',
  DEPARTMENT = 'department',
  SELF = 'self'
}

export interface Department {
  department_id: string;
  name: string; // Backend uses 'name', not 'department_name'
  code?: string;
  parent_department_id?: string;
  manager_id?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  employee_id: string;
  employee_number: string;
  name: string; // Decrypted on frontend
  name_en?: string;
  gender?: Gender | string;
  birth_date?: string;
  phone?: string; // May be masked based on permissions
  email?: string;
  id_card?: string; // May be masked
  bank_card?: string; // May be masked
  entry_date?: string; // Backend uses entry_date, not hire_date
  hire_date?: string; // Alias for entry_date
  probation_end_date?: string;
  department_id?: string;
  department?: Department;
  position?: string; // Backend uses string, not Position object
  manager_id?: string;
  employment_type?: EmploymentType | string;
  status?: string; // Backend uses 'status' (active/pending/inactive)
  work_location?: string;
  address?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  avatar_url?: string;
  // OSS 文件标识
  has_id_card_front?: boolean;
  has_id_card_back?: boolean;
  has_bank_card_image?: boolean;
  has_diploma_image?: boolean;
  dingtalk_user_id?: string;
  data_complete?: boolean;
  remarks?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  user_id: string;
  username: string;
  display_name?: string;
  email?: string;
  phone?: string;
  role: UserRole | string; // Allow string for flexibility
  employee_id?: string;
  employee?: Employee;
  department_id?: string; // For department managers
  data_scope: DataScope | string; // 数据访问范围
  can_view_sensitive: boolean; // 是否可查看敏感数据
  permissions: string[]; // 权限列表
  status: string; // active, inactive, locked
  is_active: boolean;
  last_login_at?: string;
  must_change_password?: boolean;
  password_expires_at?: string;
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
  position: string;
  manager_id?: string;
  employment_type: EmploymentType;
  work_location?: string;
  address?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  remarks?: string;
  status?: string;
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
  status?: string; // Backend uses 'status' for active/pending/inactive
  employment_type?: EmploymentType;
  hire_date_from?: string;
  hire_date_to?: string;
  entry_date_start?: string; // For date range filtering
  entry_date_end?: string;   // For date range filtering
  sort_by?: string;          // Sort field name
  sort_order?: 'ASC' | 'DESC'; // Sort direction
}
