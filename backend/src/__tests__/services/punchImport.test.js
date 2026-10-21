/**
 * 打卡导入单元测试
 *
 * 覆盖：
 *  - 「刷卡记录」表解析：周期、导出日期、跨月日期、多次打卡
 *  - 食堂：按时间分午餐/晚餐、同餐去重、异常与非工作日
 *  - 考勤：上下班时段分配、缺卡/迟到/早退、导出当天跳过
 *  - 员工匹配：同名重复条目的取舍、对照表优先
 *
 * 说明：只测试纯函数，不依赖真实数据库。
 */

const XLSX = require('xlsx');
const {
  parsePunchWorkbook, parsePunchCell, dedupeTimes, buildDayColumns
} = require('../../services/punch/punchRecordParser');
const canteen = require('../../services/punch/canteenPunchImport')._internal;
const attendance = require('../../services/punch/attendancePunchImport');
const matcher = require('../../services/punch/employeeMatcher')._internal;

function buildWorkbookBuffer(rows) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), '刷卡记录');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

describe('punchRecordParser', () => {
  test('解析周期、导出日期与每天的全部打卡', () => {
    const buffer = buildWorkbookBuffer([
      ['刷卡记录表'],
      ['考勤日期 :', '', '2026/02/01 ~ 02/28\t( 仁越饭堂 )', '', '制表时间 :', '2026/03/01'],
      ['工号', '姓名', '部门', 1, 2],
      ['', '', '', '日', '一'],
      ['5', '沈宗顺', '生产部', '11:34\n17:06\n', ''],
      ['', '', '', '', '']
    ]);
    const parsed = parsePunchWorkbook(buffer);
    expect(parsed.period.start).toBe('2026-02-01');
    expect(parsed.period.end).toBe('2026-02-28');
    expect(parsed.exportDate).toBe('2026-03-01');
    expect(parsed.employees).toHaveLength(1);
    expect(parsed.employees[0].days).toEqual({ '2026-02-01': ['11:34', '17:06'] });
  });

  test('缺少刷卡记录表时报错', () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['x']]), '1.2.3');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    expect(() => parsePunchWorkbook(buffer)).toThrow('刷卡记录');
  });

  test('单元格内时间排序并忽略非法内容', () => {
    expect(parsePunchCell('17:06\n8:5\n旷工\n')).toEqual(['08:05', '17:06']);
  });

  test('间隔内的重复打卡只保留最早一次', () => {
    expect(dedupeTimes(['07:13', '07:14', '18:04'], 5)).toEqual(['07:13', '18:04']);
  });

  test('跨月周期按日期序号推算月份', () => {
    const cols = buildDayColumns(['', '', '', '30', '31', '1'], { year: 2026, month: 12 });
    expect(cols.map((c) => c.date)).toEqual(['2026-12-30', '2026-12-31', '2027-01-01']);
  });
});

describe('canteen punch planning', () => {
  test('按时间段分餐，与所在列无关', () => {
    expect(canteen.classifyMealTime('11:24')).toBe('lunch');
    expect(canteen.classifyMealTime('16:37')).toBe('dinner');
    expect(canteen.classifyMealTime('00:18')).toBeNull();
    expect(canteen.classifyMealTime('08:42')).toBeNull();
  });

  test('同一餐多次刷卡只算一次并记录最早时间', () => {
    const day = canteen.splitDayPunches(['11:46', '11:55', '11:57', '17:20']);
    expect(day.meals).toEqual({ lunch: '11:46', dinner: '17:20' });
    expect(day.merged).toBe(2);
  });

  test('非工作日和不在饭点的刷卡记为异常', () => {
    const entry = {
      days: {
        '2026-02-07': ['11:35', '16:56'],
        '2026-02-09': ['11:24', '16:37'],
        '2026-02-12': ['23:57']
      }
    };
    const plan = canteen.planEmployeeMeals(entry, () => false);
    expect(plan.meals).toEqual([
      { date: '2026-02-09', type: 'lunch', time: '11:24' },
      { date: '2026-02-09', type: 'dinner', time: '16:37' }
    ]);
    expect(plan.anomalies.map((a) => a.reason).sort()).toEqual([
      'non_workday', 'non_workday', 'outside_meal_window'
    ]);
  });

  test('请假或出差期间的刷卡记为异常', () => {
    const plan = canteen.planEmployeeMeals({ days: { '2026-02-10': ['11:30'] } }, () => true);
    expect(plan.meals).toHaveLength(0);
    expect(plan.anomalies[0].reason).toBe('on_leave_or_trip');
  });
});

