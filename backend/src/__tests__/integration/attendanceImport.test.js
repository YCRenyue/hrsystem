/**
 * 考勤打卡导入（POST /api/attendances/import-card）
 *
 * 预期值全部来自《HR 使用手册》第 8 章（8.1 导入、8.2 作息、8.3 每日考勤、8.4 重新导入），
 * 不是从代码推出来的。文件经真实接口上传，结果从真实测试库读出。
 */
const app = require('../../app');
const { Attendance, PunchCardMapping } = require('../../models');
const { setupTestDb, resetTestDb, closeTestDb } = require('../helpers/testDb');
const {
  createDepartment, createEmployee, createUser, loginAs
} = require('../helpers/fixtures');
const { buildPunchWorkbook } = require('../helpers/punchWorkbook');

beforeAll(setupTestDb, 300000);
beforeEach(resetTestDb);
afterAll(closeTestDb);

// 2026-03 为冬令时；03-02 周一 ... 03-07 周六、03-08 周日
const WEEK = { start: '2026-03-02', end: '2026-03-08', exportDate: '2026-03-09' };

let hr;
let office;
let factory;
let officeEmp;
let factoryEmp;

beforeEach(async () => {
  office = await createDepartment({ name: '行政部' });
  factory = await createDepartment({ name: '生产部' });
  officeEmp = await createEmployee({ name: '测试甲', department_id: office.department_id });
  factoryEmp = await createEmployee({ name: '测试乙', department_id: factory.department_id });
  hr = await loginAs(app, await createUser({ role: 'hr_admin' }));
});

const upload = (agent, buffer, name = 'punch.xlsx') => agent
  .post('/api/attendances/import-card')
  .attach('file', buffer, name);

const dayOf = async (employee, date) => Attendance.findOne({
  where: { employee_id: employee.employee_id, date }, raw: true
});

describe('手册 8.3 计算样例（冬令时，经真实导入写库）', () => {
  let result;

  beforeEach(async () => {
    const file = buildPunchWorkbook({
      ...WEEK,
      people: [
        {
          id: '101',
          name: '测试甲',
          days: {
            '2026-03-02': ['07:52', '11:35', '13:28', '19:05'],
            '2026-03-03': ['08:05', '11:31', '14:10', '18:00'],
            '2026-03-04': ['19:15'],
            // 03-05 全天没有打卡
            '2026-03-06': ['07:13', '07:14', '11:40', '13:20', '18:05'],
            '2026-03-07': ['08:00', '17:00']
          }
        },
        {
          id: '102',
          name: '测试乙',
          days: {
            '2026-03-02': ['07:40', '17:30'],
            '2026-03-03': ['07:30', '18:00'],
            '2026-03-04': ['07:25', '10:00', '18:10'],
            '2026-03-05': ['07:30', '18:00'],
            '2026-03-06': ['07:30', '18:00']
          }
        }
      ]
    });
    const res = await upload(hr, file);
    expect(res.status).toBe(200);
    result = res.body.data;
  });

  test('行政员工 07:52、11:35、13:28、19:05：正常，工作 8.0 小时，加班 1.1 小时', async () => {
    const day = await dayOf(officeEmp, '2026-03-02');
    expect(day).toMatchObject({
      status: 'normal',
      late_minutes: 0,
      early_leave_minutes: 0,
      check_in_time: '07:52:00',
      morning_check_out: '11:35:00',
      afternoon_check_in: '13:28:00',
      check_out_time: '19:05:00'
    });
    expect(Number(day.work_hours)).toBe(8.0);
    expect(Number(day.overtime_hours)).toBe(1.1);
  });

  test('生产部 07:40、17:30：迟到 10 分钟、早退 30 分钟，状态迟到，工作 7.8 小时', async () => {
    const day = await dayOf(factoryEmp, '2026-03-02');
    expect(day).toMatchObject({ status: 'late', late_minutes: 10, early_leave_minutes: 30 });
    expect(Number(day.work_hours)).toBe(7.8);
    expect(Number(day.overtime_hours)).toBe(0);
  });

  test('午休晚回 14:10：迟到 5 + 40 = 45 分钟，只记迟到不扣工作时长（7.9 小时）', async () => {
    const day = await dayOf(officeEmp, '2026-03-03');
    expect(day).toMatchObject({ status: 'late', late_minutes: 45, early_leave_minutes: 0 });
    expect(Number(day.work_hours)).toBe(7.9);
  });

  test('只有 19:15 一次打卡：缺卡，工作时长和加班为 0', async () => {
    const day = await dayOf(officeEmp, '2026-03-04');
    expect(day.status).toBe('missing_punch');
    expect(Number(day.work_hours)).toBe(0);
    expect(Number(day.overtime_hours)).toBe(0);
  });

  test('工作日全天没有打卡：缺勤，并列入旷工提醒', async () => {
    expect((await dayOf(officeEmp, '2026-03-05')).status).toBe('absent');
    expect(result.absent_without_leave).toEqual([
      expect.objectContaining({ name: '测试甲', dates: ['2026-03-05'] })
    ]);
  });

  test('5 分钟内重复打卡算一次：07:13、07:14 只记 07:13；加班 5 分钟记 0.1 小时', async () => {
    const day = await dayOf(officeEmp, '2026-03-06');
    expect(day).toMatchObject({
      status: 'normal',
      check_in_time: '07:13:00',
      morning_check_out: '11:40:00',
      afternoon_check_in: '13:20:00'
    });
    expect(day.notes).toBeNull();
    expect(Number(day.overtime_hours)).toBe(0.1);
  });

  test('周六 08:00、17:00：周末，不算迟到早退，加班 9 - 2 = 7.0 小时', async () => {
    const day = await dayOf(officeEmp, '2026-03-07');
    expect(day).toMatchObject({ status: 'weekend', late_minutes: 0, early_leave_minutes: 0 });
    expect(Number(day.overtime_hours)).toBe(7.0);
    expect(Number(day.work_hours)).toBe(0);
  });

  test('周日没有打卡：仍是周末，不算缺勤、不进旷工提醒', async () => {
    expect((await dayOf(factoryEmp, '2026-03-08')).status).toBe('weekend');
    const names = result.absent_without_leave.map((p) => p.name);
    expect(names).not.toContain('测试乙');
  });

  test('生产部冬令时出满勤 07:30-18:00 为 8.5 小时', async () => {
    const day = await dayOf(factoryEmp, '2026-03-03');
    expect(day.status).toBe('normal');
    expect(Number(day.work_hours)).toBe(8.5);
  });

  test('中间的外出打卡记入备注“额外打卡”，不影响结果', async () => {
    const day = await dayOf(factoryEmp, '2026-03-04');
    expect(day.status).toBe('normal');
    expect(day.notes).toContain('10:00');
    expect(Number(day.work_hours)).toBe(8.5);
    expect(Number(day.overtime_hours)).toBe(0.2);
  });

  test('每人每天正好一条考勤，周期内 7 天全部写入', async () => {
    expect(await Attendance.count({ where: { employee_id: officeEmp.employee_id } })).toBe(7);
    expect(result).toMatchObject({ matched: 2, daily_created: 14, daily_updated: 0 });
  });
});

