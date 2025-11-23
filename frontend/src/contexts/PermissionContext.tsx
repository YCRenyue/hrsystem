/**
 * Permission Context
 *
 * 提供全局权限管理功能
 * 从登录用户信息初始化权限状态
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './AuthContext';

/**
 * 用户角色类型
 */
export type UserRole = 'admin' | 'hr_admin' | 'department_manager' | 'employee';

/**
 * 数据范围类型
 */
export type DataScope = 'all' | 'department' | 'self';

/**
 * 权限上下文类型
 */
interface PermissionContextType {
  /**
   * 检查是否有特定权限
   */
  hasPermission: (permission: string) => boolean;

  /**
   * 检查是否可以访问特定部门
   */
  canViewDepartment: (departmentId: string) => boolean;

  /**
   * 当前用户角色
   */
  role: UserRole | null;

  /**
   * 数据访问范围
   */
  dataScope: DataScope;

  /**
   * 当前用户的部门ID（如果是部门经理）
   */
  departmentId: string | null;

  /**
   * 是否可以查看敏感数据
   */
  canViewSensitive: boolean;

  /**
   * 用户权限列表
   */
  permissions: string[];

  /**
   * 是否为管理员（admin 或 hr_admin）
   */
  isAdmin: boolean;

  /**
   * 是否为部门经理
   */
  isDepartmentManager: boolean;

  /**
   * 是否为普通员工
   */
  isEmployee: boolean;
}

/**
 * 默认权限上下文
 */
const defaultPermissionContext: PermissionContextType = {
  hasPermission: () => false,
  canViewDepartment: () => false,
  role: null,
  dataScope: 'self',
  departmentId: null,
  canViewSensitive: false,
  permissions: [],
  isAdmin: false,
  isDepartmentManager: false,
  isEmployee: false
};

const PermissionContext = createContext<PermissionContextType>(defaultPermissionContext);

/**
 * Permission Provider Props
 */
interface PermissionProviderProps {
  children: ReactNode;
}

/**
 * Permission Provider Component
 *
 * 从 AuthContext 获取用户信息并提供权限检查功能
 */
export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children }) => {
  const { user } = useAuth();

  /**
   * 检查用户是否有特定权限
   */
  const hasPermission = (permission: string): boolean => {
    if (!user || !user.permissions) {
      return false;
    }

    // Admin 有所有权限（通配符）
    if (user.permissions.includes('*')) {
      return true;
    }

    // 检查完全匹配
    if (user.permissions.includes(permission)) {
      return true;
    }

    // 检查通配符匹配（例如：employees.* 匹配 employees.view_all）
    const wildcardMatch = user.permissions.some((p: string) => {
      if (p.endsWith('.*')) {
        const prefix = p.slice(0, -2);
        return permission.startsWith(prefix + '.');
      }
      return false;
    });

    return wildcardMatch;
  };

  /**
   * 检查是否可以访问特定部门
   */
  const canViewDepartment = (departmentId: string): boolean => {
    if (!user) {
      return false;
    }

    // Admin 和 HR 可以访问所有部门
    if (user.data_scope === 'all') {
      return true;
    }

    // 部门经理只能访问自己的部门
    if (user.data_scope === 'department') {
      return user.department_id === departmentId;
    }

    // 普通员工不能访问部门级数据
    return false;
  };

  // 计算派生状态
  const role = (user?.role as UserRole) || null;
  const dataScope = (user?.data_scope as DataScope) || 'self';
  const departmentId = user?.department_id || null;
  const canViewSensitive = user?.can_view_sensitive || false;
  const permissions = user?.permissions || [];

  const isAdmin = role === 'admin' || role === 'hr_admin';
  const isDepartmentManager = role === 'department_manager';
  const isEmployee = role === 'employee';

  const value: PermissionContextType = {
    hasPermission,
    canViewDepartment,
    role,
    dataScope,
    departmentId,
    canViewSensitive,
    permissions,
    isAdmin,
    isDepartmentManager,
    isEmployee
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

/**
 * usePermission Hook
 *
 * 在组件中使用权限功能
 *
 * @example
 * const { hasPermission, dataScope, isAdmin } = usePermission();
 *
 * if (hasPermission('employees.create')) {
 *   // 显示创建按钮
 * }
 */
export const usePermission = (): PermissionContextType => {
  const context = useContext(PermissionContext);

  if (!context) {
    throw new Error('usePermission must be used within PermissionProvider');
  }

  return context;
};

export default PermissionContext;
