/**
 * Can Component
 *
 * 条件渲染组件，基于权限显示或隐藏内容
 *
 * @example
 * <Can permission="employees.delete">
 *   <Button danger>删除</Button>
 * </Can>
 *
 * @example
 * <Can role="admin">
 *   <AdminPanel />
 * </Can>
 *
 * @example
 * <Can permission="employees.create" fallback={<div>无权限</div>}>
 *   <Button type="primary">创建员工</Button>
 * </Can>
 */

import React, { ReactNode } from 'react';
import { usePermission } from '../../hooks/usePermission';
import { UserRole } from '../../contexts/PermissionContext';

interface CanProps {
  /**
   * 需要的权限（可选）
   */
  permission?: string;

  /**
   * 需要的角色（可选）
   */
  role?: UserRole | UserRole[];

  /**
   * 无权限时显示的内容（可选）
   */
  fallback?: ReactNode;

  /**
   * 子组件
   */
  children: ReactNode;

  /**
   * 是否反转逻辑（即：没有权限时才显示，默认：false）
   */
  not?: boolean;
}

/**
 * Can Component
 *
 * 根据权限条件渲染子组件
 */
export const Can: React.FC<CanProps> = ({
  permission,
  role: requiredRole,
  fallback = null,
  children,
  not = false
}) => {
  const { hasPermission, role } = usePermission();

  let hasAccess = true;

  // 检查权限
  if (permission) {
    hasAccess = hasAccess && hasPermission(permission);
  }

  // 检查角色
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    hasAccess = hasAccess && (role ? roles.includes(role) : false);
  }

  // 反转逻辑（如果 not=true）
  if (not) {
    hasAccess = !hasAccess;
  }

  // 渲染
  if (hasAccess) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

export default Can;
