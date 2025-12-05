/**
 * Employee Status Transition Tests
 * 测试员工状态流转逻辑
 */

const EmployeeStatusService = require('../services/EmployeeStatusService');
const Employee = require('../models/Employee');

jest.mock('../models/Employee');

describe('EmployeeStatusService', () => {
  let statusService;
  let mockEmployee;

  beforeEach(() => {
    statusService = new EmployeeStatusService();

    mockEmployee = {
      employee_id: 'test-uuid',
      employee_number: 'EMP001',
      status: 'pending',
      entry_date: null,
      probation_end_date: null,
      leave_date: null,
      save: jest.fn().mockResolvedValue(true)
    };

    Employee.findByPk = jest.fn().mockResolvedValue(mockEmployee);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canTransition', () => {
    test('should allow pending -> active transition', () => {
      const result = statusService.canTransition('pending', 'active');
      expect(result).toBe(true);
    });

    test('should allow active -> inactive transition', () => {
      const result = statusService.canTransition('active', 'inactive');
      expect(result).toBe(true);
    });

    test('should not allow invalid transitions', () => {
      const result = statusService.canTransition('inactive', 'pending');
      expect(result).toBe(false);
    });

    test('should not allow same status transition', () => {
      const result = statusService.canTransition('active', 'active');
      expect(result).toBe(false);
    });
  });

  describe('activate', () => {
    test('should activate pending employee', async () => {
      const result = await statusService.activate('test-uuid');

      expect(result.success).toBe(true);
      expect(mockEmployee.status).toBe('active');
      expect(mockEmployee.save).toHaveBeenCalled();
    });

    test('should set probation end date when activating', async () => {
      const probationMonths = 3;
      await statusService.activate('test-uuid', probationMonths);

      expect(mockEmployee.probation_end_date).toBeDefined();
    });

    test('should throw error when employee not found', async () => {
      Employee.findByPk.mockResolvedValue(null);

      await expect(statusService.activate('invalid-id'))
        .rejects.toThrow('Employee not found');
    });
  });

  describe('deactivate', () => {
    test('should deactivate active employee', async () => {
      mockEmployee.status = 'active';

      const result = await statusService.deactivate('test-uuid');

      expect(result.success).toBe(true);
      expect(mockEmployee.status).toBe('inactive');
      expect(mockEmployee.leave_date).toBeDefined();
    });

    test('should not allow deactivating pending employee', async () => {
      mockEmployee.status = 'pending';

      await expect(statusService.deactivate('test-uuid'))
        .rejects.toThrow('Invalid status transition');
    });
  });

  describe('getStatusTransitions', () => {
    test('should return available transitions for status', () => {
      const transitions = statusService.getStatusTransitions('pending');

      expect(transitions).toContain('active');
      expect(transitions.length).toBeGreaterThan(0);
    });

    test('should return empty array for invalid status', () => {
      const transitions = statusService.getStatusTransitions('invalid');

      expect(transitions).toEqual([]);
    });
  });
});
