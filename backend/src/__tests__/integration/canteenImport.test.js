/**
 * 食堂刷卡导入与待复核（POST /api/canteen-meals/import-card、/api/punch/anomalies）
 *
 * 规则来源：HR 使用手册第 9 章：
 *  - 10:00-14:00 的刷卡算午餐，15:30-19:30 算晚餐
 *  - 同一餐刷几次只算 1 餐，记录最早的时间
 *  - 不在饭点、周六周日、请假或出差期间的刷卡不自动算餐，进入待复核
 *  - HR 可以把待复核计为午餐、晚餐或忽略，复核结果在重新导入后仍然保留
 * 2026-02-02 为周一，02-07/08 为周末。
 */
const app = require('../../app');
const { CanteenMeal, PunchAnomaly, Leave } = require('../../models');
const { setupTestDb, resetTestDb, closeTestDb } = require('../helpers/testDb');
const {
  createEmployee, createUser, loginAs, createDepartment
} = require('../helpers/fixtures');
const { buildPunchWorkbook } = require('../helpers/punchWorkbook');

beforeAll(setupTestDb, 300000);
beforeEach(resetTestDb);
afterAll(closeTestDb);

const WEEK = { start: '2026-02-02', end: '2026-02-08', exportDate: '2026-02-09' };
let hr;
let emp;

beforeEach(async () => {
  const dept = await createDepartment({ name: '行政部' });
  emp = await createEmployee({ name: '饭卡甲', department_id: dept.department_id });
  hr = await loginAs(app, await createUser({ role: 'hr_admin' }));
});

const importDays = (days) => hr.post('/api/canteen-meals/import-card').attach(
  'file',
  buildPunchWorkbook({ ...WEEK, people: [{ id: '501', name: '饭卡甲', days }] }),
  'canteen.xlsx'
);
const meals = () => CanteenMeal.findAll({
  // meal_type 是 ENUM，按定义顺序（早、午、晚）排序
  where: { employee_id: emp.employee_id },
  order: [['meal_date', 'ASC'], ['meal_type', 'ASC']],
  raw: true
});
const pending = () => PunchAnomaly.findAll({
  where: { employee_id: emp.employee_id, status: 'pending' },
  order: [['punch_date', 'ASC'], ['punch_time', 'ASC']],
  raw: true
});

test('午餐、晚餐按时段分；同一餐多次刷卡只算 1 餐，记最早时间', async () => {
  const res = await importDays({ '2026-02-02': ['11:58', '12:01', '17:40', '18:10'] });
  expect(res.status).toBe(200);
  expect((await meals()).map((m) => [m.meal_date, m.meal_type, m.meal_time])).toEqual([
    ['2026-02-02', 'lunch', '11:58:00'],
    ['2026-02-02', 'dinner', '17:40:00']
  ]);
  expect(await pending()).toEqual([]);
});

test('不在饭点的刷卡进入待复核，不算餐', async () => {
  await importDays({ '2026-02-03': ['08:30', '15:00', '20:00'] });
  expect(await meals()).toEqual([]);
  const items = await pending();
  expect(items.map((a) => [a.punch_time.slice(0, 5), a.reason])).toEqual([
    ['08:30', 'outside_meal_window'],
    ['15:00', 'outside_meal_window'],
    ['20:00', 'outside_meal_window']
  ]);
});

test('周六周日的刷卡进入待复核', async () => {
  await importDays({ '2026-02-07': ['12:00'], '2026-02-08': ['18:00'] });
  expect(await meals()).toEqual([]);
  expect((await pending()).map((a) => a.reason)).toEqual(['non_workday', 'non_workday']);
});

