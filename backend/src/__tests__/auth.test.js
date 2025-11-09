/**
 * Authentication Module Tests
 * Tests login, logout, JWT validation, password management
 */

const request = require('supertest');
const app = require('../app');
const { User, sequelize } = require('../models');
const { encryptionService } = require('../utils/encryption');
const jwt = require('jsonwebtoken');

describe('Authentication API', () => {
  let testUser;

  // Setup before all tests
  beforeAll(async () => {
    await sequelize.authenticate();
  });

  // Cleanup after all tests
  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.username).toBe('admin');
      expect(response.body.data.user).not.toHaveProperty('password_hash');
    });

    it('should reject invalid username', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should validate request body', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin'
          // Missing password
        });

      expect(response.status).toBe(400);
    });

    it('should update last_login_at on successful login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'password123'
        });

      expect(response.status).toBe(200);

      // Fetch user and verify last_login_at is set
      const user = await User.findOne({ where: { username: 'admin' } });
      expect(user.last_login_at).toBeTruthy();
    });

    it('should handle account lockout after failed attempts', async () => {
      // Create a test user for this test
      const passwordHash = await encryptionService.hashPassword('password123');
      const tempUser = await User.create({
        username: 'locktest_user',
        password_hash: passwordHash,
        display_name: 'Lock Test User',
        email: 'locktest@test.com',
        role: 'employee',
        permissions: ['employees:read:self'],
        status: 'active',
        is_active: true,
        login_attempts: 0,
        created_by: 'test'
      });

      // Attempt 5 failed logins
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            username: 'locktest_user',
            password: 'wrongpassword'
          });
      }

      // 6th attempt should be locked
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'locktest_user',
          password: 'password123'
        });

      // Account should be locked (either 401 with lock message or 403)
      expect([401, 403]).toContain(response.status);

      // Cleanup
      await User.destroy({ where: { user_id: tempUser.user_id }, force: true });
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'password123'
        });

      const token = loginResponse.body.data.token;

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('JWT Token Validation', () => {
    it('should accept valid JWT token', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'password123'
        });

      const token = loginResponse.body.data.token;

      // Try to access protected route
      const response = await request(app)
        .get('/api/employees')
        .query({ page: 1, size: 10 })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    it('should reject invalid JWT token', async () => {
      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', 'Bearer invalidtoken123');

      expect([401, 403]).toContain(response.status);
    });

    it('should reject expired JWT token', async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { user_id: 'test', username: 'test' },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect([401, 403]).toContain(response.status);
    });

    it('should reject missing JWT token', async () => {
      const response = await request(app)
        .get('/api/employees');

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('Password Security', () => {
    it('should hash passwords with bcrypt', async () => {
      const plainPassword = 'testpassword123';
      const hash = await encryptionService.hashPassword(plainPassword);

      expect(hash).not.toBe(plainPassword);
      expect(hash.startsWith('$2')).toBe(true); // bcrypt hash format
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should verify password correctly', async () => {
      const plainPassword = 'testpassword123';
      const hash = await encryptionService.hashPassword(plainPassword);

      const isValid = await encryptionService.verifyPassword(plainPassword, hash);
      expect(isValid).toBe(true);

      const isInvalid = await encryptionService.verifyPassword('wrongpassword', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow admin to access all resources', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'password123'
        });

      const token = loginResponse.body.data.token;

      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    it('should enforce hr role permissions', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'hr_admin',
          password: 'password123'
        });

      const token = loginResponse.body.data.token;

      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Health Check', () => {
    it('should return OK status', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('OK');
    });
  });
});
