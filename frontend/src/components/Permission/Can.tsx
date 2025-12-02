/**
 * Can Component
 *
 * Conditional rendering based on permissions
 *
 * @example
 * <Can permission="employees.create">
 *   <Button>Create Employee</Button>
 * </Can>
 */

import React from 'react';
import { usePermission } from '../../hooks/usePermission';

interface CanProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const Can: React.FC<CanProps> = ({ permission, children, fallback = null }) => {
  const { hasPermission } = usePermission();

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default Can;
