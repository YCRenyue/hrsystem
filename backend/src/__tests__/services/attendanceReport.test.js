/**
 * 考勤报表合并系统请假的单元测试
 *
 * 覆盖：
 *  - 请假天数在统计周期内的计算（含半天、跨周期）
 *  - 已请假但当天有打卡标为异常，未请假未打卡列为旷工
 *  - 合并打卡机汇总：请假取较大值，扣除打卡机不知道的请假旷工
 *
 * 说明：只测试纯函数，不依赖真实数据库。
 */

const {
  weekdaysBetween, leaveDaysInPeriod, summarizeDailyFacts, mergeSummaryRow, computeTotals
} = require('../../services/attendanceReportService')._internal;

const PERIOD = { start: '2026-11-01', end: '2026-11-30' };

describe('leaveDaysInPeriod', () => {
  test('整段在周期内时使用申请天数（可为半天）', () => {
    const leave = { start_date: '2026-11-02', end_date: '2026-11-02', days: '0.5' };
    expect(leaveDaysInPeriod(leave, PERIOD)).toBe(0.5);
  });

  test('跨周期时只计周期内的工作日', () => {
    const leave = { start_date: '2026-11-27', end_date: '2026-12-02', days: '4.0' };
    // 11-27 周五、11-30 周一在周期内，11-28/29 为周末，12-01/02 在下个周期
    expect(leaveDaysInPeriod(leave, PERIOD)).toBe(2);
  });

  test('周末不计入工作日', () => {
    expect(weekdaysBetween('2026-11-06', '2026-11-09')).toEqual(['2026-11-06', '2026-11-09']);
  });
});

describe('summarizeDailyFacts', () => {
  const records = [
    {
      date: '2026-11-02', status: 'leave', leave_id: 'l1', check_in_time: null
    },
    {
      date: '2026-11-03', status: 'leave', leave_id: 'l1', check_in_time: '07:28:00'
    },
    {
      date: '2026-11-04', status: 'absent', leave_id: null, check_in_time: null
    },
    {
      date: '2026-11-05', status: 'normal', leave_id: null, check_in_time: '07:30:00'
    },
    {
      date: '2026-10-30', status: 'absent', leave_id: null, check_in_time: null
    }
  ];
  const leaves = [{ start_date: '2026-11-02', end_date: '2026-11-03', days: '2.0' }];

  test('请假当天有打卡标为异常，未请假未打卡列为旷工，周期外忽略', () => {
    expect(summarizeDailyFacts(records, leaves, PERIOD)).toEqual({
      system_leave_days: 2,
      leave_days_without_punch: 1,
      leave_punch_dates: ['2026-11-03'],
      absent_dates: ['2026-11-04']
    });
  });
});

describe('mergeSummaryRow', () => {
  const facts = {
    system_leave_days: 2,
    leave_days_without_punch: 2,
    leave_punch_dates: [],
    absent_dates: ['2026-11-04']
  };

  test('打卡机不知道系统请假时：请假取系统天数，旷工扣除请假未打卡的天数', () => {
    const row = mergeSummaryRow({ leave_days: '0.0', absent_days: '3.0' }, facts);
    expect(row.leave_days).toBe(2);
    expect(row.absent_days).toBe(1);
    expect(row.machine_leave_days).toBe(0);
    expect(row.machine_absent_days).toBe(3);
  });

  test('打卡机已登记同一请假时不重复计算', () => {
    const row = mergeSummaryRow({ leave_days: '2.0', absent_days: '1.0' }, facts);
    expect(row.leave_days).toBe(2);
    expect(row.absent_days).toBe(1);
  });
});

describe('computeTotals', () => {
  test('统计请假人数、旷工人数与请假打卡异常次数', () => {
    const totals = computeTotals([
      {
        employee_id: 'a',
        leave_days: 2,
        absent_days: 0,
        late_count: 0,
        early_leave_count: 0,
        leave_punch_dates: ['2026-11-03'],
        absent_dates: []
      },
      {
        employee_id: 'b',
        leave_days: 0,
        absent_days: 1,
        late_count: 1,
        early_leave_count: 0,
        leave_punch_dates: [],
        absent_dates: ['2026-11-04']
      }
    ]);
    expect(totals.total_leave_days).toBe(2);
    expect(totals.leave_people_count).toBe(1);
    expect(totals.absent_people_count).toBe(1);
    expect(totals.leave_punch_count).toBe(1);
    expect(totals.late_people_count).toBe(1);
  });
});
