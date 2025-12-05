/**
 * Dashboard Controller Tests
 */
const request = require('supertest');
const app = require('../app');
const { sequelize, Employee, Department, Attendance, Leave } = require('../models');
const jwt = require('jsonwebtoken');

describe('Dashboard Controller', () => {
  let authToken;
  let testDepartment;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    // Create test department
    testDepartment = await Department.create({
      department_id: 'dept-test-001',
      name: '测试部门',
      code: 'TEST-DEPT-001',
      description: '测试用部门'
    });

    // Create auth token
    authToken = jwt.sign(
      { userId: 'test-user-001', role: 'admin' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('GET /api/dashboard/stats', () => {
    beforeEach(async () => {
      // Clean up before each test
      await Employee.destroy({ where: {}, truncate: true });
      await Attendance.destroy({ where: {}, truncate: true });
      await Leave.destroy({ where: {}, truncate: true });
    });

    test('should return basic dashboard statistics', async () => {
      // Create test employees
      await Employee.create({
        employee_id: 'emp-001',
        employee_number: 'E001',
        name_encrypted: 'encrypted-name-1',
        status: 'active',
        department_id: testDepartment.department_id,
        data_complete: true
      });

      await Employee.create({
        employee_id: 'emp-002',
        employee_number: 'E002',
        name_encrypted: 'encrypted-name-2',
        status: 'pending',
        department_id: testDepartment.department_id,
        data_complete: false
      });

      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalEmployees).toBe(1);
      expect(response.body.data.pendingEmployees).toBe(1);
      expect(response.body.data.totalDepartments).toBeGreaterThan(0);
    });

    test('should calculate completion rate correctly', async () => {
      // Create 3 active employees, 2 with complete data
      await Employee.bulkCreate([
        {
          employee_id: 'emp-001',
          employee_number: 'E001',
          name_encrypted: 'encrypted-1',
          status: 'active',
          department_id: testDepartment.department_id,
          data_complete: true
        },
        {
          employee_id: 'emp-002',
          employee_number: 'E002',
          name_encrypted: 'encrypted-2',
          status: 'active',
          department_id: testDepartment.department_id,
          data_complete: true
        },
        {
          employee_id: 'emp-003',
          employee_number: 'E003',
          name_encrypted: 'encrypted-3',
          status: 'active',
          department_id: testDepartment.department_id,
          data_complete: false
        }
      ]);

      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.completionRate).toBe(67); // 2/3 = 66.67 rounded to 67
    });

    test('should return attendance statistics for current month', async () => {
      const today = new Date();
      const employee = await Employee.create({
        employee_id: 'emp-001',
        employee_number: 'E001',
        name_encrypted: 'encrypted-1',
        status: 'active',
        department_id: testDepartment.department_id
      });

      // Create attendance records
      await Attendance.bulkCreate([
        {
          attendance_id: 'att-001',
          employee_id: employee.employee_id,
          date: today,
          check_in: new Date(today.setHours(9, 0, 0)),
          status: 'normal'
        },
        {
          attendance_id: 'att-002',
          employee_id: employee.employee_id,
          date: today,
          check_in: new Date(today.setHours(10, 0, 0)),
          status: 'late'
        }
      ]);

      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.attendanceRate).toBeDefined();
      expect(response.body.data.attendanceStats).toBeDefined();
      expect(Array.isArray(response.body.data.attendanceStats)).toBe(true);
    });

    test('should return leave statistics for current month', async () => {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const employee = await Employee.create({
        employee_id: 'emp-001',
        employee_number: 'E001',
        name_encrypted: 'encrypted-1',
        status: 'active',
        department_id: testDepartment.department_id
      });

      // Create leave records
      await Leave.bulkCreate([
        {
          leave_id: 'leave-001',
          employee_id: employee.employee_id,
          leave_type: 'annual',
          start_date: firstDayOfMonth,
          end_date: new Date(firstDayOfMonth.getTime() + 86400000),
          days: 1,
          status: 'pending'
        },
        {
          leave_id: 'leave-002',
          employee_id: employee.employee_id,
          leave_type: 'sick',
          start_date: firstDayOfMonth,
          end_date: new Date(firstDayOfMonth.getTime() + 86400000),
          days: 1,
          status: 'approved'
        }
      ]);

      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.pendingLeaves).toBe(1);
      expect(response.body.data.totalLeaves).toBe(2);
      expect(response.body.data.leaveStats).toBeDefined();
    });

    test('should handle empty database gracefully', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalEmployees).toBe(0);
      expect(response.body.data.completionRate).toBe(0);
      expect(response.body.data.attendanceRate).toBe(0);
    });

    test('should require authentication', async () => {
      await request(app)
        .get('/api/dashboard/stats')
        .expect(401);
    });
  });

  describe('GET /api/dashboard/charts/department-distribution', () => {
    beforeEach(async () => {
      await Employee.destroy({ where: {}, truncate: true });
    });

    test('should return department distribution data', async () => {
      // Create another test department
      const dept2 = await Department.create({
        department_id: 'dept-test-002',
        name: '销售部门',
        code: 'SALES-DEPT-002',
        description: '销售部门'
      });

      // Create employees in different departments
      await Employee.bulkCreate([
        {
          employee_id: 'emp-001',
          employee_number: 'E001',
          name_encrypted: 'encrypted-1',
          status: 'active',
          department_id: testDepartment.department_id
        },
        {
          employee_id: 'emp-002',
          employee_number: 'E002',
          name_encrypted: 'encrypted-2',
          status: 'active',
          department_id: testDepartment.department_id
        },
        {
          employee_id: 'emp-003',
          employee_number: 'E003',
          name_encrypted: 'encrypted-3',
          status: 'active',
          department_id: dept2.department_id
        }
      ]);

      const response = await request(app)
        .get('/api/dashboard/charts/department-distribution')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('department');
      expect(response.body.data[0]).toHaveProperty('count');
    });

    test('should require authentication', async () => {
      await request(app)
        .get('/api/dashboard/charts/department-distribution')
        .expect(401);
    });
  });

  describe('GET /api/dashboard/charts/hiring-trend', () => {
    beforeEach(async () => {
      await Employee.destroy({ where: {}, truncate: true });
    });

    test('should return hiring trend data for the past 12 months', async () => {
      const today = new Date();
      const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1);

      // Create employees with different hired dates
      await Employee.bulkCreate([
        {
          employee_id: 'emp-001',
          employee_number: 'E001',
          name_encrypted: 'encrypted-1',
          status: 'active',
          department_id: testDepartment.department_id,
          hired_at: today
        },
        {
          employee_id: 'emp-002',
          employee_number: 'E002',
          name_encrypted: 'encrypted-2',
          status: 'active',
          department_id: testDepartment.department_id,
          hired_at: sixMonthsAgo
        }
      ]);

      const response = await request(app)
        .get('/api/dashboard/charts/hiring-trend')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(12); // 12 months
      expect(response.body.data[0]).toHaveProperty('month');
      expect(response.body.data[0]).toHaveProperty('hired');
    });

    test('should require authentication', async () => {
      await request(app)
        .get('/api/dashboard/charts/hiring-trend')
        .expect(401);
    });
  });

  describe('GET /api/dashboard/charts/attendance-analysis', () => {
    beforeEach(async () => {
      await Employee.destroy({ where: {}, truncate: true });
      await Attendance.destroy({ where: {}, truncate: true });
    });

    test('should return daily attendance rate for current month', async () => {
      const employee = await Employee.create({
        employee_id: 'emp-001',
        employee_number: 'E001',
        name_encrypted: 'encrypted-1',
        status: 'active',
        department_id: testDepartment.department_id
      });

      const today = new Date();
      await Attendance.bulkCreate([
        {
          attendance_id: 'att-001',
          employee_id: employee.employee_id,
          date: today,
          check_in: new Date(today.setHours(9, 0, 0)),
          status: 'normal'
        },
        {
          attendance_id: 'att-002',
          employee_id: employee.employee_id,
          date: new Date(today.getTime() - 86400000),
          check_in: new Date(today.setHours(10, 0, 0)),
          status: 'late'
        }
      ]);

      const response = await request(app)
        .get('/api/dashboard/charts/attendance-analysis')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('dailyAttendance');
      expect(response.body.data).toHaveProperty('statusDistribution');
      expect(Array.isArray(response.body.data.dailyAttendance)).toBe(true);
    });

    test('should require authentication', async () => {
      await request(app)
        .get('/api/dashboard/charts/attendance-analysis')
        .expect(401);
    });
  });

  describe('GET /api/dashboard/charts/leave-analysis', () => {
    beforeEach(async () => {
      await Employee.destroy({ where: {}, truncate: true });
      await Leave.destroy({ where: {}, truncate: true });
    });

    test('should return leave type distribution', async () => {
      const employee = await Employee.create({
        employee_id: 'emp-001',
        employee_number: 'E001',
        name_encrypted: 'encrypted-1',
        status: 'active',
        department_id: testDepartment.department_id
      });

      const today = new Date();
      await Leave.bulkCreate([
        {
          leave_id: 'leave-001',
          employee_id: employee.employee_id,
          leave_type: 'annual',
          start_date: today,
          end_date: new Date(today.getTime() + 86400000),
          days: 1,
          status: 'approved'
        },
        {
          leave_id: 'leave-002',
          employee_id: employee.employee_id,
          leave_type: 'sick',
          start_date: today,
          end_date: new Date(today.getTime() + 86400000),
          days: 2,
          status: 'approved'
        },
        {
          leave_id: 'leave-003',
          employee_id: employee.employee_id,
          leave_type: 'annual',
          start_date: today,
          end_date: new Date(today.getTime() + 86400000),
          days: 3,
          status: 'approved'
        }
      ]);

      const response = await request(app)
        .get('/api/dashboard/charts/leave-analysis')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('typeDistribution');
      expect(Array.isArray(response.body.data.typeDistribution)).toBe(true);

      const annualLeave = response.body.data.typeDistribution.find(item => item.type === 'annual');
      expect(annualLeave).toBeDefined();
      expect(annualLeave.days).toBe(4); // 1 + 3
    });

    test('should require authentication', async () => {
      await request(app)
        .get('/api/dashboard/charts/leave-analysis')
        .expect(401);
    });
  });
});