describe('手册 8.1 / 8.4 导入规则', () => {
  const oneDay = (days) => buildPunchWorkbook({
    ...WEEK, people: [{ id: '101', name: '测试甲', days }]
  });

  test('同一文件再导一次只覆盖更新，不会重复', async () => {
    const file = oneDay({ '2026-03-02': ['07:52', '18:01'] });
    await upload(hr, file);
    const second = await upload(hr, oneDay({ '2026-03-02': ['08:10', '18:01'] }));
    expect(second.body.data).toMatchObject({ daily_created: 0, daily_updated: 7 });
    expect(await Attendance.count({ where: { employee_id: officeEmp.employee_id } })).toBe(7);
    const day = await dayOf(officeEmp, '2026-03-02');
    expect(day).toMatchObject({ status: 'late', late_minutes: 10, check_in_time: '08:10:00' });
  });

  test('已批准请假的日期：只更新打卡时间，状态仍为请假，并列为“已请假但有打卡”', async () => {
    await Attendance.create({
      employee_id: officeEmp.employee_id, date: '2026-03-03', status: 'leave', source: 'leave'
    });
    const res = await upload(hr, oneDay({ '2026-03-03': ['09:00', '18:00'] }));
    const day = await dayOf(officeEmp, '2026-03-03');
    expect(day.status).toBe('leave');
    expect(day.check_in_time).toBe('09:00:00');
    expect(day.late_minutes).toBe(0);
    expect(res.body.data.leave_with_punch).toEqual([
      expect.objectContaining({ name: '测试甲', dates: ['2026-03-03'] })
    ]);
  });

  test('已批准请假且当天没打卡：不是旷工', async () => {
    await Attendance.create({
      employee_id: officeEmp.employee_id, date: '2026-03-03', status: 'leave', source: 'leave'
    });
    const res = await upload(hr, oneDay({ '2026-03-02': ['08:00', '18:00'] }));
    expect((await dayOf(officeEmp, '2026-03-03')).status).toBe('leave');
    const absent = res.body.data.absent_without_leave.flatMap((p) => p.dates);
    expect(absent).not.toContain('2026-03-03');
    expect(res.body.data.leave_with_punch).toEqual([]);
  });

  test('出差日期同样受保护，导入不改状态', async () => {
    await Attendance.create({
      employee_id: officeEmp.employee_id, date: '2026-03-04', status: 'business_trip', source: 'trip'
    });
    await upload(hr, oneDay({ '2026-03-04': ['10:00', '12:00'] }));
    expect((await dayOf(officeEmp, '2026-03-04')).status).toBe('business_trip');
  });

  test('HR 手工录入的考勤，导入时不动', async () => {
    await Attendance.create({
      employee_id: officeEmp.employee_id,
      date: '2026-03-02',
      status: 'normal',
      source: 'manual',
      check_in_time: '08:00:00'
    });
    const res = await upload(hr, oneDay({ '2026-03-02': ['09:30', '17:00'] }));
    const day = await dayOf(officeEmp, '2026-03-02');
    expect(day).toMatchObject({ status: 'normal', check_in_time: '08:00:00', late_minutes: 0 });
    expect(res.body.data.manual_kept).toBe(1);
  });

  test('导出当天及之后的日期不导入', async () => {
    const file = buildPunchWorkbook({
      ...WEEK,
      exportDate: '2026-03-05',
      people: [{ id: '101', name: '测试甲', days: { '2026-03-06': ['08:00', '18:00'] } }]
    });
    const res = await upload(hr, file);
    expect(res.body.data.skipped_dates).toEqual(
      ['2026-03-05', '2026-03-06', '2026-03-07', '2026-03-08']
    );
    expect(await dayOf(officeEmp, '2026-03-06')).toBeNull();
    expect(await Attendance.count({ where: { employee_id: officeEmp.employee_id } })).toBe(3);
  });

  test('姓名对不上且有打卡的人列为未匹配；整个周期没打卡的人不列出', async () => {
    const file = buildPunchWorkbook({
      ...WEEK,
      people: [
        { id: '201', name: '不存在甲', days: { '2026-03-02': ['08:00'] } },
        { id: '202', name: '不存在乙', days: {} }
      ]
    });
    const res = await upload(hr, file);
    expect(res.body.data.unmatched.map((p) => p.name)).toEqual(['不存在甲']);
    expect(res.body.data.matched).toBe(0);
    expect(await Attendance.count()).toBe(0);
  });

  test('工号对照表优先于姓名：机器上的名字写错也能对上', async () => {
    await PunchCardMapping.create({
      device_type: 'attendance', external_id: '301', employee_id: factoryEmp.employee_id
    });
    const file = buildPunchWorkbook({
      ...WEEK, people: [{ id: '301', name: '测试已', days: { '2026-03-02': ['07:30', '18:00'] } }]
    });
    const res = await upload(hr, file);
    expect(res.body.data.matched).toBe(1);
    expect((await dayOf(factoryEmp, '2026-03-02')).status).toBe('normal');
  });

  test('系统里有两个同名员工时不猜测，列入待确认', async () => {
    await createEmployee({ name: '测试甲', department_id: office.department_id });
    const res = await upload(hr, oneDay({ '2026-03-02': ['08:00', '18:00'] }));
    expect(res.body.data.ambiguous).toEqual([
      expect.objectContaining({ name: '测试甲', reason: '系统中存在同名员工' })
    ]);
    expect(await Attendance.count()).toBe(0);
  });

  test('离职日期之后仍有打卡：照常导入并单独列出', async () => {
    await officeEmp.update({ leave_date: '2026-03-03', status: 'inactive' });
    const res = await upload(hr, oneDay({
      '2026-03-03': ['08:00', '18:00'], '2026-03-04': ['08:00', '18:00']
    }));
    expect(res.body.data.punches_after_leave).toEqual([
      expect.objectContaining({ name: '测试甲', leave_date: '2026-03-03', dates: ['2026-03-04'] })
    ]);
    expect((await dayOf(officeEmp, '2026-03-04')).status).toBe('normal');
  });

  test('没有上传文件返回 400', async () => {
    const res = await hr.post('/api/attendances/import-card');
    expect(res.status).toBe(400);
  });

  // 回归（测试发现并已修复）：手册 8.1 要求导出时保留“刷卡记录”表；缺了这张表时服务端抛出普通 Error，
  // 接口返回 500“服务器发生错误”，HR 看不到真正原因。
  test('文件里没有“刷卡记录”表时返回 400 并说明原因', async () => {
    const XLSX = require('xlsx'); // eslint-disable-line global-require
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['x']]), '汇总表');
    const res = await upload(hr, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('刷卡记录');
  });
});

describe('权限：只有 HR 和管理员能导入考勤打卡', () => {
  const file = () => buildPunchWorkbook({ ...WEEK, people: [] });

  test.each([
    ['employee', 403],
    ['department_manager', 403],
    ['finance', 403],
    ['admin', 200]
  ])('%s -> %i', async (role, status) => {
    const agent = await loginAs(app, await createUser({ role, departmentId: office.department_id }));
    expect((await upload(agent, file())).status).toBe(status);
  });

  test('未登录 -> 401', async () => {
    const request = require('supertest'); // eslint-disable-line global-require
    const res = await request(app).post('/api/attendances/import-card');
    expect(res.status).toBe(401);
  });
});
