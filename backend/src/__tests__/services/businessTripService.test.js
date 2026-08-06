/**
 * BusinessTripService 单元测试
 *
 * 覆盖：
 *  - calculateDurations：工时/天数计算（工作日 vs 周末、非法区间）
 *  - cancelLinkedReimbursements（P0 联动）：已发放阻断、其余状态级联撤销
 *
 * 说明：使用 jest.spyOn 打桩模型静态方法，不依赖真实数据库。
 */

const businessTripService = require('../../services/BusinessTripService');
const { Reimbursement } = require('../../models');
const { ValidationError } = require('../../middleware/errorHandler');

afterEach(() => {
  jest.restoreAllMocks();
});

describe('calculateDurations', () => {
  test('工作日 09:00-17:00 计 8 工时', () => {
    // 2022-01-03 是星期一
    const d = businessTripService.calculateDurations(
      '2022-01-03T09:00:00',
      '2022-01-03T17:00:00'
    );
    expect(d.duration_hours).toBe(8);
    expect(d.work_hours).toBe(8);
    expect(d.span_days).toBeCloseTo(0.33, 1);
  });

  test('周末不计工时（duration 仍统计）', () => {
    // 2022-01-01 是星期六
    const d = businessTripService.calculateDurations(
      '2022-01-01T09:00:00',
      '2022-01-01T17:00:00'
    );
    expect(d.duration_hours).toBe(8);
    expect(d.work_hours).toBe(0);
  });

  test('每日工时封顶 8 小时', () => {
    // 周一 08:00-20:00 共 12h，工时封顶 8
    const d = businessTripService.calculateDurations(
      '2022-01-03T08:00:00',
      '2022-01-03T20:00:00'
    );
    expect(d.duration_hours).toBe(12);
    expect(d.work_hours).toBe(8);
  });

  test('结束时间不晚于开始时间应抛错', () => {
    expect(() => businessTripService.calculateDurations(
      '2022-01-03T17:00:00',
      '2022-01-03T09:00:00'
    )).toThrow(ValidationError);
  });
});

describe('cancelLinkedReimbursements (P0)', () => {
  const makeReimbursement = (status) => ({
    reimbursement_id: `r-${status}`,
    reimbursement_number: `RB-${status}`,
    total_amount: 100,
    status,
    save: jest.fn().mockResolvedValue(undefined)
  });

  const trip = { trip_id: 'trip-1' };

  test('存在已发放报销时阻断撤销，且不修改任何记录', async () => {
    const paid = makeReimbursement('paid');
    const pending = makeReimbursement('pending');
    jest.spyOn(Reimbursement, 'findAll').mockResolvedValue([paid, pending]);

    await expect(
      businessTripService.cancelLinkedReimbursements(trip, { userId: 'u1' })
    ).rejects.toThrow(ValidationError);

    expect(paid.save).not.toHaveBeenCalled();
    expect(pending.save).not.toHaveBeenCalled();
  });

  test('draft/pending/approved 级联撤销，rejected/cancelled 不动', async () => {
    const records = [
      makeReimbursement('draft'),
      makeReimbursement('pending'),
      makeReimbursement('approved'),
      makeReimbursement('rejected'),
      makeReimbursement('cancelled')
    ];
    jest.spyOn(Reimbursement, 'findAll').mockResolvedValue(records);

    const count = await businessTripService.cancelLinkedReimbursements(trip, {
      userId: 'u1',
      reason: '计划变更'
    });

    expect(count).toBe(3);
    const [draft, pending, approved, rejected, cancelled] = records;
    [draft, pending, approved].forEach((r) => {
      expect(r.status).toBe('cancelled');
      expect(r.cancelled_by).toBe('u1');
      expect(r.cancellation_reason).toContain('计划变更');
      expect(r.save).toHaveBeenCalledTimes(1);
    });
    expect(rejected.status).toBe('rejected');
    expect(cancelled.status).toBe('cancelled');
    expect(rejected.save).not.toHaveBeenCalled();
  });

  test('无关联报销时返回 0', async () => {
    jest.spyOn(Reimbursement, 'findAll').mockResolvedValue([]);
    const count = await businessTripService.cancelLinkedReimbursements(trip, {});
    expect(count).toBe(0);
  });
});
