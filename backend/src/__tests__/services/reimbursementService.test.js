/**
 * ReimbursementService 单元测试
 *
 * 覆盖：
 *  - validateItem：类别/金额/发生日期落在出差区间
 *  - enforceDailyLimits：按天住宿/餐费限额
 *  - sumAmount：明细汇总
 *  - syncTripReimbursementStatus：出差单报销状态派生（联动）
 */

const reimbursementService = require('../../services/ReimbursementService');
const { BusinessTrip, Reimbursement } = require('../../models');
const { ValidationError } = require('../../middleware/errorHandler');

const trip = {
  trip_id: 'trip-1',
  start_datetime: '2026-07-01T00:00:00',
  end_datetime: '2026-07-05T23:59:59'
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('validateItem', () => {
  test('合法明细通过', () => {
    expect(() => reimbursementService.validateItem(
      { category: 'transport', amount: 120, occurred_on: '2026-07-02' },
      trip
    )).not.toThrow();
  });

  test('非法类别抛错', () => {
    expect(() => reimbursementService.validateItem(
      { category: 'bribery', amount: 10, occurred_on: '2026-07-02' },
      trip
    )).toThrow(ValidationError);
  });

  test('负数金额抛错', () => {
    expect(() => reimbursementService.validateItem(
      { category: 'meal', amount: -1, occurred_on: '2026-07-02' },
      trip
    )).toThrow(ValidationError);
  });

  test('发生日期超出出差区间抛错', () => {
    expect(() => reimbursementService.validateItem(
      { category: 'meal', amount: 50, occurred_on: '2026-07-09' },
      trip
    )).toThrow(ValidationError);
  });
});

describe('enforceDailyLimits', () => {
  test('单日住宿超限抛错（>500）', () => {
    expect(() => reimbursementService.enforceDailyLimits([
      { category: 'accommodation', amount: 600, occurred_on: '2026-07-02' }
    ])).toThrow(ValidationError);
  });

  test('单日餐费累计超限抛错（>150）', () => {
    expect(() => reimbursementService.enforceDailyLimits([
      { category: 'meal', amount: 100, occurred_on: '2026-07-02' },
      { category: 'meal', amount: 100, occurred_on: '2026-07-02' }
    ])).toThrow(ValidationError);
  });

  test('限额内通过；跨天不累计', () => {
    expect(() => reimbursementService.enforceDailyLimits([
      { category: 'accommodation', amount: 500, occurred_on: '2026-07-02' },
      { category: 'accommodation', amount: 500, occurred_on: '2026-07-03' },
      { category: 'transport', amount: 9999, occurred_on: '2026-07-02' }
    ])).not.toThrow();
  });
});

describe('sumAmount', () => {
  test('累加明细金额', () => {
    expect(reimbursementService.sumAmount([
      { amount: 10 }, { amount: 20.5 }, { amount: '4.5' }
    ])).toBe(35);
  });
});

describe('syncTripReimbursementStatus (联动)', () => {
  const runWith = async (reimbursements) => {
    const fakeTrip = { reimbursement_status: 'not_started', save: jest.fn() };
    jest.spyOn(BusinessTrip, 'findByPk').mockResolvedValue(fakeTrip);
    jest.spyOn(Reimbursement, 'findAll').mockResolvedValue(
      reimbursements.map((status) => ({ status }))
    );
    await reimbursementService.syncTripReimbursementStatus('trip-1');
    return fakeTrip;
  };

  test('无报销 → not_started', async () => {
    const t = await runWith([]);
    expect(t.reimbursement_status).toBe('not_started');
  });

  test('全部已发放 → reimbursed', async () => {
    const t = await runWith(['paid', 'paid']);
    expect(t.reimbursement_status).toBe('reimbursed');
  });

  test('存在进行中的报销 → pending', async () => {
    const t = await runWith(['pending', 'paid']);
    expect(t.reimbursement_status).toBe('pending');
  });

  test('全部撤销/驳回 → not_started', async () => {
    const t = await runWith(['cancelled', 'rejected']);
    expect(t.reimbursement_status).toBe('not_started');
  });
});
