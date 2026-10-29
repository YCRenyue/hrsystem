/**
 * 出差申请与差旅报销（/api/business-trips、/api/reimbursements）
 *
 * 规则来源：HR 使用手册第 13 章（时长算法与样例、冲突、两级审批、考勤联动、撤销、报销校验、
 * 按天限额、状态流转与角色）、requirement.md 12.3。时间按北京时间输入，与前端格式一致。
 * 2026-10-23 为周五；2026-10-22 周四；10-24/25 周末。
 */
const app = require('../../app');
const {
  BusinessTrip, Attendance, Reimbursement, Leave, Notification
} = require('../../models');
const { setupTestDb, resetTestDb, closeTestDb } = require('../helpers/testDb');
const { createOrg } = require('../helpers/fixtures');

beforeAll(setupTestDb, 300000);
beforeEach(resetTestDb);
afterAll(closeTestDb);

let org;
beforeEach(async () => {
  org = await createOrg(app);
});

const newTrip = (agent, body = {}) => agent.post('/api/business-trips').send({
  start_datetime: '2026-10-23T09:00:00',
  end_datetime: '2026-10-23T17:30:00',
  destination: '盱眙',
  purpose: 'test',
  ...body
});
const decideTrip = (agent, id, decision) => agent
  .post(`/api/business-trips/${id}/approve`).send({ decision });

/** otherEmp 的部门没有负责人账号，HR 一级批准即可 */
async function approvedTrip(body = {}) {
  const res = await newTrip(org.as.other, body);
  expect(res.status).toBe(201);
  const id = res.body.data.trip_id;
  expect((await decideTrip(org.as.hr, id, 'approved')).status).toBe(200);
  return id;
}

describe('手册 13.2 出差时长', () => {
  test('10-23（周五）09:00 至 17:30：总时长 8.5，计入工时 8.0，跨越天数 0.35', async () => {
    const res = await newTrip(org.as.other);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ status: 'pending' });
    expect(Number(res.body.data.duration_hours)).toBe(8.5);
    expect(Number(res.body.data.work_hours)).toBe(8.0);
    expect(Number(res.body.data.span_days)).toBe(0.35);
  });

  test('周四 14:00 出发、周六 12:00 返回：周四封顶 8、周五 8、周六不计 = 16 小时', async () => {
    const res = await newTrip(org.as.other, {
      start_datetime: '2026-10-22T14:00:00', end_datetime: '2026-10-24T12:00:00'
    });
    expect(Number(res.body.data.work_hours)).toBe(16);
    expect(Number(res.body.data.duration_hours)).toBe(46);
  });

  test('出差单号格式 BTYYYYMMDD####，按当天顺序递增', async () => {
    const a = await newTrip(org.as.other);
    const b = await newTrip(org.as.staff);
    expect(a.body.data.trip_number).toMatch(/^BT\d{8}0001$/);
    expect(b.body.data.trip_number).toMatch(/^BT\d{8}0002$/);
  });

  test('结束时间不晚于开始时间 -> 400', async () => {
    const res = await newTrip(org.as.other, { end_datetime: '2026-10-23T09:00:00' });
    expect(res.status).toBe(400);
  });

  test('缺少目的地 -> 400', async () => {
    expect((await newTrip(org.as.other, { destination: '' })).status).toBe(400);
  });
});

describe('手册 13.1 冲突检查（有冲突不允许提交）', () => {
  test('和本人另一张待审批的出差单重叠', async () => {
    await newTrip(org.as.other);
    const res = await newTrip(org.as.other, {
      start_datetime: '2026-10-23T15:00:00', end_datetime: '2026-10-23T20:00:00'
    });
    expect(res.status).toBe(400);
    expect(await BusinessTrip.count()).toBe(1);
  });

  test('出差日期内已有已批准的请假', async () => {
    await Leave.create({
      employee_id: org.otherEmp.employee_id,
      leave_type: 'personal',
      start_date: '2026-10-23',
      end_date: '2026-10-23',
      days: 1,
      status: 'approved'
    });
    const res = await newTrip(org.as.other);
    expect(res.status).toBe(400);
  });

  test('别人的出差不算冲突；首尾相接不算重叠', async () => {
    await newTrip(org.as.staff);
    expect((await newTrip(org.as.other)).status).toBe(201);
    const next = await newTrip(org.as.other, {
      start_datetime: '2026-10-23T17:30:00', end_datetime: '2026-10-23T19:00:00'
    });
    expect(next.status).toBe(201);
  });

  test('已撤销的出差不再占用时段', async () => {
    const first = await newTrip(org.as.other);
    await org.as.other.post(`/api/business-trips/${first.body.data.trip_id}/cancel`).send({});
    expect((await newTrip(org.as.other)).status).toBe(201);
  });
});

