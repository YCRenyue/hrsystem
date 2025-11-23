/**
 * Permission Middleware Tests
 *
 * Tests for fine-grained permission checking middleware
 */

const {
  checkPermission,
  checkDataScope,
  requireDepartmentAccess,
  checkSensitiveDataAccess,
  checkEditableFields,
} = require('../middleware/permission');
const { User } = require('../models');

// Mock request, response, and next
const mockRequest = (userData = {}) => ({
  user: userData,
  params: {},
  query: {},
  body: {},
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

// Mock User model methods
jest.mock('../models', () => ({
  User: {
    findByPk: jest.fn(),
  },
}));

describe('Permission Middleware Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkPermission middleware', () => {
    test('should allow admin with wildcard permission', async () => {
      const req = mockRequest({
        user_id: 'admin-1',
        role: 'admin',
        permissions: ['*'],
      });
      const res = mockResponse();
      const next = mockNext;

      const middleware = checkPermission('employees.view_all');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should allow user with exact permission match', async () => {
      const req = mockRequest({
        user_id: 'hr-1',
        role: 'hr_admin',
        permissions: ['employees.view_all', 'employees.create'],
      });
      const res = mockResponse();
      const next = mockNext;

      const middleware = checkPermission('employees.view_all');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should allow user with wildcard permission match', async () => {
      const req = mockRequest({
        user_id: 'hr-1',
        role: 'hr_admin',
        permissions: ['employees.*', 'reports.view_all'],
      });
      const res = mockResponse();
      const next = mockNext;

      const middleware = checkPermission('employees.view_all');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should deny user without required permission', async () => {
      const req = mockRequest({
        user_id: 'emp-1',
        role: 'employee',
        permissions: ['employees.view_self'],
      });
      const res = mockResponse();
      const next = mockNext;

      const middleware = checkPermission('employees.view_all');
      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Permission Denied',
          requiredPermission: 'employees.view_all',
        })
      );
    });

    test('should return 401 when user is not authenticated', async () => {
      const req = { user: null, params: {}, query: {}, body: {} }; // No user
      const res = mockResponse();
      const next = mockNext;

      const middleware = checkPermission('employees.view_all');
      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Unauthorized',
        })
      );
    });
  });

  describe('checkDataScope middleware', () => {
    test('should attach data scope filter for admin (all scope)', async () => {
      const mockUser = {
        user_id: 'admin-1',
        role: 'admin',
        data_scope: 'all',
        getDataScopeFilter: jest.fn().mockReturnValue({}),
      };

      const req = mockRequest(mockUser);
      const res = mockResponse();
      const next = mockNext;

      const middleware = checkDataScope('employee');
      await middleware(req, res, next);

      expect(mockUser.getDataScopeFilter).toHaveBeenCalledWith('employee');
      expect(req.dataScopeFilter).toEqual({});
      expect(req.dataScope).toBe('all');
      expect(next).toHaveBeenCalled();
    });

    test('should attach data scope filter for department manager', async () => {
      const mockUser = {
        user_id: 'manager-1',
        role: 'department_manager',
        data_scope: 'department',
        department_id: 'dept-123',
        getDataScopeFilter: jest.fn().mockReturnValue({ department_id: 'dept-123' }),
      };

      const req = mockRequest(mockUser);
      const res = mockResponse();
      const next = mockNext;

      const middleware = checkDataScope('employee');
      await middleware(req, res, next);

      expect(mockUser.getDataScopeFilter).toHaveBeenCalledWith('employee');
      expect(req.dataScopeFilter).toEqual({ department_id: 'dept-123' });
      expect(req.dataScope).toBe('department');
      expect(next).toHaveBeenCalled();
    });

    test('should attach data scope filter for employee (self scope)', async () => {
      const mockUser = {
        user_id: 'emp-1',
        role: 'employee',
        data_scope: 'self',
        employee_id: 'emp-123',
        getDataScopeFilter: jest.fn().mockReturnValue({ employee_id: 'emp-123' }),
      };

      const req = mockRequest(mockUser);
      const res = mockResponse();
      const next = mockNext;

      const middleware = checkDataScope('employee');
      await middleware(req, res, next);

      expect(mockUser.getDataScopeFilter).toHaveBeenCalledWith('employee');
      expect(req.dataScopeFilter).toEqual({ employee_id: 'emp-123' });
      expect(req.dataScope).toBe('self');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireDepartmentAccess middleware', () => {
    test('should allow admin to access any department', async () => {
      const mockUser = {
        user_id: 'admin-1',
        role: 'admin',
        data_scope: 'all',
        canAccessDepartment: jest.fn().mockReturnValue(true),
      };

      const req = mockRequest(mockUser);
      req.params = { departmentId: 'dept-456' };
      const res = mockResponse();
      const next = mockNext;

      const middleware = requireDepartmentAccess('departmentId');
      await middleware(req, res, next);

      expect(mockUser.canAccessDepartment).toHaveBeenCalledWith('dept-456');
      expect(next).toHaveBeenCalled();
    });

    test('should allow department manager to access their own department', async () => {
      const mockUser = {
        user_id: 'manager-1',
        role: 'department_manager',
        data_scope: 'department',
        department_id: 'dept-123',
        canAccessDepartment: jest.fn().mockReturnValue(true),
      };

      const req = mockRequest(mockUser);
      req.params = { departmentId: 'dept-123' };
      const res = mockResponse();
      const next = mockNext;

      const middleware = requireDepartmentAccess('departmentId');
      await middleware(req, res, next);

      expect(mockUser.canAccessDepartment).toHaveBeenCalledWith('dept-123');
      expect(next).toHaveBeenCalled();
    });

    test('should deny department manager access to other departments', async () => {
      const mockUser = {
        user_id: 'manager-1',
        role: 'department_manager',
        data_scope: 'department',
        department_id: 'dept-123',
        canAccessDepartment: jest.fn().mockReturnValue(false),
      };

      const req = mockRequest(mockUser);
      req.params = { departmentId: 'dept-456' };
      const res = mockResponse();
      const next = mockNext;

      const middleware = requireDepartmentAccess('departmentId');
      await middleware(req, res, next);

      expect(mockUser.canAccessDepartment).toHaveBeenCalledWith('dept-456');
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Permission Denied',
        })
      );
    });

    test('should return 400 when department ID is missing', async () => {
      const mockUser = {
        user_id: 'manager-1',
        role: 'department_manager',
        canAccessDepartment: jest.fn(),
      };

      const req = mockRequest(mockUser);
      req.params = {}; // No department ID
      const res = mockResponse();
      const next = mockNext;

      const middleware = requireDepartmentAccess('departmentId');
      await middleware(req, res, next);

      expect(mockUser.canAccessDepartment).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('checkSensitiveDataAccess middleware', () => {
    test('should allow admin to view all sensitive data', async () => {
      const mockUser = {
        user_id: 'admin-1',
        role: 'admin',
        data_scope: 'all',
        can_view_sensitive: true,
        canViewSensitiveData: jest.fn().mockReturnValue(true),
      };

      const req = mockRequest(mockUser);
      req.params = { id: 'emp-123' };
      const res = mockResponse();
      const next = mockNext;

      const middleware = checkSensitiveDataAccess('id');
      await middleware(req, res, next);

      expect(mockUser.canViewSensitiveData).toHaveBeenCalledWith('emp-123');
      expect(req.canViewSensitive).toBe(true);
      expect(next).toHaveBeenCalled();
    });

    test('should allow employee to view their own sensitive data', async () => {
      const mockUser = {
        user_id: 'emp-1',
        role: 'employee',
        employee_id: 'emp-123',
        data_scope: 'self',
        can_view_sensitive: false,
        canViewSensitiveData: jest.fn().mockReturnValue(true),
      };

      const req = mockRequest(mockUser);
      req.params = { id: 'emp-123' };
      const res = mockResponse();
      const next = mockNext;

      const middleware = checkSensitiveDataAccess('id');
      await middleware(req, res, next);

      expect(mockUser.canViewSensitiveData).toHaveBeenCalledWith('emp-123');
      expect(req.canViewSensitive).toBe(true);
      expect(next).toHaveBeenCalled();
    });

    test('should deny employee viewing other employee sensitive data', async () => {
      const mockUser = {
        user_id: 'emp-1',
        role: 'employee',
        employee_id: 'emp-123',
        data_scope: 'self',
        can_view_sensitive: false,
        canViewSensitiveData: jest.fn().mockReturnValue(false),
      };

      const req = mockRequest(mockUser);
      req.params = { id: 'emp-456' };
      const res = mockResponse();
      const next = mockNext;

      const middleware = checkSensitiveDataAccess('id');
      await middleware(req, res, next);

      expect(mockUser.canViewSensitiveData).toHaveBeenCalledWith('emp-456');
      expect(req.canViewSensitive).toBe(false);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('checkEditableFields middleware', () => {
    test('should allow admin to edit all fields', async () => {
      const mockUser = {
        user_id: 'admin-1',
        role: 'admin',
        canEditEmployeeFields: jest.fn().mockReturnValue({
          canEdit: true,
          editableFields: ['name', 'email', 'phone', 'department_id'],
        }),
      };

      const req = mockRequest(mockUser);
      req.params = { id: 'emp-123' };
      req.body = { name: 'New Name', email: 'new@email.com', phone: '1234567890', department_id: 'dept-456' };
      const res = mockResponse();
      const next = mockNext;

      const middleware = checkEditableFields('id');
      await middleware(req, res, next);

      expect(mockUser.canEditEmployeeFields).toHaveBeenCalledWith(
        'emp-123',
        ['name', 'email', 'phone', 'department_id']
      );
      expect(req.editableFields).toEqual(['name', 'email', 'phone', 'department_id']);
      expect(next).toHaveBeenCalled();
    });

    test('should allow department manager to edit limited fields', async () => {
      const mockUser = {
        user_id: 'manager-1',
        role: 'department_manager',
        canEditEmployeeFields: jest.fn().mockReturnValue({
          canEdit: true,
          editableFields: ['phone', 'email'],
        }),
      };

      const req = mockRequest(mockUser);
      req.params = { id: 'emp-123' };
      req.body = { phone: '1234567890', email: 'new@email.com' };
      const res = mockResponse();
      const next = mockNext;

      const middleware = checkEditableFields('id');
      await middleware(req, res, next);

      expect(mockUser.canEditEmployeeFields).toHaveBeenCalledWith(
        'emp-123',
        ['phone', 'email']
      );
      expect(req.editableFields).toEqual(['phone', 'email']);
      expect(next).toHaveBeenCalled();
    });

    test('should deny editing non-editable fields', async () => {
      const mockUser = {
        user_id: 'manager-1',
        role: 'department_manager',
        canEditEmployeeFields: jest.fn().mockReturnValue({
          canEdit: true,
          editableFields: ['phone', 'email'],
        }),
      };

      const req = mockRequest(mockUser);
      req.params = { id: 'emp-123' };
      req.body = { phone: '1234567890', email: 'new@email.com', name: 'New Name' }; // 'name' not allowed
      const res = mockResponse();
      const next = mockNext;

      const middleware = checkEditableFields('id');
      await middleware(req, res, next);

      expect(mockUser.canEditEmployeeFields).toHaveBeenCalledWith(
        'emp-123',
        ['phone', 'email', 'name']
      );
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Permission Denied',
          nonEditableFields: ['name'],
        })
      );
    });

    test('should deny when user cannot edit employee at all', async () => {
      const mockUser = {
        user_id: 'emp-1',
        role: 'employee',
        employee_id: 'emp-456',
        canEditEmployeeFields: jest.fn().mockReturnValue({
          canEdit: false,
          editableFields: [],
        }),
      };

      const req = mockRequest(mockUser);
      req.params = { id: 'emp-123' }; // Different employee
      req.body = { phone: '1234567890' };
      const res = mockResponse();
      const next = mockNext;

      const middleware = checkEditableFields('id');
      await middleware(req, res, next);

      expect(mockUser.canEditEmployeeFields).toHaveBeenCalledWith('emp-123', ['phone']);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Permission Denied',
          message: '您没有权限编辑该员工的信息',
        })
      );
    });
  });
});
