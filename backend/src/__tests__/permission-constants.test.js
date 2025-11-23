/**
 * Permission Constants Tests
 *
 * Tests for permission definitions and utility functions
 */

const {
  EMPLOYEE_PERMISSIONS,
  DEPARTMENT_PERMISSIONS,
  REPORT_PERMISSIONS,
  USER_PERMISSIONS,
  ONBOARDING_PERMISSIONS,
  ROLE_PERMISSIONS_MAP,
  hasPermission,
  getRolePermissions,
} = require('../constants/permissions');

describe('Permission Constants Tests', () => {
  describe('Permission Definitions', () => {
    test('should have correct employee permissions', () => {
      expect(EMPLOYEE_PERMISSIONS.VIEW_ALL).toBe('employees.view_all');
      expect(EMPLOYEE_PERMISSIONS.VIEW_DEPARTMENT).toBe('employees.view_department');
      expect(EMPLOYEE_PERMISSIONS.VIEW_SELF).toBe('employees.view_self');
      expect(EMPLOYEE_PERMISSIONS.CREATE).toBe('employees.create');
      expect(EMPLOYEE_PERMISSIONS.UPDATE_ALL).toBe('employees.update_all');
      expect(EMPLOYEE_PERMISSIONS.DELETE).toBe('employees.delete');
      expect(EMPLOYEE_PERMISSIONS.EXPORT).toBe('employees.export');
      expect(EMPLOYEE_PERMISSIONS.IMPORT).toBe('employees.import');
    });

    test('should have correct department permissions', () => {
      expect(DEPARTMENT_PERMISSIONS.VIEW).toBe('departments.view');
      expect(DEPARTMENT_PERMISSIONS.VIEW_ALL).toBe('departments.view_all');
      expect(DEPARTMENT_PERMISSIONS.MANAGE).toBe('departments.manage');
      expect(DEPARTMENT_PERMISSIONS.CREATE).toBe('departments.create');
      expect(DEPARTMENT_PERMISSIONS.UPDATE).toBe('departments.update');
      expect(DEPARTMENT_PERMISSIONS.DELETE).toBe('departments.delete');
    });

    test('should have correct report permissions', () => {
      expect(REPORT_PERMISSIONS.VIEW_ALL).toBe('reports.view_all');
      expect(REPORT_PERMISSIONS.VIEW_DEPARTMENT).toBe('reports.view_department');
      expect(REPORT_PERMISSIONS.EXPORT_ALL).toBe('reports.export_all');
      expect(REPORT_PERMISSIONS.EXPORT_DEPARTMENT).toBe('reports.export_department');
    });

    test('should have correct user permissions', () => {
      expect(USER_PERMISSIONS.MANAGE).toBe('users.manage');
      expect(USER_PERMISSIONS.CREATE).toBe('users.create');
      expect(USER_PERMISSIONS.UPDATE).toBe('users.update');
      expect(USER_PERMISSIONS.DELETE).toBe('users.delete');
      expect(USER_PERMISSIONS.VIEW_ALL).toBe('users.view_all');
    });

    test('should have correct onboarding permissions', () => {
      expect(ONBOARDING_PERMISSIONS.MANAGE).toBe('onboarding.manage');
      expect(ONBOARDING_PERMISSIONS.CREATE).toBe('onboarding.create');
      expect(ONBOARDING_PERMISSIONS.VIEW_ALL).toBe('onboarding.view_all');
      expect(ONBOARDING_PERMISSIONS.UPDATE).toBe('onboarding.update');
      expect(ONBOARDING_PERMISSIONS.SEND_NOTIFICATION).toBe('onboarding.send_notification');
    });
  });

  describe('Role Permission Mapping', () => {
    test('should give admin wildcard permission', () => {
      const adminPerms = getRolePermissions('admin');
      expect(adminPerms).toEqual(['*']);
    });

    test('should give hr_admin correct permissions', () => {
      const hrPerms = getRolePermissions('hr_admin');
      expect(hrPerms).toContain('employees.view_all');
      expect(hrPerms).toContain('employees.create');
      expect(hrPerms).toContain('employees.update_all');
      expect(hrPerms).toContain('employees.delete');
      expect(hrPerms).toContain('employees.export');
      expect(hrPerms).toContain('employees.import');
      expect(hrPerms).toContain('departments.view_all');
      expect(hrPerms).toContain('reports.view_all');
      expect(hrPerms).toContain('onboarding.manage');
    });

    test('should give department_manager limited permissions', () => {
      const managerPerms = getRolePermissions('department_manager');
      expect(managerPerms).toContain('employees.view_department');
      expect(managerPerms).toContain('employees.update_department');
      expect(managerPerms).toContain('employees.export_department');
      expect(managerPerms).toContain('departments.view');
      expect(managerPerms).toContain('reports.view_department');

      // Should NOT have full access
      expect(managerPerms).not.toContain('employees.view_all');
      expect(managerPerms).not.toContain('employees.create');
      expect(managerPerms).not.toContain('employees.delete');
    });

    test('should give employee minimal permissions', () => {
      const empPerms = getRolePermissions('employee');
      expect(empPerms).toContain('employees.view_self');
      expect(empPerms).toContain('employees.update_self_limited');
      expect(empPerms).toContain('departments.view');

      // Should NOT have broader access
      expect(empPerms).not.toContain('employees.view_all');
      expect(empPerms).not.toContain('employees.view_department');
      expect(empPerms).not.toContain('employees.create');
    });

    test('should return empty array for unknown role', () => {
      const unknownPerms = getRolePermissions('unknown_role');
      expect(unknownPerms).toEqual([]);
    });
  });

  describe('hasPermission utility function', () => {
    test('should allow admin with wildcard permission', () => {
      expect(hasPermission('employees.view_all', ['*'])).toBe(true);
      expect(hasPermission('users.delete', ['*'])).toBe(true);
      expect(hasPermission('anything.anything', ['*'])).toBe(true);
    });

    test('should allow exact permission match', () => {
      const userPerms = ['employees.view_all', 'departments.view'];
      expect(hasPermission('employees.view_all', userPerms)).toBe(true);
      expect(hasPermission('departments.view', userPerms)).toBe(true);
    });

    test('should deny when permission not in list', () => {
      const userPerms = ['employees.view_self', 'departments.view'];
      expect(hasPermission('employees.view_all', userPerms)).toBe(false);
      expect(hasPermission('employees.create', userPerms)).toBe(false);
    });

    test('should support wildcard matching (e.g., employees.*)', () => {
      const userPerms = ['employees.*', 'departments.view'];
      expect(hasPermission('employees.view_all', userPerms)).toBe(true);
      expect(hasPermission('employees.create', userPerms)).toBe(true);
      expect(hasPermission('employees.update_all', userPerms)).toBe(true);
      expect(hasPermission('employees.delete', userPerms)).toBe(true);

      // Should not match other resources
      expect(hasPermission('users.view_all', userPerms)).toBe(false);
    });

    test('should handle null or undefined permissions', () => {
      expect(hasPermission('employees.view_all', null)).toBe(false);
      expect(hasPermission('employees.view_all', undefined)).toBe(false);
      expect(hasPermission('employees.view_all', [])).toBe(false);
    });

    test('should handle non-array permissions', () => {
      expect(hasPermission('employees.view_all', 'not-an-array')).toBe(false);
      expect(hasPermission('employees.view_all', 123)).toBe(false);
      expect(hasPermission('employees.view_all', {})).toBe(false);
    });

    test('should be case-sensitive', () => {
      const userPerms = ['employees.view_all'];
      expect(hasPermission('employees.view_all', userPerms)).toBe(true);
      expect(hasPermission('Employees.View_All', userPerms)).toBe(false);
      expect(hasPermission('EMPLOYEES.VIEW_ALL', userPerms)).toBe(false);
    });

    test('should handle complex wildcard scenarios', () => {
      const userPerms = ['employees.*', 'reports.view_*', 'departments.view'];

      // employees.* should match all employee permissions
      expect(hasPermission('employees.view_all', userPerms)).toBe(true);
      expect(hasPermission('employees.anything', userPerms)).toBe(true);

      // reports.view_* is not implemented (only full wildcard is supported)
      // This should return false as the implementation only supports resource-level wildcards
      expect(hasPermission('reports.view_all', userPerms)).toBe(false);

      // Exact match should work
      expect(hasPermission('departments.view', userPerms)).toBe(true);
    });
  });

  describe('Permission Consistency', () => {
    test('all role permission maps should reference valid permissions', () => {
      Object.entries(ROLE_PERMISSIONS_MAP).forEach(([role, perms]) => {
        if (perms.includes('*')) {
          // Admin wildcard is valid
          expect(role).toBe('admin');
          return;
        }

        perms.forEach((perm) => {
          // Permission should follow format: resource.action
          expect(perm).toMatch(/^[a-z_]+\.[a-z_]+$/);
        });
      });
    });

    test('hr_admin should have all employee management permissions except view_self', () => {
      const hrPerms = getRolePermissions('hr_admin');
      expect(hrPerms).toContain('employees.view_all');
      expect(hrPerms).toContain('employees.create');
      expect(hrPerms).toContain('employees.update_all');
      expect(hrPerms).toContain('employees.delete');
      expect(hrPerms).not.toContain('employees.view_self');
    });

    test('department_manager should only have department-scoped permissions', () => {
      const managerPerms = getRolePermissions('department_manager');

      // Should have department-scoped permissions
      expect(managerPerms).toContain('employees.view_department');
      expect(managerPerms).toContain('employees.update_department');
      expect(managerPerms).toContain('employees.export_department');
      expect(managerPerms).toContain('reports.view_department');

      // Should NOT have all-scope permissions
      expect(managerPerms).not.toContain('employees.view_all');
      expect(managerPerms).not.toContain('reports.view_all');
    });

    test('employee should only have self-scoped permissions', () => {
      const empPerms = getRolePermissions('employee');

      // Should have self-scoped permissions
      expect(empPerms).toContain('employees.view_self');
      expect(empPerms).toContain('employees.update_self_limited');

      // Should NOT have any broader scope
      expect(empPerms).not.toContain('employees.view_all');
      expect(empPerms).not.toContain('employees.view_department');
      expect(empPerms).not.toContain('employees.update_all');
      expect(empPerms).not.toContain('employees.update_department');
    });
  });
});