describe('手册 13.3 审批', () => {
  test('有部门负责人时两级：负责人 -> HR；部门阶段 HR 不能批', async () => {
    const id = (await newTrip(org.as.staff)).body.data.trip_id;
    expect((await decideTrip(org.as.hr, id, 'approved')).status).toBe(403);
    expect((await decideTrip(org.as.manager, id, 'approved')).status).toBe(200);
    expect(await BusinessTrip.findByPk(id)).toMatchObject({ status: 'pending', approval_stage: 'hr' });
    expect((await decideTrip(org.as.hr, id, 'approved')).status).toBe(200);
    expect((await BusinessTrip.findByPk(id)).status).toBe('approved');
  });

  test('超级管理员可以审批任意一级', async () => {
    const id = (await newTrip(org.as.staff)).body.data.trip_id;
    expect((await decideTrip(org.as.admin, id, 'approved')).status).toBe(200);
    expect((await decideTrip(org.as.admin, id, 'approved')).status).toBe(200);
    expect((await BusinessTrip.findByPk(id)).status).toBe('approved');
  });

  test('不能审批自己的出差申请', async () => {
    const id = (await newTrip(org.as.hr, { employee_id: org.hrEmp.employee_id })).body.data.trip_id;
    expect((await decideTrip(org.as.hr, id, 'approved')).status).toBe(403);
  });

  test('员工不能审批', async () => {
    const id = (await newTrip(org.as.other)).body.data.trip_id;
    expect((await decideTrip(org.as.staff, id, 'approved')).status).toBe(403);
  });

  test('被拒绝的可以修改后重新提交，重新从部门审批开始', async () => {
    const id = (await newTrip(org.as.staff)).body.data.trip_id;
    await decideTrip(org.as.manager, id, 'rejected');
    const edit = await org.as.staff.put(`/api/business-trips/${id}`).send({ destination: '南京' });
    expect(edit.status).toBe(200);
    const resubmit = await org.as.staff.post(`/api/business-trips/${id}/submit`).send({});
    expect(resubmit.status).toBe(200);
    expect(await BusinessTrip.findByPk(id)).toMatchObject({
      status: 'pending', approval_stage: 'department', destination: '南京'
    });
  });

  test('已批准的出差单不能修改', async () => {
    const id = await approvedTrip();
    const res = await org.as.other.put(`/api/business-trips/${id}`).send({ destination: '南京' });
    expect(res.status).toBe(400);
  });

  test('员工只能看到自己的出差', async () => {
    await newTrip(org.as.staff);
    await newTrip(org.as.other);
    const res = await org.as.other.get('/api/business-trips');
    const rows = res.body.data.rows || res.body.data;
    expect(rows.map((t) => t.employee_id)).toEqual([org.otherEmp.employee_id]);
  });
});