describe('attendance punch planning', () => {
  const { assignSlots, buildDailyRecord } = attendance._internal;

  test('四次打卡分配到四个时段，额外打卡单独列出', () => {
    const slots = assignSlots(['08:25', '09:18', '09:49', '11:33', '13:24', '18:17']);
    expect(slots.morning_check_in).toBe('08:25');
    expect(slots.morning_check_out).toBe('11:33');
    expect(slots.afternoon_check_in).toBe('13:24');
    expect(slots.afternoon_check_out).toBe('18:17');
    expect(slots.extras).toEqual(['09:18', '09:49']);
  });

  test('22:00 之后的下班卡也作为下班时间', () => {
    const record = buildDailyRecord('2026-03-06', ['07:24', '11:39', '13:26', '22:22']);
    expect(record.punches.check_out_time).toBe('22:22:00');
    expect(record.derived.status).toBe('normal');
  });

  test('工作日只有一次打卡记为缺卡', () => {
    const record = buildDailyRecord('2026-03-09', ['19:15']);
    expect(record.derived.status).toBe('missing_punch');
    expect(record.punches.afternoon_check_out).toBe('19:15:00');
  });

  test('统一按 08:00 / 17:00 判断迟到早退', () => {
    expect(buildDailyRecord('2026-03-12', ['08:25', '18:17']).derived)
      .toEqual({ status: 'late', late_minutes: 25, early_leave_minutes: 0 });
    expect(buildDailyRecord('2026-03-04', ['07:58', '16:01']).derived.status)
      .toBe('early_leave');
  });

  test('工作日无打卡为缺勤，周末为 weekend', () => {
    expect(buildDailyRecord('2026-03-16', []).derived.status).toBe('absent');
    expect(buildDailyRecord('2026-03-08', ['07:22', '19:45']).derived.status).toBe('weekend');
  });

  test('导出当天及之后的数据跳过', () => {
    const result = attendance.selectImportDates(
      ['2026-03-21', '2026-03-22', '2026-03-23'],
      '2026-03-23'
    );
    expect(result.dates).toEqual(['2026-03-21', '2026-03-22']);
    expect(result.skipped).toEqual(['2026-03-23']);
  });
});

describe('employee matcher', () => {
  const entry = (externalId, name, days = {}) => ({
    externalId, name, department: '', days
  });

  test('同名多条只有一条有打卡时使用该条', () => {
    const { entries, ambiguousNames } = matcher.resolveFileDuplicates([
      entry('10', '俞建'),
      entry('73', '俞建', { '2026-02-02': ['11:30'] })
    ], new Map());
    expect(entries.map((e) => e.externalId)).toEqual(['73']);
    expect(ambiguousNames.size).toBe(0);
  });

  test('同名多条都有打卡时列入待确认', () => {
    const days = { '2026-02-02': ['11:30'] };
    const { ambiguousNames } = matcher.resolveFileDuplicates([
      entry('1', '张三', days), entry('2', '张三', days)
    ], new Map());
    expect(ambiguousNames.has('张三')).toBe(true);
  });

  test('对照表优先于姓名匹配', () => {
    const mapped = { employee_id: 'e1' };
    const byName = { employee_id: 'e2' };
    const context = {
      mappings: new Map([['32', 'e1']]),
      index: {
        byId: new Map([['e1', mapped]]),
        byName: new Map([['藏玲', byName]]),
        duplicateNames: new Set()
      },
      ambiguousNames: new Set()
    };
    expect(matcher.matchEntry(entry('32', '藏玲'), context).employee).toBe(mapped);
    expect(matcher.matchEntry(entry('99', '藏玲'), context).employee).toBe(byName);
  });

  test('系统中同名员工不自动匹配', () => {
    const context = {
      mappings: new Map(),
      index: { byId: new Map(), byName: new Map(), duplicateNames: new Set(['欧荣妹']) },
      ambiguousNames: new Set()
    };
    expect(matcher.matchEntry(entry('9', '欧荣妹'), context).reason).toBe('系统中存在同名员工');
  });
});
