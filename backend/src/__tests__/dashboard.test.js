/**
 * Dashboard API Tests
 */
const request = require('supertest');
const app = require('../app');
const { Employee, Department, sequelize } = require('../models');

describe('Dashboard API', () => {
  let authToken;
  let testDepartments = [];
  const testEmployees = [];

  beforeAll(async () => {
    await sequelize.authenticate();

    // Clean up existing test data
    await Employee.destroy({ where: { employee_number: { [require('sequelize').Op.like]: 'DASH%' } }, force: true });
    await Department.destroy({ where: { code: { [require('sequelize').Op.like]: 'DASH%' } }, force: true });

    // Create test departments
    testDepartments = await Department.bulkCreate([
      { name: '测试技术部', code: 'DASHTECH', description: '测试技术部门' },
      { name: '测试人力部', code: 'DASHHR', description: '测试人力部门' },
      { name: '测试销售部', code: 'DASHSALES', description: '测试销售部门' }
    ]);

    // Create test employees
    const employeesData = [
      {
        employee_number: 'DASH001',
        email: 'dash001@test.com',
        department_id: testDepartments[0].department_id,
        position: '工程师',
        status: 'active',
        data_complete: true,
        created_by: 'test'
      },
      {
        employee_number: 'DASH002',
        email: 'dash002@test.com',
        department_id: testDepartments[0].department_id,
        position: '工程师',
        status: 'active',
        data_complete: false,
        created_by: 'test'
      },
      {
        employee_number: 'DASH003',
        email: 'dash003@test.com',
        department_id: testDepartments[1].department_id,
        position: 'HR',
        status: 'active',
        data_complete: true,
        created_by: 'test'
      },
      {
        employee_number: 'DASH004',
        email: 'dash004@test.com',
        department_id: testDepartments[2].department_id,
        position: '销售',
        status: 'pending',
        data_complete: false,
        created_by: 'test'
      },
      {
        employee_number: 'DASH005',
        email: 'dash005@test.com',
        department_id: testDepartments[2].department_id,
        position: '销售',
        status: 'inactive',
        data_complete: true,
        created_by: 'test'
      }
    ];

    for (const empData of employeesData) {
      const emp = Employee.build(empData);
      emp.setName('测试员工');
      emp.setPhone('13800000000');
      await emp.save();
      testEmployees.push(emp);
    }
  });

  afterAll(async () => {
    // Clean up test data
    for (const emp of testEmployees) {
      await Employee.destroy({ where: { employee_id: emp.employee_id }, force: true });
    }
    for (const dept of testDepartments) {
      await Department.destroy({ where: { department_id: dept.department_id }, force: true });
    }
    await sequelize.close();
  });

  beforeEach(async () => {
    // Login as admin before each test
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'password123'
      });

    if (response.body.success) {
      authToken = response.body.data.token;
    }
  });

  describe('GET /api/dashboard/stats', () => {
    it('should return dashboard statistics', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalEmployees');
      expect(response.body.data).toHaveProperty('totalDepartments');
      expect(response.body.data).toHaveProperty('pendingEmployees');
      expect(response.body.data).toHaveProperty('completionRate');
      expect(response.body.data).toHaveProperty('employeesByDepartment');
      expect(response.body.data).toHaveProperty('employeesByStatus');
    });

    it('should return correct employee counts', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.totalEmployees).toBeGreaterThanOrEqual(3); // At least our 3 active test employees
      expect(response.body.data.pendingEmployees).toBeGreaterThanOrEqual(1); // At least 1 pending
    });

    it('should return employee distribution by department', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data.employeesByDepartment)).toBe(true);
    });

    it('should return employee distribution by status', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data.employeesByStatus)).toBe(true);
      expect(response.body.data.employeesByStatus.length).toBeGreaterThan(0);
    });

    it('should calculate completion rate correctly', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.completionRate).toBeGreaterThanOrEqual(0);
      expect(response.body.data.completionRate).toBeLessThanOrEqual(100);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats');

      expect([401, 403]).toContain(response.status);
    });
  });
});
