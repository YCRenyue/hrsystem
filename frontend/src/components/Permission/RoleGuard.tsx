/**
 * RoleGuard Component
 *
 * 路由级权限守卫组件
 * 检查用户是否有访问特定路由的权限
 *
 * @example
 * <RoleGuard requiredPermission="employees.view_all">
 *   <EmployeeList />
 * </RoleGuard>
 *
 * @example
 * <RoleGuard requiredRole="admin">
 *   <UserManagement />
 * </RoleGuard>
 */

import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermission } from '../../hooks/usePermission';
import { UserRole } from '../../contexts/PermissionContext';

interface RoleGuardProps {
  /**
   * 需要的权限（可选）
   */
  requiredPermission?: string;

  /**
   * 需要的角色（可选）
   */
  requiredRole?: UserRole | UserRole[];

  /**
   * 子组件
   */
  children: ReactNode;

  /**
   * 无权限时的重定向路径（默认：/access-denied）
   */
  redirectTo?: string;

  /**
   * 是否显示加载状态（默认：false）
   */
  loading?: boolean;
}

/**
 * RoleGuard Component
 *
 * 根据权限或角色保护路由
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({
  requiredPermission,
  requiredRole,
  children,
  redirectTo = '/access-denied',
  loading = false
}) => {
  const { hasPermission, role } = usePermission();

  // 如果正在加载，显示加载状态（可选）
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  // 检查权限
  if (requiredPermission) {
    const hasRequiredPermission = hasPermission(requiredPermission);
    if (!hasRequiredPermission) {
      return <Navigate to={redirectTo} replace />;
    }
  }

  // 检查角色
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasRequiredRole = role && roles.includes(role);

    if (!hasRequiredRole) {
      return <Navigate to={redirectTo} replace />;
    }
  }

  // 有权限，渲染子组件
  return <>{children}</>;
};

export default RoleGuard;
