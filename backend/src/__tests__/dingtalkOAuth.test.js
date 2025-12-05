/**
 * DingTalk OAuth Integration Tests
 */
const request = require('supertest');
const app = require('../app');
const { User, Employee } = require('../models');
const dingTalkService = require('../services/DingTalkService');

// Mock DingTalk Service
jest.mock('../services/DingTalkService');

describe('DingTalk OAuth Integration', () => {
  describe('POST /api/auth/dingtalk/callback', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterEach(async () => {
      await User.destroy({ where: {}, force: true });
      await Employee.destroy({ where: {}, force: true });
    });

    test('should successfully authenticate with valid code', async () => {
      // Mock DingTalk OAuth response
      const mockUserInfo = {
        openid: 'mock_openid_123',
        unionid: 'mock_unionid_456',
        nick: 'Test User',
        mobile: '13800138000'
      };

      dingTalkService.exchangeCodeForToken = jest.fn().mockResolvedValue({
        accessToken: 'mock_access_token',
        expireIn: 7200
      });

      dingTalkService.getUserInfo = jest.fn().mockResolvedValue(mockUserInfo);

      // Create employee and user for testing
      const employee = await Employee.create({
        employee_number: 'EMP001',
        email: 'test@example.com',
        department_id: null,
        status: 'active',
        dingtalk_user_id: 'mock_openid_123'
      });

      employee.setPhone(mockUserInfo.mobile);
      await employee.save();

      const user = await User.create({
        employee_id: employee.employee_id,
        username: 'testuser',
        password_hash: 'mock_hash',
        role: 'employee',
        is_active: true
      });

      const response = await request(app)
        .post('/api/auth/dingtalk/callback')
        .send({
          code: 'valid_auth_code_123',
          state: 'random_state'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toMatchObject({
        username: user.username,
        role: user.role
      });
    });

    test('should return 400 if code is missing', async () => {
      const response = await request(app)
        .post('/api/auth/dingtalk/callback')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should return 401 if user not found', async () => {
      const mockUserInfo = {
        openid: 'non_existent_user',
        mobile: '13900139000'
      };

      dingTalkService.exchangeCodeForToken = jest.fn().mockResolvedValue({
        accessToken: 'mock_access_token'
      });

      dingTalkService.getUserInfo = jest.fn().mockResolvedValue(mockUserInfo);

      const response = await request(app)
        .post('/api/auth/dingtalk/callback')
        .send({
          code: 'valid_auth_code_123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should handle DingTalk API errors', async () => {
      dingTalkService.exchangeCodeForToken = jest.fn().mockRejectedValue(
        new Error('DingTalk API error: invalid code')
      );

      const response = await request(app)
        .post('/api/auth/dingtalk/callback')
        .send({
          code: 'invalid_code'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/dingtalk/login-url', () => {
    test('should return DingTalk OAuth login URL', async () => {
      const response = await request(app)
        .get('/api/auth/dingtalk/login-url');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('loginUrl');
      expect(response.body.data.loginUrl).toContain('login.dingtalk.com');
      expect(response.body.data.loginUrl).toContain('response_type=code');
    });
  });
});
