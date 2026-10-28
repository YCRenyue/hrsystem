/**
 * 年假应休天数、考勤报表合计、出差时长的边界（变异测试暴露出的未覆盖规则）
 *
 * 规则来源：HR 使用手册第 10 章（入职 1 到 10 年 5 天，10 到 20 年 10 天）、《职工带薪年休假条例》
 * （满 20 年 15 天，不满 1 年没有）、requirement.md 12.1（入职满一年按工龄生成）、
 * 手册 8.5（考勤管理页统计卡片：迟到/早退/请假/旷工人数和合计）、13.2（出差时长）。
 */
const { calculateEntitlement } = require('../../services/AnnualLeaveService');
const {
  computeTotals, leaveDaysInPeriod, summarizeDailyFacts
} = require('../../services/attendanceReportService')._internal;
const { calculateDurations } = require('../../services/BusinessTripService');

describe('年假应休天数：按到当年 12 月 31 日满几年工龄计算', () => {
  test.each([
    ['2026-01-01', 0, '当年入职不满一年'],
    ['2025-12-31', 5, '年底正好满 1 年'],
    ['2026-12-31', 0, '年底当天入职'],
    ['2017-01-01', 5, '年底满 9 年（2027-01-01 才满 10 年）'],
    ['2016-12-31', 10, '年底正好满 10 年'],
    ['2007-01-01', 10, '年底满 19 年'],
    ['2006-12-31', 15, '年底正好满 20 年'],
    ['1990-06-01', 15, '30 多年']
  ])('入职 %s，2026 年 -> %i 天（%s）', (entry, days) => {
    expect(calculateEntitlement(entry, 2026)).toBe(days);
  });

  test('没有入职日期 -> 0 天', () => {
    expect(calculateEntitlement(null, 2026)).toBe(0);
  });
});

describe('考勤报表合计（手册 8.5 统计卡片）', () => {
  const row = (id, v) => ({
    employee_id: id,
    late_count: 0,
    late_minutes: 0,
    early_leave_count: 0,
    early_leave_minutes: 0,
    leave_days: 0,
    absent_days: 0,
    business_trip_days: 0,
    overtime_normal_hours: 0,
    overtime_holiday_hours: 0,
    leave_punch_dates: [],
    absent_dates: [],
    ...v
  });

  test('各项相加，人数按有记录的人去重', () => {
    const totals = computeTotals([
      row('a', {
        late_count: 3,
        late_minutes: 40,
        early_leave_count: 1,
        early_leave_minutes: 10,
        leave_days: '1.5',
        absent_days: 2,
        business_trip_days: 1,
        overtime_normal_hours: '2.5',
        overtime_holiday_hours: '7',
        absent_dates: ['2026-03-05']
      }),
      row('b', {
        late_count: 2,
        late_minutes: 15,
        early_leave_count: 0,
        leave_days: 0,
        absent_days: 1,
        overtime_normal_hours: 1,
        leave_punch_dates: ['2026-03-18']
      }),
      row('c', {})
    ]);
    expect(totals).toEqual({
      total_late_count: 5,
      total_late_minutes: 55,
      total_early_leave_count: 1,
      total_early_leave_minutes: 10,
      total_leave_days: 1.5,
      total_absent_days: 3,
      total_business_trip_days: 1,
      total_overtime_hours: 10.5,
      leave_punch_count: 1,
      late_people_count: 2,
      early_leave_people_count: 1,
      leave_people_count: 1,
      absent_people_count: 1
    });
  });

  test('空的数值字段按 0 计，不会变成 NaN', () => {
    const totals = computeTotals([row('a', { late_count: null, overtime_holiday_hours: undefined })]);
    expect(totals.total_late_count).toBe(0);
    expect(totals.total_overtime_hours).toBe(0);
  });
});

describe('请假天数落在统计周期的边界', () => {
  const PERIOD = { start: '2026-03-02', end: '2026-03-06' };

  test('请假首尾正好是周期首尾：整段在周期内，用申请天数', () => {
    expect(leaveDaysInPeriod({ start_date: '2026-03-02', end_date: '2026-03-06', days: '4.5' }, PERIOD))
      .toBe(4.5);
  });

  test('请假在周期开始前一天结束：不计入', () => {
    expect(leaveDaysInPeriod({ start_date: '2026-02-27', end_date: '2026-02-27', days: 1 }, PERIOD))
      .toBe(0);
  });

  test('请假只覆盖周末：没有工作日，计 0', () => {
    expect(leaveDaysInPeriod({ start_date: '2026-03-07', end_date: '2026-03-08', days: 2 }, PERIOD))
      .toBe(0);
  });

  test('周期首尾两天的考勤都算在周期内；请假记录只认 leave_id 或请假状态', () => {
    const facts = summarizeDailyFacts([
      { date: '2026-03-02', status: 'absent' },
      {
        date: '2026-03-06', status: 'leave', leave_id: null, morning_check_in: '08:00:00'
      },
      { date: '2026-03-05', status: 'normal', leave_id: 'L1' },
      {
        date: '2026-03-04', status: 'late', leave_id: null, check_in_time: '08:10:00'
      },
      { date: '2026-03-07', status: 'absent' }
    ], [], PERIOD);
    expect(facts).toEqual({
      system_leave_days: 0,
      leave_days_without_punch: 1,
      leave_punch_dates: ['2026-03-06'],
      absent_dates: ['2026-03-02']
    });
  });

  test('多条日期按日期排序输出', () => {
    const facts = summarizeDailyFacts([
      { date: '2026-03-05', status: 'absent' },
      { date: '2026-03-03', status: 'absent' },
      { date: '2026-03-06', status: 'leave', check_out_time: '18:00:00' },
      { date: '2026-03-04', status: 'leave', afternoon_check_in: '13:30:00' }
    ], [], PERIOD);
    expect(facts.absent_dates).toEqual(['2026-03-03', '2026-03-05']);
    expect(facts.leave_punch_dates).toEqual(['2026-03-04', '2026-03-06']);
  });
});

describe('出差时长的输入校验', () => {
  test('起止时间不合法 -> 报错', () => {
    expect(() => calculateDurations('not-a-date', '2026-10-23T17:00:00')).toThrow('不合法');
    expect(() => calculateDurations('2026-10-23T09:00:00', 'bad')).toThrow('不合法');
  });

  test('结束等于开始 -> 报错；晚 1 分钟就可以', () => {
    expect(() => calculateDurations('2026-10-23T09:00:00', '2026-10-23T09:00:00')).toThrow('晚于');
    expect(calculateDurations('2026-10-23T09:00:00', '2026-10-23T09:01:00').work_hours).toBe(0.02);
  });

  test('正好到第二天 00:00：第二天不计时长', () => {
    expect(calculateDurations('2026-10-22T16:00:00', '2026-10-23T00:00:00')).toMatchObject({
      duration_hours: 8, work_hours: 8
    });
  });
});