test('已批准请假期间的刷卡进入待复核；未批准的请假不影响', async () => {
  await Leave.bulkCreate([
    {
      employee_id: emp.employee_id,
      leave_type: 'sick',
      start_date: '2026-02-04',
      end_date: '2026-02-04',
      days: 1,
      status: 'approved'
    },
    {
      employee_id: emp.employee_id,
      leave_type: 'sick',
      start_date: '2026-02-05',
      end_date: '2026-02-05',
      days: 1,
      status: 'pending'
    }
  ]);
  await importDays({ '2026-02-04': ['12:00'], '2026-02-05': ['12:00'] });
  expect((await meals()).map((m) => m.meal_date)).toEqual(['2026-02-05']);
  expect((await pending()).map((a) => [a.punch_date, a.reason])).toEqual([
    ['2026-02-04', 'on_leave_or_trip']
  ]);
});

test('HR 把待复核计为午餐；重新导入后复核结果仍保留，不会再次进入待复核', async () => {
  await importDays({ '2026-02-07': ['12:00'] });
  const [anomaly] = await pending();
  const res = await hr.post(`/api/punch/anomalies/${anomaly.anomaly_id}/resolve`)
    .send({ resolution: 'lunch' });
  expect(res.status).toBe(200);
  expect((await meals()).map((m) => [m.meal_date, m.meal_type])).toEqual([['2026-02-07', 'lunch']]);

  await importDays({ '2026-02-07': ['12:00'] });
  expect(await pending()).toEqual([]);
  expect((await meals()).map((m) => [m.meal_date, m.meal_type])).toEqual([['2026-02-07', 'lunch']]);
});

test('忽略的待复核在重新导入后也不会再出现', async () => {
  await importDays({ '2026-02-03': ['08:30'] });
  const [anomaly] = await pending();
  await hr.post(`/api/punch/anomalies/${anomaly.anomaly_id}/resolve`).send({ resolution: 'ignore' });
  await importDays({ '2026-02-03': ['08:30'] });
  expect(await pending()).toEqual([]);
  expect(await meals()).toEqual([]);
});

test('批量复核：已处理过的跳过', async () => {
  await importDays({ '2026-02-07': ['12:00'], '2026-02-08': ['12:00'] });
  const [first, second] = await pending();
  await hr.post(`/api/punch/anomalies/${first.anomaly_id}/resolve`).send({ resolution: 'ignore' });
  const res = await hr.post('/api/punch/anomalies/resolve-batch')
    .send({ ids: [first.anomaly_id, second.anomaly_id], resolution: 'lunch' });
  expect(res.body.data).toEqual({ resolved: 1, skipped: 1 });
});

test('复核结果只能是午餐、晚餐或忽略', async () => {
  await importDays({ '2026-02-07': ['12:00'] });
  const [anomaly] = await pending();
  const res = await hr.post(`/api/punch/anomalies/${anomaly.anomaly_id}/resolve`)
    .send({ resolution: 'breakfast' });
  expect(res.status).toBe(400);
});

test('重新导入同一文件不重复计餐；文件里没有的导入餐次被移除', async () => {
  await importDays({ '2026-02-02': ['12:00'], '2026-02-03': ['12:00'] });
  await importDays({ '2026-02-02': ['12:00'] });
  expect((await meals()).map((m) => m.meal_date)).toEqual(['2026-02-02']);
});

test('HR 手工录入的就餐，导入时不动', async () => {
  await CanteenMeal.create({
    employee_id: emp.employee_id,
    meal_date: '2026-02-02',
    meal_type: 'lunch',
    location_type: 'canteen',
    amount: 0,
    subsidy_amount: 0,
    payment_method: 'card',
    is_subsidized: false,
    source: 'manual'
  });
  const res = await importDays({});
  expect(res.body.data.manual_kept === undefined || res.body.data.manual_kept >= 0).toBe(true);
  expect((await meals()).map((m) => m.source)).toEqual(['manual']);
});

test('只有 HR/admin 能导入和复核', async () => {
  const staff = await loginAs(app, await createUser({ role: 'employee', employee: emp }));
  expect((await staff.post('/api/canteen-meals/import-card')).status).toBe(403);
  expect((await staff.get('/api/punch/anomalies')).status).toBe(403);
});
