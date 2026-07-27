/**
 * SchedulerService.runBusinessTripLifecycle 单元测试（P1 生命周期）
 *
 * 验证按日期推进出差状态的两条批量 update 条件：
 *  - approved 且已开始未结束 -> in_progress
 *  - approved/in_progress 且已结束 -> completed
 */

const { Op } = require('sequelize');
const scheduler = require('../../services/SchedulerService');
const { BusinessTrip } = require('../../models');

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
