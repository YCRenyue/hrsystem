/**
 * Report Service Tests
 *
 * 测试报表服务的各项功能
 */

const reportService = require('../services/ReportService');
const {
  Employee, Leave, Attendance, Department
} = require('../models');

// Mock the models
jest.mock('../models', () => ({
  Employee: {
    findAll: jest.fn()
  },
  Leave: {
    findAll: jest.fn()
  },
  Attendance: {
    findAll: jest.fn()
  },
  Department: {}
}));

describe('ReportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLeaveReport', () => {
    const mockUser = {
      user_id: 'user1',
      employee_id: 'emp1',
      department_id: 'dept1',
      data_scope: 'all'
    };

    const mockLeaves = [
      {
        leave_id: 'leave1',
        employee_id: 'emp1',
        leave_type: 'annual',
        start_date: '2025-01-01',
        end_date: '2025-01-03',
        days: 3,
        reason: 'Vacation',
        status: 'approved',
        employee: {
          employee_id: 'emp1',
          employee_number: 'EMP001',
          name: 'John Doe',
          department_id: 'dept1',
          department: {
            department_id: 'dept1',
            name: 'IT'
          }
        }
      },
      {
        leave_id: 'leave2',
        employee_id: 'emp2',
        leave_type: 'sick',
        start_date: '2025-01-05',
        end_date: '2025-01-06',
        days: 2,
        reason: 'Illness',
        status: 'approved',
        employee: {
          employee_id: 'emp2',
          employee_number: 'EMP002',
          name: 'Jane Smith',
          department_id: 'dept1',
          department: {
            department_id: 'dept1',
            name: 'IT'
          }
        }
      }
    ];

    it('should generate leave report for admin with all data', async () => {
      Leave.findAll.mockResolvedValue(mockLeaves);

      const filters = {
        start_date: '2025-01-01',
        end_date: '2025-01-31',
        status: 'approved'
      };

      const result = await reportService.getLeaveReport(mockUser, filters);

      expect(result).toBeDefined();
      expect(result.leaves).toHaveLength(2);
      expect(result.statistics.total_leaves).toBe(2);
      expect(result.statistics.total_days).toBe(5);
      expect(result.byType).toBeDefined();
      expect(result.byType.length).toBeGreaterThan(0);
      expect(result.byDepartment).toBeDefined();
    });

    it('should filter by leave type', async () => {
      const annualLeaves = mockLeaves.filter((l) => l.leave_type === 'annual');
      Leave.findAll.mockResolvedValue(annualLeaves);

      const filters = {
        leave_type: 'annual',
        status: 'approved'
      };

      const result = await reportService.getLeaveReport(mockUser, filters);

      expect(result.leaves).toHaveLength(1);
      expect(result.leaves[0].leave_type).toBe('annual');
    });

    it('should apply department filter for department manager', async () => {
      const deptManager = {
        ...mockUser,
        data_scope: 'department'
      };

      Leave.findAll.mockResolvedValue(mockLeaves);

      const result = await reportService.getLeaveReport(deptManager, {});

      expect(Leave.findAll).toHaveBeenCalled();
      const callArgs = Leave.findAll.mock.calls[0][0];
      expect(callArgs.include[0].where).toHaveProperty('department_id', 'dept1');
    });

    it('should apply self filter for regular employee', async () => {
      const employee = {
        ...mockUser,
        data_scope: 'self'
      };

      const selfLeaves = mockLeaves.filter((l) => l.employee_id === employee.employee_id);
      Leave.findAll.mockResolvedValue(selfLeaves);

      const result = await reportService.getLeaveReport(employee, {});

      expect(Leave.findAll).toHaveBeenCalled();
      const callArgs = Leave.findAll.mock.calls[0][0];
      expect(callArgs.include[0].where).toHaveProperty('employee_id', employee.employee_id);
    });

    it('should calculate statistics correctly', async () => {
      Leave.findAll.mockResolvedValue(mockLeaves);

      const result = await reportService.getLeaveReport(mockUser, {});

      expect(result.statistics.total_leaves).toBe(2);
      expect(result.statistics.total_days).toBe(5);
      expect(result.statistics.avg_days).toBe('2.5');
    });

    it('should group leaves by type correctly', async () => {
      Leave.findAll.mockResolvedValue(mockLeaves);

      const result = await reportService.getLeaveReport(mockUser, {});

      expect(result.byType).toBeDefined();
      const annualType = result.byType.find((t) => t.type === 'annual');
      expect(annualType).toBeDefined();
      expect(annualType.count).toBe(1);
      expect(annualType.total_days).toBe(3);

      const sickType = result.byType.find((t) => t.type === 'sick');
      expect(sickType).toBeDefined();
      expect(sickType.count).toBe(1);
      expect(sickType.total_days).toBe(2);
    });

    it('should handle empty results', async () => {
      Leave.findAll.mockResolvedValue([]);

      const result = await reportService.getLeaveReport(mockUser, {});

      expect(result.leaves).toHaveLength(0);
      expect(result.statistics.total_leaves).toBe(0);
      expect(result.statistics.total_days).toBe(0);
      expect(result.statistics.avg_days).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      Leave.findAll.mockRejectedValue(new Error('Database error'));

      await expect(reportService.getLeaveReport(mockUser, {}))
        .rejects
        .toThrow('Database error');
    });
  });

  describe('getAttendanceReport', () => {
    const mockUser = {
      user_id: 'user1',
      employee_id: 'emp1',
      department_id: 'dept1',
      data_scope: 'all'
    };

    const mockAttendances = [
      {
        attendance_id: 'att1',
        employee_id: 'emp1',
        date: '2025-01-02',
        check_in_time: '09:00:00',
        check_out_time: '18:00:00',
        status: 'normal',
        late_minutes: 0,
        early_leave_minutes: 0,
        work_hours: 8,
        overtime_hours: 0,
        employee: {
          employee_id: 'emp1',
          employee_number: 'EMP001',
          name: 'John Doe',
          department_id: 'dept1',
          department: {
            department_id: 'dept1',
            name: 'IT'
          }
        }
      },
      {
        attendance_id: 'att2',
        employee_id: 'emp2',
        date: '2025-01-02',
        check_in_time: '09:30:00',
        check_out_time: '18:00:00',
        status: 'late',
        late_minutes: 30,
        early_leave_minutes: 0,
        work_hours: 7.5,
        overtime_hours: 0,
        employee: {
          employee_id: 'emp2',
          employee_number: 'EMP002',
          name: 'Jane Smith',
          department_id: 'dept1',
          department: {
            department_id: 'dept1',
            name: 'IT'
          }
        }
      }
    ];

    it('should generate attendance report', async () => {
      Attendance.findAll.mockResolvedValue(mockAttendances);

      const filters = {
        start_date: '2025-01-01',
        end_date: '2025-01-31'
      };

      const result = await reportService.getAttendanceReport(mockUser, filters);

      expect(result).toBeDefined();
      expect(result.attendances).toHaveLength(2);
      expect(result.statistics.total).toBe(2);
      expect(result.byStatus).toBeDefined();
    });

    it('should calculate attendance statistics correctly', async () => {
      Attendance.findAll.mockResolvedValue(mockAttendances);

      const result = await reportService.getAttendanceReport(mockUser, {});

      expect(result.statistics.total).toBe(2);
      expect(result.statistics.normal).toBe(1);
      expect(result.statistics.late).toBe(1);
      expect(result.statistics.total_late_minutes).toBe(30);
      expect(result.statistics.total_work_hours).toBe(15.5);
    });

    it('should identify abnormal records', async () => {
      Attendance.findAll.mockResolvedValue(mockAttendances);

      const result = await reportService.getAttendanceReport(mockUser, {});

      expect(result.abnormalRecords).toBeDefined();
      expect(result.abnormalRecords.length).toBe(1);
      expect(result.abnormalRecords[0].status).toBe('late');
    });

    it('should filter by status', async () => {
      const lateAttendances = mockAttendances.filter((a) => a.status === 'late');
      Attendance.findAll.mockResolvedValue(lateAttendances);

      const filters = { status: 'late' };
      const result = await reportService.getAttendanceReport(mockUser, filters);

      expect(result.attendances).toHaveLength(1);
      expect(result.attendances[0].status).toBe('late');
    });
  });

  describe('getOnboardingOffboardingReport', () => {
    const mockUser = {
      user_id: 'user1',
      employee_id: 'emp1',
      department_id: 'dept1',
      data_scope: 'all'
    };

    const mockOnboardingEmployees = [
      {
        employee_id: 'emp1',
        employee_number: 'EMP001',
        name: 'John Doe',
        entry_date: '2025-01-15',
        status: 'active',
        department: {
          department_id: 'dept1',
          name: 'IT'
        }
      },
      {
        employee_id: 'emp2',
        employee_number: 'EMP002',
        name: 'Jane Smith',
        entry_date: '2025-01-20',
        status: 'active',
        department: {
          department_id: 'dept1',
          name: 'IT'
        }
      }
    ];

    const mockOffboardingEmployees = [
      {
        employee_id: 'emp3',
        employee_number: 'EMP003',
        name: 'Bob Wilson',
        entry_date: '2024-06-01',
        departure_date: '2025-01-10',
        status: 'inactive',
        department: {
          department_id: 'dept2',
          name: 'HR'
        }
      }
    ];

    it('should generate onboarding report', async () => {
      Employee.findAll.mockResolvedValue(mockOnboardingEmployees);

      const filters = {
        start_date: '2025-01-01',
        end_date: '2025-01-31',
        report_type: 'onboarding'
      };

      const result = await reportService.getOnboardingOffboardingReport(mockUser, filters);

      expect(result.onboarding).toBeDefined();
      expect(result.onboarding.employees).toHaveLength(2);
      expect(result.onboarding.total).toBe(2);
      expect(result.offboarding).toBeNull();
    });

    it('should generate offboarding report', async () => {
      Employee.findAll.mockResolvedValue(mockOffboardingEmployees);

      const filters = {
        start_date: '2025-01-01',
        end_date: '2025-01-31',
        report_type: 'offboarding',
        departure_date: true
      };

      const result = await reportService.getOnboardingOffboardingReport(mockUser, filters);

      expect(result.offboarding).toBeDefined();
      expect(result.offboarding.employees).toHaveLength(1);
      expect(result.offboarding.total).toBe(1);
      expect(result.onboarding).toBeNull();
    });

    it('should generate both onboarding and offboarding report', async () => {
      Employee.findAll
        .mockResolvedValueOnce(mockOnboardingEmployees)
        .mockResolvedValueOnce(mockOffboardingEmployees);

      const filters = {
        start_date: '2025-01-01',
        end_date: '2025-01-31',
        report_type: 'both',
        departure_date: true
      };

      const result = await reportService.getOnboardingOffboardingReport(mockUser, filters);

      expect(result.onboarding).toBeDefined();
      expect(result.onboarding.total).toBe(2);
      expect(result.offboarding).toBeDefined();
      expect(result.offboarding.total).toBe(1);
    });

    it('should group employees by month', async () => {
      Employee.findAll.mockResolvedValue(mockOnboardingEmployees);

      const filters = {
        report_type: 'onboarding'
      };

      const result = await reportService.getOnboardingOffboardingReport(mockUser, filters);

      expect(result.onboarding.byMonth).toBeDefined();
      expect(result.onboarding.byMonth.length).toBeGreaterThan(0);
      expect(result.onboarding.byMonth[0]).toHaveProperty('month');
      expect(result.onboarding.byMonth[0]).toHaveProperty('count');
    });
  });

  describe('_applyDataScopeFilter', () => {
    it('should allow admin to view all data', () => {
      const user = { data_scope: 'all' };
      const where = reportService._applyDataScopeFilter(user);

      expect(where).toEqual({});
    });

    it('should allow admin to filter by specific department', () => {
      const user = { data_scope: 'all' };
      const where = reportService._applyDataScopeFilter(user, 'dept1');

      expect(where).toEqual({ department_id: 'dept1' });
    });

    it('should restrict department manager to own department', () => {
      const user = {
        data_scope: 'department',
        department_id: 'dept1'
      };
      const where = reportService._applyDataScopeFilter(user);

      expect(where).toEqual({ department_id: 'dept1' });
    });

    it('should restrict employee to self only', () => {
      const user = {
        data_scope: 'self',
        employee_id: 'emp1'
      };
      const where = reportService._applyDataScopeFilter(user);

      expect(where).toEqual({ employee_id: 'emp1' });
    });
  });
});
