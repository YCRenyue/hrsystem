/**
 * usePermission Hook
 *
 * 便捷的权限检查 Hook，封装常用的权限判断逻辑
 *
 * @example
 * const { hasPermission, canEdit, canDelete } = usePermission();
 *
 * if (hasPermission('employees.create')) {
 *   // Show create button
 * }
 */

import { usePermission as usePermissionContext } from '../contexts/PermissionContext';

export const usePermission = () => {
  const permission = usePermissionContext();

  /**
   * 快捷方法：检查是否可以创建员工
   */
  const canCreateEmployee = (): boolean => {
    return permission.hasPermission('employees.create');
  };

  /**
   * 快捷方法：检查是否可以编辑员工
   */
  const canEditEmployee = (employeeId?: string): boolean => {
    // Admin 和 HR 可以编辑所有员工
    if (permission.hasPermission('employees.update_all')) {
      return true;
    }

    // 部门经理可以编辑本部门员工（需要在组件中验证部门）
    if (permission.hasPermission('employees.update_department')) {
      return true;
    }

    // 员工可以编辑自己（需要在组件中验证是否为本人）
    if (permission.hasPermission('employees.update_self_limited')) {
      return true;
    }

    return false;
  };

  /**
   * 快捷方法：检查是否可以删除员工
   */
  const canDeleteEmployee = (): boolean => {
    return permission.hasPermission('employees.delete');
  };

  /**
   * 快捷方法：检查是否可以导出员工数据
   */
  const canExportEmployees = (): boolean => {
    return permission.hasPermission('employees.export') ||
           permission.hasPermission('employees.export_department');
  };

  /**
   * 快捷方法：检查是否可以导入员工数据
   */
  const canImportEmployees = (): boolean => {
    return permission.hasPermission('employees.import');
  };

  /**
   * 快捷方法：检查是否可以更新员工（别名，与canEditEmployee相同）
   */
  const canUpdateEmployee = (): boolean => {
    return canEditEmployee();
  };

  /**
   * 快捷方法：检查是否可以查看敏感数据
   */
  const canViewSensitive = (): boolean => {
    // Admin 和 HR 可以查看所有敏感数据
    if (permission.hasPermission('employees.view_all')) {
      return true;
    }
    // 部门经理可以查看本部门员工的敏感数据
    if (permission.hasPermission('employees.view_department')) {
      return true;
    }
    // 员工可以查看自己的敏感数据
    if (permission.hasPermission('employees.view_self')) {
      return true;
    }
    return false;
  };

  /**
   * 快捷方法：检查是否可以管理部门
   */
  const canManageDepartments = (): boolean => {
    return permission.hasPermission('departments.manage');
  };

  /**
   * 快捷方法：检查是否可以管理用户
   */
  const canManageUsers = (): boolean => {
    return permission.hasPermission('users.manage');
  };

  /**
   * 快捷方法：检查是否可以查看报表
   */
  const canViewReports = (): boolean => {
    return permission.hasPermission('reports.view_all') ||
           permission.hasPermission('reports.view_department');
  };

  /**
   * 快捷方法：检查是否应该显示部门筛选器
   */
  const shouldShowDepartmentFilter = (): boolean => {
    // Admin 和 HR 可以看到并选择所有部门
    return permission.dataScope === 'all';
  };

  /**
   * 快捷方法：检查是否需要重定向到个人信息页
   */
  const shouldRedirectToProfile = (): boolean => {
    // 普通员工访问员工列表时应该重定向到个人信息页
    return permission.dataScope === 'self';
  };

  /**
   * 检查用户是否具有特定角色
   */
  const hasRole = (role: string): boolean => {
    // 从 permission 中获取用户角色
    const userRole = permission.user?.role || '';
    return userRole === role;
  };

  return {
    // 原始权限功能
    ...permission,

    // 快捷方法
    hasRole,
    canCreateEmployee,
    canEditEmployee,
    canUpdateEmployee, // Alias for canEditEmployee
    canDeleteEmployee,
    canExportEmployees,
    canImportEmployees,
    canViewSensitive,
    canManageDepartments,
    canManageUsers,
    canViewReports,
    shouldShowDepartmentFilter,
    shouldRedirectToProfile
  };
};

export default usePermission;
