/**
 * Report Controller Tests
 *
 * 测试报表控制器的API端点
 */

const request = require('supertest');
const app = require('../app');
const reportService = require('../services/ReportService');

// Mock the report service
jest.mock('../services/ReportService');

// Mock auth middleware
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = {
      user_id: 'user1',
      employee_id: 'emp1',
      department_id: 'dept1',
      data_scope: 'all',
      role: 'admin'
    };
    next();
  },
  requireRole: (...roles) => (req, res, next) => next()
}));

// Mock permission middleware
jest.mock('../middleware/permission', () => ({
  checkPermission: (permission) => (req, res, next) => next()
}));

describe('Report Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/reports/leaves', () => {
    const mockLeaveReport = {
      leaves: [
        {
          leave_id: 'leave1',
          employee: {
            employee_id: 'emp1',
            employee_number: 'EMP001',
            name: 'John Doe',
            department: 'IT'
          },
          leave_type: 'annual',
          start_date: '2025-01-01',
          end_date: '2025-01-03',
          days: 3,
          status: 'approved'
        }
      ],
      statistics: {
        total_leaves: 1,
        total_days: 3,
        avg_days: '3.0'
      },
      byType: [
        {
          type: 'annual',
          name: '年假',
          count: 1,
          total_days: 3
        }
      ],
      byDepartment: null,
      total: 1
    };

    it('should return leave report successfully', async () => {
      reportService.getLeaveReport.mockResolvedValue(mockLeaveReport);

      const response = await request(app)
        .get('/api/reports/leaves')
        .query({
          start_date: '2025-01-01',
          end_date: '2025-01-31',
          status: 'approved'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockLeaveReport);
      expect(reportService.getLeaveReport).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          start_date: '2025-01-01',
          end_date: '2025-01-31',
          status: 'approved'
        })
      );
    });

    it('should handle filters correctly', async () => {
      reportService.getLeaveReport.mockResolvedValue(mockLeaveReport);

      const response = await request(app)
        .get('/api/reports/leaves')
        .query({
          leave_type: 'annual',
          department_id: 'dept1'
        });

      expect(response.status).toBe(200);
      expect(reportService.getLeaveReport).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          leave_type: 'annual',
          department_id: 'dept1'
        })
      );
    });

    it('should handle service errors', async () => {
      reportService.getLeaveReport.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/reports/leaves');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('获取假期报表失败');
    });
  });

  describe('GET /api/reports/attendance', () => {
    const mockAttendanceReport = {
      attendances: [
        {
          attendance_id: 'att1',
          employee: {
            employee_id: 'emp1',
            employee_number: 'EMP001',
            name: 'John Doe',
            department: 'IT'
          },
          date: '2025-01-02',
          check_in_time: '09:00:00',
          check_out_time: '18:00:00',
          status: 'normal',
          work_hours: 8
        }
      ],
      statistics: {
        total: 1,
        normal: 1,
        late: 0,
        early_leave: 0,
        absent: 0,
        total_work_hours: 8
      },
      byStatus: [
        {
          status: 'normal',
          name: '正常',
          count: 1
        }
      ],
      byDepartment: null,
      abnormalRecords: [],
      total: 1
    };

    it('should return attendance report successfully', async () => {
      reportService.getAttendanceReport.mockResolvedValue(mockAttendanceReport);

      const response = await request(app)
        .get('/api/reports/attendance')
        .query({
          start_date: '2025-01-01',
          end_date: '2025-01-31'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockAttendanceReport);
    });

    it('should filter by status', async () => {
      reportService.getAttendanceReport.mockResolvedValue(mockAttendanceReport);

      const response = await request(app)
        .get('/api/reports/attendance')
        .query({ status: 'late' });

      expect(response.status).toBe(200);
      expect(reportService.getAttendanceReport).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ status: 'late' })
      );
    });

    it('should handle errors gracefully', async () => {
      reportService.getAttendanceReport.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/reports/attendance');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/reports/onboarding-offboarding', () => {
    const mockOnboardingOffboardingReport = {
      onboarding: {
        employees: [
          {
            employee_id: 'emp1',
            employee_number: 'EMP001',
            name: 'John Doe',
            department: 'IT',
            entry_date: '2025-01-15',
            status: 'active'
          }
        ],
        total: 1,
        byDepartment: null,
        byMonth: [
          {
            month: '2025-01',
            count: 1
          }
        ]
      },
      offboarding: {
        employees: [],
        total: 0,
        byDepartment: null,
        byMonth: []
      },
      period: {
        start_date: '2025-01-01',
        end_date: '2025-01-31'
      }
    };

    it('should return onboarding/offboarding report successfully', async () => {
      reportService.getOnboardingOffboardingReport.mockResolvedValue(mockOnboardingOffboardingReport);

      const response = await request(app)
        .get('/api/reports/onboarding-offboarding')
        .query({
          start_date: '2025-01-01',
          end_date: '2025-01-31',
          report_type: 'both'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockOnboardingOffboardingReport);
    });

    it('should handle report_type filter', async () => {
      reportService.getOnboardingOffboardingReport.mockResolvedValue(mockOnboardingOffboardingReport);

      const response = await request(app)
        .get('/api/reports/onboarding-offboarding')
        .query({ report_type: 'onboarding' });

      expect(response.status).toBe(200);
      expect(reportService.getOnboardingOffboardingReport).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ report_type: 'onboarding' })
      );
    });

    it('should default to "both" when report_type not specified', async () => {
      reportService.getOnboardingOffboardingReport.mockResolvedValue(mockOnboardingOffboardingReport);

      const response = await request(app)
        .get('/api/reports/onboarding-offboarding');

      expect(response.status).toBe(200);
      expect(reportService.getOnboardingOffboardingReport).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ report_type: 'both' })
      );
    });

    it('should handle departure_date query param', async () => {
      reportService.getOnboardingOffboardingReport.mockResolvedValue(mockOnboardingOffboardingReport);

      const response = await request(app)
        .get('/api/reports/onboarding-offboarding')
        .query({ departure_date: 'true' });

      expect(response.status).toBe(200);
      expect(reportService.getOnboardingOffboardingReport).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ departure_date: true })
      );
    });

    it('should handle service errors', async () => {
      reportService.getOnboardingOffboardingReport.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/reports/onboarding-offboarding');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('获取入离职报表失败');
    });
  });
});