describe('手册 13.3 / 13.5 考勤联动', () => {
  test('批准后出差期间工作日记“出差”、工时 8、迟到早退清零；周末不写', async () => {
    await Attendance.create({
      employee_id: org.otherEmp.employee_id,
      date: '2026-10-22',
      status: 'late',
      late_minutes: 12,
      work_hours: 7.5,
      source: 'card_import'
    });
    await approvedTrip({ start_datetime: '2026-10-22T14:00:00', end_datetime: '2026-10-25T12:00:00' });
    const days = await Attendance.findAll({
      where: { employee_id: org.otherEmp.employee_id }, order: [['date', 'ASC']], raw: true
    });
    expect(days.map((d) => [d.date, d.status, Number(d.work_hours), d.late_minutes])).toEqual([
      ['2026-10-22', 'business_trip', 8, 0],
      ['2026-10-23', 'business_trip', 8, 0]
    ]);
  });

  test('撤销已批准的出差：审批时新建的考勤删除，原有考勤恢复原状态', async () => {
    await Attendance.create({
      employee_id: org.otherEmp.employee_id,
      date: '2026-10-22',
      status: 'late',
      late_minutes: 12,
      work_hours: 7.5,
      source: 'card_import'
    });
    const id = await approvedTrip({
      start_datetime: '2026-10-22T14:00:00', end_datetime: '2026-10-23T18:00:00'
    });
    const res = await org.as.other.post(`/api/business-trips/${id}/cancel`).send({});
    expect(res.status).toBe(200);
    const days = await Attendance.findAll({
      where: { employee_id: org.otherEmp.employee_id }, raw: true
    });
    expect(days.map((d) => [d.date, d.status, d.business_trip_id])).toEqual([
      ['2026-10-22', 'late', null]
    ]);
  });

  // 回归（测试发现并已修复）：审批时把工时改成 8、迟到清零，撤销时只还原了状态。还原后状态是“迟到”，
  // 迟到分钟却是 0、工时是 8，报表统计会出错。
  test('撤销后迟到分钟和工时按原打卡恢复', async () => {
    // 冬令时 08:12 到、18:00 走：迟到 12 分钟，工时 3.3 + 4.5 = 7.8 小时
    await Attendance.create({
      employee_id: org.otherEmp.employee_id,
      date: '2026-10-22',
      status: 'late',
      late_minutes: 12,
      work_hours: 7.8,
      source: 'card_import',
      check_in_time: '08:12:00',
      morning_check_in: '08:12:00',
      check_out_time: '18:00:00',
      afternoon_check_out: '18:00:00'
    });
    const id = await approvedTrip({
      start_datetime: '2026-10-22T14:00:00', end_datetime: '2026-10-22T18:00:00'
    });
    await org.as.other.post(`/api/business-trips/${id}/cancel`).send({});
    const day = await Attendance.findOne({
      where: { employee_id: org.otherEmp.employee_id, date: '2026-10-22' }, raw: true
    });
    expect(day).toMatchObject({ status: 'late', late_minutes: 12, early_leave_minutes: 0 });
    expect(Number(day.work_hours)).toBe(7.8);
  });

  test('之后再批请假：同一天已有已批准出差时不能批准', async () => {
    await approvedTrip();
    const leave = await Leave.create({
      employee_id: org.otherEmp.employee_id,
      leave_type: 'personal',
      start_date: '2026-10-23',
      end_date: '2026-10-23',
      days: 1,
      status: 'pending',
      approval_stage: 'hr'
    });
    const res = await org.as.hr.put(`/api/leaves/${leave.leave_id}`).send({ status: 'approved' });
    expect(res.status).toBe(400);
    expect((await Leave.findByPk(leave.leave_id)).status).toBe('pending');
  });

  test('删除只能由超级管理员做，且只能删草稿、已撤销、已拒绝的', async () => {
    const id = await approvedTrip();
    expect((await org.as.hr.delete(`/api/business-trips/${id}`)).status).toBe(403);
    expect((await org.as.admin.delete(`/api/business-trips/${id}`)).status).toBe(400);
    await org.as.other.post(`/api/business-trips/${id}/cancel`).send({});
    expect((await org.as.admin.delete(`/api/business-trips/${id}`)).status).toBe(200);
  });
});

