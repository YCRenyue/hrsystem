/**
 * SchedulerService.runBusinessTripLifecycle 单元测试（P1 生命周期）
 *
 * 验证按日期推进出差状态的两条批量 update 条件：
 *  - approved 且已开始未结束 -> in_progress
 *  - approved/in_progress 且已结束 -> completed
 */

const { Op } = require('sequelize');
const scheduler = require('../../services/SchedulerService');
const { Employee, OnboardingProcess, BusinessTrip } = require('../../models');
const notificationService = require('../../services/NotificationService');

afterEach(() => {
  jest.restoreAllMocks();
});

describe('runBusinessTripLifecycle', () => {
  test('发起两次带正确条件的状态推进 update', async () => {
    const updateSpy = jest.spyOn(BusinessTrip, 'update').mockResolvedValue([1]);

    await scheduler.runBusinessTripLifecycle();

    expect(updateSpy).toHaveBeenCalledTimes(2);
    const { calls } = updateSpy.mock;

    // 第一次：approved -> in_progress
    expect(calls[0][0]).toEqual({ status: 'in_progress' });
    expect(calls[0][1].where.status).toBe('approved');
    expect(calls[0][1].where.start_datetime[Op.lte]).toBeInstanceOf(Date);
    expect(calls[0][1].where.end_datetime[Op.gt]).toBeInstanceOf(Date);

    // 第二次：approved/in_progress -> completed
    expect(calls[1][0]).toEqual({ status: 'completed' });
    expect(calls[1][1].where.status[Op.in]).toEqual(['approved', 'in_progress']);
    expect(calls[1][1].where.end_datetime[Op.lte]).toBeInstanceOf(Date);
  });

  test('数据库异常不抛出（任务内部吞掉错误）', async () => {
    jest.spyOn(BusinessTrip, 'update').mockRejectedValue(new Error('db down'));
    await expect(scheduler.runBusinessTripLifecycle()).resolves.toBeUndefined();
  });
});

describe('runDailyOnboardingTask', () => {
  test('creates a valid process and records the real notification result', async () => {
    const employee = {
      employee_id: 'employee-1',
      email: 'employee@example.com',
      dingtalk_user_id: null,
      getName: jest.fn(() => '测试员工')
    };
    const process = {
      form_token: null,
      status: 'pending',
      isTokenExpired: jest.fn(() => true),
      generateFormToken: jest.fn(function generateFormToken() {
        this.form_token = 'generated-token';
      }),
      generateFormLink: jest.fn(() => 'http://localhost:3000/onboarding/generated-token'),
      save: jest.fn().mockResolvedValue(undefined),
      markAsSent: jest.fn().mockResolvedValue(undefined)
    };

    jest.spyOn(Employee, 'findAll').mockResolvedValue([employee]);
    jest.spyOn(OnboardingProcess, 'findOne').mockResolvedValue(null);
    jest.spyOn(OnboardingProcess, 'create').mockResolvedValue(process);
    jest.spyOn(notificationService, 'sendOnboardingNotification').mockResolvedValue({
      success: true,
      channel: 'email',
      error: null
    });

    await scheduler.runDailyOnboardingTask();

    expect(OnboardingProcess.create).toHaveBeenCalledWith({
      employee_id: 'employee-1',
      status: 'pending'
    });
    expect(process.generateFormToken).toHaveBeenCalledTimes(1);
    expect(process.save).toHaveBeenCalledTimes(1);
    expect(process.markAsSent).toHaveBeenCalledWith('email', true, null);
  });
});
