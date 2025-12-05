/**
 * Attendance Controller Tests
 */

const request = require('supertest');
const app = require('../app');
const {
  Employee, Attendance, Department, User
} = require('../models');
const { sequelize } = require('../config/database');

describe('Attendance Controller', () => {
  let adminToken;
  let testEmployee;
  let testDepartment;

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
    const adminUser = await User.create({
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

  describe('POST /api/attendances', () => {
    it('should create attendance record', async () => {
      const res = await request(app)
        .post('/api/attendances')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employee_id: testEmployee.employee_id,
          date: '2025-12-04',
          check_in_time: '09:00:00',
          check_out_time: '18:00:00',
          status: 'normal',
          work_hours: 8.0
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.date).toBe('2025-12-04');
    });

    it('should not create duplicate attendance for same employee and date', async () => {
      await Attendance.create({
        employee_id: testEmployee.employee_id,
        date: '2025-12-05',
        status: 'normal'
      });

      const res = await request(app)
        .post('/api/attendances')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employee_id: testEmployee.employee_id,
          date: '2025-12-05',
          check_in_time: '09:00:00'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/attendances', () => {
    beforeEach(async () => {
      await Attendance.destroy({ where: {} });
    });

    it('should get attendance list with pagination', async () => {
      // Create test data
      await Attendance.create({
        employee_id: testEmployee.employee_id,
        date: '2025-12-01',
        status: 'normal'
      });

      const res = await request(app)
        .get('/api/attendances')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, size: 10 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.rows)).toBe(true);
    });

    it('should filter by employee_id', async () => {
      await Attendance.create({
        employee_id: testEmployee.employee_id,
        date: '2025-12-01',
        status: 'normal'
      });

      const res = await request(app)
        .get('/api/attendances')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ employee_id: testEmployee.employee_id });

      expect(res.status).toBe(200);
      expect(res.body.data.rows.length).toBeGreaterThan(0);
    });

    it('should filter by date range', async () => {
      await Attendance.create({
        employee_id: testEmployee.employee_id,
        date: '2025-12-01',
        status: 'normal'
      });

      const res = await request(app)
        .get('/api/attendances')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          start_date: '2025-12-01',
          end_date: '2025-12-31'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.rows.length).toBeGreaterThan(0);
    });

    it('should filter by status', async () => {
      await Attendance.create({
        employee_id: testEmployee.employee_id,
        date: '2025-12-01',
        status: 'late'
      });

      const res = await request(app)
        .get('/api/attendances')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: 'late' });

      expect(res.status).toBe(200);
      expect(res.body.data.rows.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/attendances/stats', () => {
    beforeEach(async () => {
      await Attendance.destroy({ where: {} });
    });

    it('should get attendance statistics', async () => {
      // Create test data
      await Attendance.bulkCreate([
        {
          employee_id: testEmployee.employee_id,
          date: '2025-12-01',
          status: 'normal'
        },
        {
          employee_id: testEmployee.employee_id,
          date: '2025-12-02',
          status: 'late'
        },
        {
          employee_id: testEmployee.employee_id,
          date: '2025-12-03',
          status: 'absent'
        }
      ]);

      const res = await request(app)
        .get('/api/attendances/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalRecords');
      expect(res.body.data).toHaveProperty('byStatus');
    });
  });

  describe('PUT /api/attendances/:id', () => {
    it('should update attendance record', async () => {
      const attendance = await Attendance.create({
        employee_id: testEmployee.employee_id,
        date: '2025-12-01',
        status: 'normal'
      });

      const res = await request(app)
        .put(`/api/attendances/${attendance.attendance_id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'late',
          late_minutes: 30
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('late');
      expect(res.body.data.late_minutes).toBe(30);
    });
  });

  describe('DELETE /api/attendances/:id', () => {
    it('should delete attendance record', async () => {
      const attendance = await Attendance.create({
        employee_id: testEmployee.employee_id,
        date: '2025-12-01',
        status: 'normal'
      });

      const res = await request(app)
        .delete(`/api/attendances/${attendance.attendance_id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const found = await Attendance.findByPk(attendance.attendance_id);
      expect(found).toBeNull();
    });
  });
});