describe('手册 13.6 报销', () => {
  let tripId;
  beforeEach(async () => {
    tripId = await approvedTrip({
      start_datetime: '2026-10-22T08:00:00', end_datetime: '2026-10-23T18:00:00'
    });
  });
  const item = (category, amount, date = '2026-10-22') => ({
    category, amount, occurred_on: date, description: 'x'
  });
  const reimburse = (agent, items, extra = {}) => agent.post('/api/reimbursements').send({
    trip_id: tripId, items, ...extra
  });

  test('完整流程：提交 -> HR 审核通过 -> 财务发放；合计金额按明细相加', async () => {
    const res = await reimburse(org.as.other, [
      item('transport', 120.5), item('meal', 80), item('accommodation', 300, '2026-10-23')
    ]);
    expect(res.status).toBe(201);
    const id = res.body.data.reimbursement_id;
    expect(res.body.data.reimbursement_number).toMatch(/^RB\d{8}0001$/);
    expect(Number(res.body.data.total_amount)).toBe(500.5);

    expect((await org.as.finance.post(`/api/reimbursements/${id}/approve`)
      .send({ decision: 'approved' })).status).toBe(403);
    expect((await org.as.hr.post(`/api/reimbursements/${id}/approve`)
      .send({ decision: 'approved' })).status).toBe(200);
    expect((await org.as.hr.post(`/api/reimbursements/${id}/pay`).send({})).status).toBe(403);
    const pay = await org.as.finance.post(`/api/reimbursements/${id}/pay`)
      .send({ payment_reference: 'BANK-001' });
    expect(pay.status).toBe(200);
    expect(await Reimbursement.findByPk(id)).toMatchObject({
      status: 'paid', payment_reference: 'BANK-001'
    });
    expect((await BusinessTrip.findByPk(tripId)).reimbursement_status).toBe('reimbursed');
  });

  test('未审核通过的报销单不能发放', async () => {
    const id = (await reimburse(org.as.other, [item('meal', 50)])).body.data.reimbursement_id;
    expect((await org.as.finance.post(`/api/reimbursements/${id}/pay`).send({})).status).toBe(400);
  });

  test('同一天住宿合计 ¥500 可以，超过不能保存，并提示超限日期', async () => {
    expect((await reimburse(org.as.other, [
      item('accommodation', 300), item('accommodation', 200)
    ])).status).toBe(201);
    const res = await reimburse(org.as.other, [
      item('accommodation', 300, '2026-10-23'), item('accommodation', 200.01, '2026-10-23')
    ]);
    expect(res.status).toBe(400);
    expect(res.body.details.violations).toEqual([
      expect.objectContaining({ category: 'accommodation', date: '2026-10-23', limit: 500 })
    ]);
  });

  test('同一天餐费合计不超过 ¥150；不同天各自计算', async () => {
    expect((await reimburse(org.as.other, [
      item('meal', 150), item('meal', 150, '2026-10-23')
    ])).status).toBe(201);
    expect((await reimburse(org.as.other, [item('meal', 100), item('meal', 51)])).status).toBe(400);
  });

  test('交通、其他类别没有按天限额', async () => {
    expect((await reimburse(org.as.other, [item('transport', 2000), item('other', 999)])).status)
      .toBe(201);
  });

  // 回归（测试发现并已修复）：按天限额只在一张报销单内累加。同一出差、同一天的住宿拆成两张报销单各报 ¥500，
  // 合计 ¥1000 也能提交。手册规则是“同一天的住宿合计不超过 ¥500”。
  test('同一出差同一天的住宿拆成两张报销单，合计仍受 ¥500 限制', async () => {
    expect((await reimburse(org.as.other, [item('accommodation', 500)])).status).toBe(201);
    expect((await reimburse(org.as.other, [item('accommodation', 500)])).status).toBe(400);
  });

  test('发生日期必须在出差日期范围内', async () => {
    const res = await reimburse(org.as.other, [item('meal', 50, '2026-10-24')]);
    expect(res.status).toBe(400);
  });

  test.each([
    ['不存在的类别', { category: 'gift', amount: 10, occurred_on: '2026-10-22' }],
    ['负数金额', { category: 'meal', amount: -1, occurred_on: '2026-10-22' }],
    ['缺发生日期', { category: 'meal', amount: 10 }]
  ])('%s -> 400', async (label, bad) => {
    expect((await reimburse(org.as.other, [bad])).status).toBe(400);
  });

  test('没有明细不能提交', async () => {
    expect((await reimburse(org.as.other, [])).status).toBe(400);
  });

  test('只能关联本人已批准的出差单', async () => {
    const pending = (await newTrip(org.as.other, {
      start_datetime: '2026-11-02T09:00:00', end_datetime: '2026-11-02T17:00:00'
    })).body.data.trip_id;
    const res = await org.as.other.post('/api/reimbursements').send({
      trip_id: pending, items: [item('meal', 10, '2026-11-02')]
    });
    expect(res.status).toBe(400);
    // 别人的出差单：员工提交时报销人固定为本人，与出差单员工不一致
    expect((await reimburse(org.as.staff, [item('meal', 10)])).status).toBe(400);
  });

  test('被拒绝的报销单可以修改后重新提交', async () => {
    const id = (await reimburse(org.as.other, [item('meal', 50)])).body.data.reimbursement_id;
    await org.as.hr.post(`/api/reimbursements/${id}/approve`).send({ decision: 'rejected' });
    const edit = await org.as.other.put(`/api/reimbursements/${id}`).send({
      items: [item('meal', 40)]
    });
    expect(edit.status).toBe(200);
    expect(Number(edit.body.data.total_amount)).toBe(40);
    expect((await org.as.other.post(`/api/reimbursements/${id}/submit`)).status).toBe(200);
    expect((await Reimbursement.findByPk(id)).status).toBe('pending');
  });

  test('已审核通过的不能再修改', async () => {
    const id = (await reimburse(org.as.other, [item('meal', 50)])).body.data.reimbursement_id;
    await org.as.hr.post(`/api/reimbursements/${id}/approve`).send({ decision: 'approved' });
    const res = await org.as.other.put(`/api/reimbursements/${id}`).send({ items: [item('meal', 1)] });
    expect(res.status).toBe(400);
  });

  test('员工看不到别人的报销单', async () => {
    const id = (await reimburse(org.as.other, [item('meal', 50)])).body.data.reimbursement_id;
    expect((await org.as.staff.get(`/api/reimbursements/${id}`)).status).toBe(403);
  });

  test('撤销出差单时，草稿、待审核、已通过的报销单一起撤销', async () => {
    const draft = (await reimburse(org.as.other, [item('meal', 10)], { submit: false }))
      .body.data.reimbursement_id;
    const approved = (await reimburse(org.as.other, [item('meal', 10, '2026-10-23')]))
      .body.data.reimbursement_id;
    await org.as.hr.post(`/api/reimbursements/${approved}/approve`).send({ decision: 'approved' });
    const res = await org.as.other.post(`/api/business-trips/${tripId}/cancel`).send({});
    expect(res.status).toBe(200);
    expect((await Reimbursement.findByPk(draft)).status).toBe('cancelled');
    expect((await Reimbursement.findByPk(approved)).status).toBe('cancelled');
  });

  test('已有报销单“已发放”时，出差单不能撤销，考勤和报销都不变', async () => {
    const id = (await reimburse(org.as.other, [item('meal', 10)])).body.data.reimbursement_id;
    await org.as.hr.post(`/api/reimbursements/${id}/approve`).send({ decision: 'approved' });
    await org.as.finance.post(`/api/reimbursements/${id}/pay`).send({});
    const res = await org.as.other.post(`/api/business-trips/${tripId}/cancel`).send({});
    expect(res.status).toBe(400);
    expect((await BusinessTrip.findByPk(tripId)).status).toBe('approved');
    expect((await Reimbursement.findByPk(id)).status).toBe('paid');
    expect(await Attendance.count({ where: { business_trip_id: tripId } })).toBe(2);
  });

  test('删除：只有超级管理员，且只能删草稿、已撤销、已拒绝的', async () => {
    const id = (await reimburse(org.as.other, [item('meal', 10)])).body.data.reimbursement_id;
    expect((await org.as.hr.delete(`/api/reimbursements/${id}`)).status).toBe(403);
    expect((await org.as.admin.delete(`/api/reimbursements/${id}`)).status).toBe(400);
    await org.as.other.post(`/api/reimbursements/${id}/cancel`).send({});
    expect((await org.as.admin.delete(`/api/reimbursements/${id}`)).status).toBe(200);
  });

  // 回归（测试发现并已修复）：手册写明审核人是 HR 管理员/超级管理员，requirement 12.5 要求“审批人与财务通知分别
  // 投递到对应角色”。但提交时“新报销单待审核”发给了财务和 admin，HR 收不到。
  test('提交报销单后，负责审核的 HR 收到待审核通知', async () => {
    await reimburse(org.as.other, [item('meal', 10)]);
    const count = await Notification.count({
      where: { recipient_user_id: org.users.hr.user_id, related_resource: 'reimbursement' }
    });
    expect(count).toBeGreaterThan(0);
  });
});
