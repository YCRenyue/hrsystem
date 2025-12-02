/**
 * Permission Service Tests
 *
 * 测试权限服务的数据筛选和敏感信息处理功能
 */

const permissionService = require('../services/PermissionService');
const { encryptionService } = require('../utils/encryption');

describe('PermissionService', () => {
  describe('applyDataScopeFilter', () => {
    it('should allow admin to access all data', () => {
      const user = {
        user_id: 'admin1',
        data_scope: 'all'
      };

      const where = permissionService.applyDataScopeFilter(user, 'employee');

      expect(where).toEqual({});
    });

    it('should allow admin to filter by specific department', () => {
      const user = {
        user_id: 'admin1',
        data_scope: 'all'
      };

      const where = permissionService.applyDataScopeFilter(user, 'employee', {
        department_id: 'dept1'
      });

      expect(where).toEqual({ department_id: 'dept1' });
    });

    it('should restrict department manager to own department', () => {
      const user = {
        user_id: 'manager1',
        employee_id: 'emp1',
        department_id: 'dept1',
        data_scope: 'department'
      };

      const where = permissionService.applyDataScopeFilter(user, 'employee');

      expect(where).toEqual({ department_id: 'dept1' });
    });

    it('should restrict employee to self only', () => {
      const user = {
        user_id: 'user1',
        employee_id: 'emp1',
        department_id: 'dept1',
        data_scope: 'self'
      };

      const where = permissionService.applyDataScopeFilter(user, 'employee');

      expect(where).toEqual({ employee_id: 'emp1' });
    });

    it('should handle missing user gracefully', () => {
      const where = permissionService.applyDataScopeFilter(null, 'employee');

      expect(where).toEqual({});
    });

    it('should handle unknown data scope', () => {
      const user = {
        user_id: 'user1',
        employee_id: 'emp1',
        data_scope: 'unknown'
      };

      const where = permissionService.applyDataScopeFilter(user, 'employee');

      // Should default to most restrictive (self)
      expect(where).toEqual({ employee_id: 'emp1' });
    });

    it('should preserve additional filters for admin', () => {
      const user = {
        user_id: 'admin1',
        data_scope: 'all'
      };

      const where = permissionService.applyDataScopeFilter(user, 'employee', {
        status: 'active',
        position: 'Developer'
      });

      expect(where).toEqual({
        status: 'active',
        position: 'Developer'
      });
    });
  });

  describe('canViewSensitiveData', () => {
    it('should allow admin with can_view_sensitive flag to view sensitive data', () => {
      const user = {
        data_scope: 'all',
        can_view_sensitive: true
      };

      const canView = permissionService.canViewSensitiveData(user);

      expect(canView).toBe(true);
    });

    it('should deny admin without can_view_sensitive flag', () => {
      const user = {
        data_scope: 'all',
        can_view_sensitive: false
      };

      const canView = permissionService.canViewSensitiveData(user);

      expect(canView).toBe(false);
    });

    it('should allow department manager with can_view_sensitive flag', () => {
      const user = {
        data_scope: 'department',
        can_view_sensitive: true
      };

      const canView = permissionService.canViewSensitiveData(user);

      expect(canView).toBe(true);
    });

    it('should allow employee to view own sensitive data', () => {
      const user = {
        employee_id: 'emp1',
        data_scope: 'self'
      };

      const canView = permissionService.canViewSensitiveData(user, 'emp1');

      expect(canView).toBe(true);
    });

    it('should deny employee viewing other employee sensitive data', () => {
      const user = {
        employee_id: 'emp1',
        data_scope: 'self',
        can_view_sensitive: false
      };

      const canView = permissionService.canViewSensitiveData(user, 'emp2');

      expect(canView).toBe(false);
    });
  });

  describe('processSensitiveFields', () => {
    const mockEmployeeData = {
      employee_id: 'emp1',
      name: 'John Doe',
      phone_encrypted: encryptionService.encrypt('13800138000'),
      id_card_encrypted: encryptionService.encrypt('110101199001011234'),
      bank_account_encrypted: encryptionService.encrypt('6222021234567890123'),
      email: 'john@example.com'
    };

    it('should decrypt sensitive fields for users with permission', () => {
      const result = permissionService.processSensitiveFields(
        mockEmployeeData,
        true,
        'mask'
      );

      expect(result.phone).toBe('13800138000');
      expect(result.id_card).toBe('110101199001011234');
      expect(result.bank_account).toBe('6222021234567890123');
      expect(result.phone_encrypted).toBeUndefined();
      expect(result.id_card_encrypted).toBeUndefined();
      expect(result.bank_account_encrypted).toBeUndefined();
    });

    it('should mask sensitive fields for users without permission', () => {
      const result = permissionService.processSensitiveFields(
        mockEmployeeData,
        false,
        'mask'
      );

      expect(result.phone).toBe('138****8000');
      expect(result.id_card).toBe('110***********1234');
      expect(result.bank_account).toContain('****');
      expect(result.phone_encrypted).toBeUndefined();
    });

    it('should handle null employee data', () => {
      const result = permissionService.processSensitiveFields(null, true, 'mask');

      expect(result).toBeNull();
    });

    it('should preserve non-sensitive fields', () => {
      const result = permissionService.processSensitiveFields(
        mockEmployeeData,
        false,
        'mask'
      );

      expect(result.employee_id).toBe('emp1');
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
    });

    it('should encrypt plaintext sensitive data', () => {
      const plaintextData = {
        employee_id: 'emp1',
        name: 'John Doe',
        phone: '13800138000',
        id_card: '110101199001011234'
      };

      const result = permissionService.processSensitiveFields(
        plaintextData,
        false,
        'encrypt'
      );

      expect(result.phone_encrypted).toBeDefined();
      expect(result.phone_encrypted).toContain(':'); // AES-GCM format: iv:authTag:encrypted
      expect(result.id_card_encrypted).toBeDefined();
      expect(result.phone).toBeUndefined();
      expect(result.id_card).toBeUndefined();
    });
  });

  describe('processEmployeeList', () => {
    it('should process multiple employees with sensitive data', () => {
      const employees = [
        {
          employee_id: 'emp1',
          name: 'John Doe',
          phone_encrypted: encryptionService.encrypt('13800138000')
        },
        {
          employee_id: 'emp2',
          name: 'Jane Smith',
          phone_encrypted: encryptionService.encrypt('13900139000')
        }
      ];

      const result = permissionService.processEmployeeList(employees, false);

      expect(result).toHaveLength(2);
      expect(result[0].phone).toBe('138****8000');
      expect(result[1].phone).toBe('139****9000');
      expect(result[0].phone_encrypted).toBeUndefined();
      expect(result[1].phone_encrypted).toBeUndefined();
    });

    it('should handle empty array', () => {
      const result = permissionService.processEmployeeList([], false);

      expect(result).toEqual([]);
    });

    it('should handle non-array input', () => {
      const result = permissionService.processEmployeeList(null, false);

      expect(result).toEqual([]);
    });
  });

  describe('canAccessResource', () => {
    it('should allow admin to access any resource', () => {
      const user = {
        data_scope: 'all'
      };

      const resource = {
        employee_id: 'emp1',
        department_id: 'dept1'
      };

      const canAccess = permissionService.canAccessResource(user, resource, 'employee');

      expect(canAccess).toBe(true);
    });

    it('should allow department manager to access own department resource', () => {
      const user = {
        data_scope: 'department',
        department_id: 'dept1'
      };

      const resource = {
        employee_id: 'emp1',
        department_id: 'dept1'
      };

      const canAccess = permissionService.canAccessResource(user, resource, 'employee');

      expect(canAccess).toBe(true);
    });

    it('should deny department manager accessing other department resource', () => {
      const user = {
        data_scope: 'department',
        department_id: 'dept1'
      };

      const resource = {
        employee_id: 'emp2',
        department_id: 'dept2'
      };

      const canAccess = permissionService.canAccessResource(user, resource, 'employee');

      expect(canAccess).toBe(false);
    });

    it('should allow employee to access own resource', () => {
      const user = {
        data_scope: 'self',
        employee_id: 'emp1'
      };

      const resource = {
        employee_id: 'emp1'
      };

      const canAccess = permissionService.canAccessResource(user, resource, 'employee');

      expect(canAccess).toBe(true);
    });

    it('should deny employee accessing other employee resource', () => {
      const user = {
        data_scope: 'self',
        employee_id: 'emp1'
      };

      const resource = {
        employee_id: 'emp2'
      };

      const canAccess = permissionService.canAccessResource(user, resource, 'employee');

      expect(canAccess).toBe(false);
    });
  });

  describe('getEditableFields', () => {
    it('should return all fields for admin', () => {
      const user = {
        data_scope: 'all'
      };

      const result = permissionService.getEditableFields(user, 'emp1');

      expect(result.canEdit).toBe(true);
      expect(result.editableFields).toContain('name');
      expect(result.editableFields).toContain('id_card');
      expect(result.editableFields).toContain('department_id');
      expect(result.editableFields).toContain('status');
    });

    it('should return limited fields for department manager', () => {
      const user = {
        data_scope: 'department',
        department_id: 'dept1'
      };

      const result = permissionService.getEditableFields(user, 'emp1');

      expect(result.canEdit).toBe(true);
      expect(result.editableFields).toContain('position');
      expect(result.editableFields).toContain('email');
      expect(result.editableFields).toContain('phone');
      expect(result.editableFields).not.toContain('name');
      expect(result.editableFields).not.toContain('department_id');
      expect(result.editableFields).not.toContain('status');
    });

    it('should return minimal fields for employee editing self', () => {
      const user = {
        data_scope: 'self',
        employee_id: 'emp1'
      };

      const result = permissionService.getEditableFields(user, 'emp1');

      expect(result.canEdit).toBe(true);
      expect(result.editableFields).toContain('phone');
      expect(result.editableFields).toContain('email');
      expect(result.editableFields).toContain('address');
      expect(result.editableFields).not.toContain('name');
      expect(result.editableFields).not.toContain('position');
      expect(result.editableFields).not.toContain('department_id');
    });

    it('should deny employee editing other employee', () => {
      const user = {
        data_scope: 'self',
        employee_id: 'emp1'
      };

      const result = permissionService.getEditableFields(user, 'emp2');

      expect(result.canEdit).toBe(false);
      expect(result.editableFields).toEqual([]);
    });
  });
});
