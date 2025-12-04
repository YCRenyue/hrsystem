/**
 * RoleGuard Component
 *
 * 基于角色的路由守卫组件
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermission } from '../../hooks/usePermission';

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredPermission?: string;
  fallbackPath?: string;
}

/**
 * RoleGuard - 保护路由，要求特定角色或权限
 *
 * @example
 * <RoleGuard requiredRoles={['admin', 'hr']}>
 *   <AdminPanel />
 * </RoleGuard>
 *
 * @example
 * <RoleGuard requiredPermission="employees.view_all">
 *   <EmployeeList />
 * </RoleGuard>
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  requiredRoles = [],
  requiredPermission,
  fallbackPath = '/access-denied'
}) => {
  const { hasRole, hasPermission } = usePermission();

  // 检查角色权限
  if (requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(role => hasRole(role));
    if (!hasRequiredRole) {
      return <Navigate to={fallbackPath} replace />;
    }
  }

  // 检查具体权限
  if (requiredPermission) {
    if (!hasPermission(requiredPermission)) {
      return <Navigate to={fallbackPath} replace />;
    }
  }

  return <>{children}</>;
};

export default RoleGuard;
