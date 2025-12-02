/**
 * Notification Service Tests
 *
 * Tests for DingTalk integration and notification services
 */

const dingTalkService = require('../services/DingTalkService');
const notificationService = require('../services/NotificationService');

// Mock axios
jest.mock('axios');
const axios = require('axios');

describe('DingTalkService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset cached token
    dingTalkService.accessToken = null;
    dingTalkService.tokenExpireTime = null;
  });

  describe('getAccessToken', () => {
    it('should get access token successfully', async () => {
      const mockResponse = {
        data: {
          errcode: 0,
          access_token: 'test_token_123',
          expires_in: 7200,
          errmsg: 'ok',
        },
      };

      axios.get.mockResolvedValue(mockResponse);

      const token = await dingTalkService.getAccessToken();

      expect(token).toBe('test_token_123');
      expect(axios.get).toHaveBeenCalledWith(
        'https://oapi.dingtalk.com/gettoken',
        {
          params: {
            appkey: process.env.DINGTALK_APP_KEY,
            appsecret: process.env.DINGTALK_APP_SECRET,
          },
        }
      );
    });

    it('should cache access token', async () => {
      const mockResponse = {
        data: {
          errcode: 0,
          access_token: 'test_token_123',
          expires_in: 7200,
          errmsg: 'ok',
        },
      };

      axios.get.mockResolvedValue(mockResponse);

      // First call
      const token1 = await dingTalkService.getAccessToken();
      // Second call (should use cache)
      const token2 = await dingTalkService.getAccessToken();

      expect(token1).toBe(token2);
      expect(axios.get).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        data: {
          errcode: 40001,
          errmsg: 'invalid credential',
        },
      };

      axios.get.mockResolvedValue(mockResponse);

      await expect(dingTalkService.getAccessToken()).rejects.toThrow(
        'DingTalk API error: invalid credential'
      );
    });

    it('should handle network errors', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      await expect(dingTalkService.getAccessToken()).rejects.toThrow(
        'Failed to get DingTalk access token'
      );
    });
  });

  describe('sendTextMessage', () => {
    it('should send text message successfully', async () => {
      const mockTokenResponse = {
        data: {
          errcode: 0,
          access_token: 'test_token_123',
          expires_in: 7200,
        },
      };

      const mockSendResponse = {
        data: {
          errcode: 0,
          task_id: 'task_123',
        },
      };

      axios.get.mockResolvedValue(mockTokenResponse);
      axios.post.mockResolvedValue(mockSendResponse);

      const result = await dingTalkService.sendTextMessage(
        ['user1', 'user2'],
        'Test message'
      );

      expect(result.success).toBe(true);
      expect(result.taskId).toBe('task_123');
    });

    it('should handle empty user list', async () => {
      await expect(
        dingTalkService.sendTextMessage([], 'Test message')
      ).rejects.toThrow('userIdList is required and cannot be empty');
    });
  });

  describe('sendMarkdownMessage', () => {
    it('should send markdown message successfully', async () => {
      const mockTokenResponse = {
        data: {
          errcode: 0,
          access_token: 'test_token_123',
          expires_in: 7200,
        },
      };

      const mockSendResponse = {
        data: {
          errcode: 0,
          task_id: 'task_456',
        },
      };

      axios.get.mockResolvedValue(mockTokenResponse);
      axios.post.mockResolvedValue(mockSendResponse);

      const result = await dingTalkService.sendMarkdownMessage(
        ['user1'],
        'Test Title',
        '# Markdown content'
      );

      expect(result.success).toBe(true);
      expect(result.taskId).toBe('task_456');
    });
  });

  describe('sendLinkMessage', () => {
    it('should send link message successfully', async () => {
      const mockTokenResponse = {
        data: {
          errcode: 0,
          access_token: 'test_token_123',
          expires_in: 7200,
        },
      };

      const mockSendResponse = {
        data: {
          errcode: 0,
          task_id: 'task_789',
        },
      };

      axios.get.mockResolvedValue(mockTokenResponse);
      axios.post.mockResolvedValue(mockSendResponse);

      const linkData = {
        title: 'Link Title',
        text: 'Link description',
        messageUrl: 'https://example.com',
        picUrl: 'https://example.com/pic.jpg',
      };

      const result = await dingTalkService.sendLinkMessage(['user1'], linkData);

      expect(result.success).toBe(true);
      expect(result.taskId).toBe('task_789');
    });
  });

  describe('getUserIdByMobile', () => {
    it('should get user ID by mobile number', async () => {
      const mockTokenResponse = {
        data: {
          errcode: 0,
          access_token: 'test_token_123',
          expires_in: 7200,
        },
      };

      const mockUserResponse = {
        data: {
          errcode: 0,
          result: {
            userid: 'user123',
          },
        },
      };

      axios.get.mockResolvedValue(mockTokenResponse);
      axios.post.mockResolvedValue(mockUserResponse);

      const userId = await dingTalkService.getUserIdByMobile('13800138000');

      expect(userId).toBe('user123');
    });

    it('should return null when user not found', async () => {
      const mockTokenResponse = {
        data: {
          errcode: 0,
          access_token: 'test_token_123',
          expires_in: 7200,
        },
      };

      const mockUserResponse = {
        data: {
          errcode: 60121,
          errmsg: 'user not found',
        },
      };

      axios.get.mockResolvedValue(mockTokenResponse);
      axios.post.mockResolvedValue(mockUserResponse);

      const userId = await dingTalkService.getUserIdByMobile('13800138000');

      expect(userId).toBeNull();
    });
  });

  describe('isEnabled', () => {
    it('should return true when credentials are configured', () => {
      const originalAppKey = dingTalkService.appKey;
      const originalAppSecret = dingTalkService.appSecret;
      const originalAgentId = dingTalkService.agentId;

      dingTalkService.appKey = 'test_key';
      dingTalkService.appSecret = 'test_secret';
      dingTalkService.agentId = '123456';

      expect(dingTalkService.isEnabled()).toBe(true);

      // Restore
      dingTalkService.appKey = originalAppKey;
      dingTalkService.appSecret = originalAppSecret;
      dingTalkService.agentId = originalAgentId;
    });

    it('should return false when credentials are missing', () => {
      const originalAppKey = dingTalkService.appKey;
      const originalAppSecret = dingTalkService.appSecret;

      dingTalkService.appKey = null;
      dingTalkService.appSecret = null;

      expect(dingTalkService.isEnabled()).toBe(false);

      // Restore
      dingTalkService.appKey = originalAppKey;
      dingTalkService.appSecret = originalAppSecret;
    });
  });
});

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendOnboardingNotification', () => {
    it('should send onboarding notification', async () => {
      const employee = {
        employee_id: 'emp001',
        name: 'Test Employee',
        dingtalk_user_id: 'user123',
        email: 'test@example.com',
      };

      const formUrl = 'https://example.com/onboarding/token123';

      // Mock DingTalk service
      dingTalkService.isEnabled = jest.fn().returnValue(true);
      dingTalkService.sendLinkMessage = jest.fn().resolvedValue({
        success: true,
        taskId: 'task_123',
      });

      const result = await notificationService.sendOnboardingNotification(
        employee,
        formUrl
      );

      expect(result.success).toBe(true);
      expect(result.channel).toBe('dingtalk');
    });
  });

  describe('sendPreOnboardingReminder', () => {
    it('should send pre-onboarding reminder', async () => {
      const employee = {
        employee_id: 'emp001',
        name: 'Test Employee',
        dingtalk_user_id: 'user123',
        email: 'test@example.com',
        entry_date: '2025-01-15',
      };

      dingTalkService.isEnabled = jest.fn().returnValue(true);
      dingTalkService.sendMarkdownMessage = jest.fn().resolvedValue({
        success: true,
        taskId: 'task_123',
      });

      const result = await notificationService.sendPreOnboardingReminder(
        employee,
        3
      );

      expect(result.success).toBe(true);
      expect(result.channel).toBe('dingtalk');
    });
  });

  describe('sendWelcomeMessage', () => {
    it('should send welcome message', async () => {
      const employee = {
        employee_id: 'emp001',
        name: 'Test Employee',
        dingtalk_user_id: 'user123',
        email: 'test@example.com',
      };

      dingTalkService.isEnabled = jest.fn().returnValue(true);
      dingTalkService.sendTextMessage = jest.fn().resolvedValue({
        success: true,
        taskId: 'task_123',
      });

      const result = await notificationService.sendWelcomeMessage(employee);

      expect(result.success).toBe(true);
      expect(result.channel).toBe('dingtalk');
    });
  });

  describe('sendContractExpiryReminder', () => {
    it('should send contract expiry reminder', async () => {
      const employee = {
        employee_id: 'emp001',
        name: 'Test Employee',
        dingtalk_user_id: 'user123',
        email: 'test@example.com',
        contract_end_date: '2025-02-15',
      };

      dingTalkService.isEnabled = jest.fn().returnValue(true);
      dingTalkService.sendMarkdownMessage = jest.fn().resolvedValue({
        success: true,
        taskId: 'task_123',
      });

      const result = await notificationService.sendContractExpiryReminder(
        employee,
        30
      );

      expect(result.success).toBe(true);
      expect(result.channel).toBe('dingtalk');
    });
  });

  describe('sendMonthlyStatistics', () => {
    it('should send monthly statistics', async () => {
      const employee = {
        employee_id: 'emp001',
        name: 'Test Employee',
        dingtalk_user_id: 'user123',
        email: 'test@example.com',
      };

      const statistics = {
        month: '2025年1月',
        travelAllowance: 500,
        canteenExpense: 300,
        attendance: 22,
        overtime: 10,
      };

      dingTalkService.isEnabled = jest.fn().returnValue(true);
      dingTalkService.sendMarkdownMessage = jest.fn().resolvedValue({
        success: true,
        taskId: 'task_123',
      });

      const result = await notificationService.sendMonthlyStatistics(
        employee,
        statistics
      );

      expect(result.success).toBe(true);
      expect(result.channel).toBe('dingtalk');
    });
  });

  describe('sendBatchNotification', () => {
    it('should send batch notifications', async () => {
      const employees = [
        {
          employee_id: 'emp001',
          name: 'Employee 1',
          dingtalk_user_id: 'user1',
          email: 'emp1@example.com',
        },
        {
          employee_id: 'emp002',
          name: 'Employee 2',
          dingtalk_user_id: 'user2',
          email: 'emp2@example.com',
        },
      ];

      dingTalkService.isEnabled = jest.fn().returnValue(true);
      dingTalkService.sendTextMessage = jest.fn().resolvedValue({
        success: true,
        taskId: 'task_123',
      });

      const result = await notificationService.sendBatchNotification(
        employees,
        'Test Title',
        'Test Content',
        { type: 'text' }
      );

      expect(result.total).toBe(2);
      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.channels.dingtalk).toBe(2);
    });
  });

  describe('getAvailability', () => {
    it('should return availability status', () => {
      const availability = notificationService.getAvailability();

      expect(availability).toHaveProperty('dingtalk');
      expect(availability).toHaveProperty('email');
      expect(typeof availability.dingtalk).toBe('boolean');
      expect(typeof availability.email).toBe('boolean');
    });
  });
});
