/**
 * User Profile API Tests
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const { User, Employee, Department } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secure_jwt_secret_here';

describe('User Profile API', () => {
  let testUser;
  let testEmployee;
  let testDepartment;
  let authToken;

  beforeAll(async () => {
    // Create test department
    testDepartment = await Department.create({
      name: 'Test Department',
      code: 'TEST',
      parent_id: null,
      level: 1,
      path: '/TEST'
    });

    // Create test employee
    testEmployee = await Employee.create({
      employee_number: 'PROF001',
      email: 'profile@test.com',
      department_id: testDepartment.department_id,
      position: 'Developer',
      status: 'active',
      entry_date: '2024-01-01'
    });

    testEmployee.setName('Profile Test User');
    testEmployee.setPhone('13800138001');
    testEmployee.setIdCard('110101199001011234');
    await testEmployee.save();

    // Create test user
    testUser = await User.create({
      employee_id: testEmployee.employee_id,
      username: 'profileuser',
      password_hash: 'test_hash',
      role: 'employee',
      data_scope: 'self',
      is_active: true
    });

    // Generate auth token
    authToken = jwt.sign(
      {
        user_id: testUser.user_id,
        username: testUser.username,
        role: testUser.role,
        employee_id: testUser.employee_id
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await User.destroy({ where: {}, force: true });
    await Employee.destroy({ where: {}, force: true });
    await Department.destroy({ where: {}, force: true });
  });

  describe('GET /api/users/profile', () => {
    test('should return user profile with employee data', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('employee');
      expect(response.body.data.user.username).toBe(testUser.username);
      expect(response.body.data.employee.employee_number).toBe('PROF001');
    });

    test('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/users/profile');

      expect(response.status).toBe(401);
    });

    test('should mask sensitive data for self', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.employee.phone).toContain('***');
      expect(response.body.data.employee.id_card).toContain('***');
    });
  });

  describe('PUT /api/users/profile', () => {
    test('should update editable profile fields', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'updated@test.com',
          emergency_contact: 'Emergency Contact',
          emergency_phone: '13900139000'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('updated@test.com');
    });

    test('should not allow updating restricted fields', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'inactive',
          role: 'admin'
        });

      expect(response.status).toBe(403);
    });

    test('should validate email format', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'invalid-email'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/users/profile/employee', () => {
    test('should return full employee information', async () => {
      const response = await request(app)
        .get('/api/users/profile/employee')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('employee_id');
      expect(response.body.data).toHaveProperty('department');
    });

    test('should include department information', async () => {
      const response = await request(app)
        .get('/api/users/profile/employee')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.department).toBeDefined();
      expect(response.body.data.department.name).toBe('Test Department');
    });
  });
});
