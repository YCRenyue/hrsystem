/**
 * 公司作息与每日考勤规则（《HR 使用手册》8.2、8.3；《管规制度—2026》第二条）
 *
 * 预期值按制度条文手算，不参考实现。
 */
const { buildDailyRecord } = require('../../services/punch/attendancePunchImport')._internal;

const day = (date, times, dept = '行政部') => {
  const r = buildDailyRecord(date, times, dept);
  return { ...r.derived, ...r.hours };
};

// 工作日样本：2026-04-30 周四、2026-05-01 周五、2026-09-30 周三、2026-10-01 周四
describe('冬夏令时切换日期（夏令时 5 月 1 日至 9 月 30 日）', () => {
  test.each([
    ['2026-04-30', 'winter'],
    ['2026-05-01', 'summer'],
    ['2026-09-30', 'summer'],
    ['2026-10-01', 'winter']
  ])('%s 按 %s 作息', (date, season) => {
    // 18:00 下班：冬令时正点，夏令时（18:30 下班）早退 30 分钟
    const r = day(date, ['08:00', '18:00']);
    expect(r.early_leave_minutes).toBe(season === 'summer' ? 30 : 0);
    // 14:00 午休回来：冬令时（13:30 上班）迟到 30 分钟，夏令时正点
    const r2 = day(date, ['08:00', '11:30', '14:00', '18:30']);
    expect(r2.late_minutes).toBe(season === 'summer' ? 0 : 30);
  });
});

describe('出满勤的工作时长', () => {
  test.each([
    ['行政 夏令时 08:00-11:30、14:00-18:30', '2026-06-01', '行政部', ['08:00', '18:30'], 8.0],
    ['行政 冬令时 08:00-11:30、13:30-18:00', '2026-03-02', '行政部', ['08:00', '18:00'], 8.0],
    ['生产 夏令时 07:30-11:30、14:00-18:00', '2026-06-01', '生产部', ['07:30', '18:00'], 8.0],
    ['生产 冬令时 07:30-11:30、13:30-18:00', '2026-03-02', '生产部', ['07:30', '18:00'], 8.5]
  ])('%s = %s', (label, date, dept, times, hours) => {
    const r = day(date, times, dept);
    expect(r).toMatchObject({ status: 'normal', work_hours: hours, overtime_hours: 0 });
  });

  test('部门名里含“生产”二字就按生产部作息（如“生产二车间”）', () => {
    expect(day('2026-03-02', ['07:30', '18:00'], '生产二车间').late_minutes).toBe(0);
    expect(day('2026-03-02', ['07:30', '18:00'], '质检部').work_hours).toBe(8.0);
  });

  test('没有部门时按普通作息', () => {
    expect(day('2026-03-02', ['07:45', '18:00'], undefined).late_minutes).toBe(0);
  });
});

describe('迟到、早退与状态', () => {
  test('没有宽限：晚 1 分钟也算迟到', () => {
    expect(day('2026-03-02', ['08:01', '18:00'])).toMatchObject({ status: 'late', late_minutes: 1 });
  });

  test('正点上下班不算迟到早退', () => {
    expect(day('2026-03-02', ['08:00', '18:00'])).toMatchObject({
      status: 'normal', late_minutes: 0, early_leave_minutes: 0
    });
  });

  test('既迟到又早退：状态显示迟到，两个分钟数都记录', () => {
    expect(day('2026-03-02', ['08:10', '17:50'])).toMatchObject({
      status: 'late', late_minutes: 10, early_leave_minutes: 10
    });
  });

  test('不迟到但早退：状态为早退', () => {
    expect(day('2026-03-02', ['07:55', '17:00'])).toMatchObject({
      status: 'early_leave', late_minutes: 0, early_leave_minutes: 60
    });
  });

  test('午休两次没打不算缺卡', () => {
    expect(day('2026-03-02', ['07:55', '18:00']).status).toBe('normal');
  });

  test('工作日只打 1 次卡（上午）为缺卡，时长为 0', () => {
    expect(day('2026-03-02', ['07:55'])).toMatchObject({
      status: 'missing_punch', work_hours: 0, overtime_hours: 0
    });
  });
});

describe('工作时长和加班（小时，保留 1 位小数）', () => {
  test('工作时长只看最早和最晚打卡，与两个上班时段重叠的部分', () => {
    // 09:00 到、16:00 走（冬令时）：上午 2.5 + 下午 2.5 = 5.0
    expect(day('2026-03-02', ['09:00', '16:00']).work_hours).toBe(5.0);
  });

  test('只在上午上班：下午不计工时', () => {
    expect(day('2026-03-02', ['08:00', '11:30']).work_hours).toBe(3.5);
  });

  test('工作日加班 = 最晚打卡减下班时间；下班前离开没有加班', () => {
    expect(day('2026-03-02', ['08:00', '20:30']).overtime_hours).toBe(2.5);
    expect(day('2026-03-02', ['08:00', '17:59']).overtime_hours).toBe(0);
  });

  test('夏令时加班从 18:30 起算', () => {
    expect(day('2026-07-01', ['08:00', '19:30']).overtime_hours).toBe(1.0);
  });

  test('周末：全部时长扣午休算加班；夏令时午休 11:30-14:00 为 2.5 小时', () => {
    // 2026-06-06 周六
    expect(day('2026-06-06', ['08:00', '17:00'])).toMatchObject({
      status: 'weekend', overtime_hours: 6.5, work_hours: 0
    });
  });

  test('周末只在午休前或午休后打卡：不扣午休', () => {
    // 2026-03-07 周六：14:00-17:00 都在午休之后
    expect(day('2026-03-07', ['14:00', '17:00']).overtime_hours).toBe(3.0);
  });

  test('周末只有一次打卡：不计加班', () => {
    expect(day('2026-03-07', ['09:00']).overtime_hours).toBe(0);
  });
});
