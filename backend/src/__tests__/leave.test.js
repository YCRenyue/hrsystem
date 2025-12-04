/**
 * Leave Controller Tests
 */

const request = require('supertest');
const app = require('../app');
const { Employee, Leave, Department, User } = require('../models');
const { sequelize } = require('../config/database');

describe('Leave Controller', () => {
  let adminToken;
  let testEmployee;
  let testDepartment;
  let adminUser;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    // Create test department
    testDepartment = await Department.create({
      name: '技术部',
      code: 'TECH',
      parent_id: null
    });

    // Create admin user
    const bcrypt = require('bcryptjs');
    adminUser = await User.create({
      username: 'admin',
      password_hash: await bcrypt.hash('admin123', 10),
      email: 'admin@test.com',
      role: 'admin'
    });

    // Login to get token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });

    adminToken = loginRes.body.token;

    // Create test employee
    testEmployee = await Employee.create({
      employee_number: 'EMP001',
      name_encrypted: 'test_name',
      name_hash: 'test_hash',
      department_id: testDepartment.department_id,
      status: 'active',
      data_complete: true
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/leaves', () => {
    it('should create leave application', async () => {
      const res = await request(app)
        .post('/api/leaves')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employee_id: testEmployee.employee_id,
          leave_type: 'annual',
          start_date: '2025-12-10',
          end_date: '2025-12-12',
          days: 3.0,
          reason: 'Family vacation'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.leave_type).toBe('annual');
      expect(res.body.data.status).toBe('pending');
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/leaves')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employee_id: testEmployee.employee_id
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/leaves', () => {
    beforeEach(async () => {
      await Leave.destroy({ where: {} });
    });

    it('should get leave list with pagination', async () => {
      await Leave.create({
        employee_id: testEmployee.employee_id,
        leave_type: 'annual',
        start_date: '2025-12-01',
        end_date: '2025-12-03',
        days: 3.0,
        status: 'pending'
      });

      const res = await request(app)
        .get('/api/leaves')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, size: 10 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.rows)).toBe(true);
    });

    it('should filter by employee_id', async () => {
      await Leave.create({
        employee_id: testEmployee.employee_id,
        leave_type: 'sick',
        start_date: '2025-12-01',
        end_date: '2025-12-01',
        days: 1.0,
        status: 'approved'
      });

      const res = await request(app)
        .get('/api/leaves')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ employee_id: testEmployee.employee_id });

      expect(res.status).toBe(200);
      expect(res.body.data.rows.length).toBeGreaterThan(0);
    });

    it('should filter by leave_type', async () => {
      await Leave.create({
        employee_id: testEmployee.employee_id,
        leave_type: 'sick',
        start_date: '2025-12-01',
        end_date: '2025-12-01',
        days: 1.0,
        status: 'pending'
      });

      const res = await request(app)
        .get('/api/leaves')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ leave_type: 'sick' });

      expect(res.status).toBe(200);
      expect(res.body.data.rows.length).toBeGreaterThan(0);
    });

    it('should filter by status', async () => {
      await Leave.create({
        employee_id: testEmployee.employee_id,
        leave_type: 'annual',
        start_date: '2025-12-01',
        end_date: '2025-12-01',
        days: 1.0,
        status: 'pending'
      });

      const res = await request(app)
        .get('/api/leaves')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: 'pending' });

      expect(res.status).toBe(200);
      expect(res.body.data.rows.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/leaves/stats', () => {
    beforeEach(async () => {
      await Leave.destroy({ where: {} });
    });

    it('should get leave statistics', async () => {
      await Leave.bulkCreate([
        {
          employee_id: testEmployee.employee_id,
          leave_type: 'annual',
          start_date: '2025-12-01',
          end_date: '2025-12-03',
          days: 3.0,
          status: 'approved'
        },
        {
          employee_id: testEmployee.employee_id,
          leave_type: 'sick',
          start_date: '2025-12-05',
          end_date: '2025-12-05',
          days: 1.0,
          status: 'pending'
        }
      ]);

      const res = await request(app)
        .get('/api/leaves/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalApplications');
      expect(res.body.data).toHaveProperty('pendingCount');
      expect(res.body.data).toHaveProperty('byType');
      expect(res.body.data).toHaveProperty('byStatus');
    });
  });

  describe('PUT /api/leaves/:id', () => {
    it('should update leave application', async () => {
      const leave = await Leave.create({
        employee_id: testEmployee.employee_id,
        leave_type: 'annual',
        start_date: '2025-12-01',
        end_date: '2025-12-03',
        days: 3.0,
        status: 'pending'
      });

      const res = await request(app)
        .put(`/api/leaves/${leave.leave_id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'approved',
          approver_id: adminUser.user_id,
          approval_notes: 'Approved'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('approved');
    });
  });

  describe('DELETE /api/leaves/:id', () => {
    it('should delete leave application', async () => {
      const leave = await Leave.create({
        employee_id: testEmployee.employee_id,
        leave_type: 'annual',
        start_date: '2025-12-01',
        end_date: '2025-12-01',
        days: 1.0,
        status: 'pending'
      });

      const res = await request(app)
        .delete(`/api/leaves/${leave.leave_id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const found = await Leave.findByPk(leave.leave_id);
      expect(found).toBeNull();
    });
  });
});
