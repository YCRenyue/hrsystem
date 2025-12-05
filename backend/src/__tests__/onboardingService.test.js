/**
 * Onboarding Service Tests
 * 测试入职流程自动化服务
 */

const OnboardingService = require('../services/OnboardingService');
const Employee = require('../models/Employee');
const OnboardingProcess = require('../models/OnboardingProcess');

jest.mock('../models/Employee');
jest.mock('../models/OnboardingProcess');
jest.mock('../services/NotificationService', () => {
  return jest.fn().mockImplementation(() => ({
    sendOnboardingForm: jest.fn()
  }));
});

describe('OnboardingService', () => {
  let onboardingService;
  let mockEmployee;
  let mockProcess;

  beforeEach(() => {
    onboardingService = new OnboardingService();

    mockEmployee = {
      employee_id: 'emp-123',
      employee_number: 'EMP001',
      getName: jest.fn().mockReturnValue('张三'),
      getPhone: jest.fn().mockReturnValue('13800138000'),
      setPhone: jest.fn(),
      setIdCard: jest.fn(),
      setBankCard: jest.fn(),
      setBirthDate: jest.fn(),
      entry_date: new Date('2025-01-15'),
      status: 'pending',
      save: jest.fn().mockResolvedValue(true)
    };

    mockProcess = {
      process_id: 'proc-123',
      employee_id: 'emp-123',
      status: 'pending',
      generateFormToken: jest.fn().mockReturnValue('token-123'),
      generateFormLink: jest.fn().mockReturnValue('http://example.com/form/token-123'),
      markAsSent: jest.fn().mockResolvedValue(true),
      markAsCompleted: jest.fn().mockResolvedValue(true),
      isTokenExpired: jest.fn().mockReturnValue(false),
      isCompleted: jest.fn().mockReturnValue(false),
      markAsExpired: jest.fn().mockResolvedValue(true),
      save: jest.fn().mockResolvedValue(true)
    };

    Employee.findByPk = jest.fn().mockResolvedValue(mockEmployee);
    OnboardingProcess.create = jest.fn().mockResolvedValue(mockProcess);
    OnboardingProcess.findOne = jest.fn().mockResolvedValue(mockProcess);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createProcess', () => {
    test('should create onboarding process for employee', async () => {
      const result = await onboardingService.createProcess('emp-123');

      expect(result.success).toBe(true);
      expect(result.process).toBeDefined();
      expect(OnboardingProcess.create).toHaveBeenCalled();
    });

    test('should generate token and form link', async () => {
      await onboardingService.createProcess('emp-123');

      expect(mockProcess.generateFormToken).toHaveBeenCalled();
      expect(mockProcess.generateFormLink).toHaveBeenCalled();
    });
  });

  describe('sendFormToEmployee', () => {
    test('should send form via notification service', async () => {
      onboardingService.notificationService.sendOnboardingForm = jest.fn()
        .mockResolvedValue({ success: true, channel: 'dingtalk' });

      OnboardingProcess.findOne = jest.fn().mockResolvedValue({
        ...mockProcess,
        employee: mockEmployee
      });

      const result = await onboardingService.sendFormToEmployee('proc-123');

      expect(result.success).toBe(true);
      expect(mockProcess.markAsSent).toHaveBeenCalled();
    });

    test('should handle send failure', async () => {
      onboardingService.notificationService.sendOnboardingForm = jest.fn()
        .mockRejectedValue(new Error('Send failed'));

      OnboardingProcess.findOne = jest.fn().mockResolvedValue({
        ...mockProcess,
        employee: mockEmployee
      });

      const result = await onboardingService.sendFormToEmployee('proc-123');

      expect(result.success).toBe(false);
    });
  });

  describe('submitForm', () => {
    test('should process form submission', async () => {
      const formData = {
        phone: '13800138000',
        email: 'test@example.com',
        idCard: '110101199001011234'
      };

      const result = await onboardingService.submitForm('token-123', formData);

      expect(result.success).toBe(true);
      expect(mockProcess.markAsCompleted).toHaveBeenCalled();
    });

    test('should update employee data', async () => {
      const formData = {
        phone: '13800138000',
        email: 'test@example.com'
      };

      await onboardingService.submitForm('token-123', formData);

      expect(mockEmployee.save).toHaveBeenCalled();
    });
  });
});
