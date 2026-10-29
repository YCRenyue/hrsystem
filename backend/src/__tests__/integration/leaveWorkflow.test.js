/**
 * 请假申请与两级审批（/api/leaves）
 *
 * 规则来源：requirement.md 12.5（部门负责人首级审批、HR/admin 最终复核、批准联动年假和考勤、
 * 撤销在事务内恢复）、12.1（年假审批自动扣减、撤销返还）、HR 使用手册第 11 章、8.4、8.6。
 * 2026-11-02 为周一，11-07/08 为周末。
 */
const app = require('../../app');
const {
  Leave, Attendance, AnnualLeave, Notification
} = require('../../models');
const { setupTestDb, resetTestDb, closeTestDb } = require('../helpers/testDb');
const {
  createOrg, createEmployee, createUser, loginAs
} = require('../helpers/fixtures');

beforeAll(setupTestDb, 300000);
beforeEach(resetTestDb);
afterAll(closeTestDb);

let org;
beforeEach(async () => {
  org = await createOrg(app);
});

const apply = (agent, body) => agent.post('/api/leaves').send({
  leave_type: 'personal',
  start_date: '2026-11-02',
  end_date: '2026-11-02',
  days: 1,
  reason: 'test',
  ...body
});
// 接口目前把模型实例原样经过脱敏中间件，字段落在 data.dataValues 里（见下方 BUG 用例），这里两种都兼容
const bodyOf = (res) => (res.body.data && res.body.data.dataValues) || res.body.data;
const idOf = (res) => bodyOf(res).leave_id;
const decide = (agent, leaveId, status, extra = {}) => agent
  .put(`/api/leaves/${leaveId}`).send({ status, ...extra });
const attendanceOf = (employee) => Attendance.findAll({
  where: { employee_id: employee.employee_id }, order: [['date', 'ASC']], raw: true
});

// 回归（测试发现并已修复）：sensitiveDataHandler 递归复制响应时没有先调用 toJSON，直接返回 Sequelize 实例的接口
// 会把 dataValues、_previousDataValues 等内部字段发给前端，data.leave_id 取不到。
test('提交成功后返回的 data 就是请假记录本身', async () => {
  const res = await apply(org.as.staff);
  expect(res.body.data.leave_id).toEqual(expect.any(String));
  expect(res.body.data).not.toHaveProperty('_previousDataValues');
});

describe('提交', () => {
  test('员工给自己提交：忽略请求里的 employee_id，部门有负责人时从部门审批开始', async () => {
    const res = await apply(org.as.staff, { employee_id: org.otherEmp.employee_id });
    expect(res.status).toBe(201);
    expect(bodyOf(res)).toMatchObject({
      employee_id: org.staffEmp.employee_id, status: 'pending', approval_stage: 'department'
    });
  });

  test('部门没有负责人账号时直接到 HR 审批', async () => {
    const res = await apply(org.as.other);
    expect(bodyOf(res).approval_stage).toBe('hr');
  });

  test('HR 可以代员工提交（手册 11 章“HR 代员工申请”）', async () => {
    const res = await apply(org.as.hr, { employee_id: org.otherEmp.employee_id });
    expect(res.status).toBe(201);
    expect(bodyOf(res).employee_id).toBe(org.otherEmp.employee_id);
  });

  test('部门负责人不能替其他部门的员工提交', async () => {
    const res = await apply(org.as.manager, { employee_id: org.otherEmp.employee_id });
    expect(res.status).toBe(403);
  });

  test.each([
    ['结束早于开始', { start_date: '2026-11-03', end_date: '2026-11-02' }],
    ['天数为 0', { days: 0 }],
    ['天数为负', { days: -1 }],
    ['缺少请假类型', { leave_type: undefined }]
  ])('%s -> 400', async (label, body) => {
    expect((await apply(org.as.staff, body)).status).toBe(400);
  });

  test('同一时段已有待审批或已批准的请假 -> 409', async () => {
    await apply(org.as.staff, { start_date: '2026-11-02', end_date: '2026-11-04', days: 3 });
    const res = await apply(org.as.staff, { start_date: '2026-11-04', end_date: '2026-11-05' });
    expect(res.status).toBe(409);
  });

  test('被拒绝的请假不再占用该时段', async () => {
    const first = await apply(org.as.other);
    await decide(org.as.hr, idOf(first), 'rejected');
    expect((await apply(org.as.other)).status).toBe(201);
  });

  test('提交后通知该部门负责人和 HR/admin，不通知其他员工', async () => {
    await apply(org.as.staff);
    const recipients = (await Notification.findAll({ raw: true })).map((n) => n.recipient_user_id);
    expect(recipients).toEqual(expect.arrayContaining([
      org.users.manager.user_id, org.users.hr.user_id, org.users.admin.user_id
    ]));
    expect(recipients).not.toContain(org.users.other.user_id);
    expect(recipients).not.toContain(org.users.staff.user_id);
  });
});

describe('两级审批：部门负责人 -> HR', () => {
  let leaveId;
  beforeEach(async () => {
    leaveId = idOf(await apply(org.as.staff, {
      start_date: '2026-11-05', end_date: '2026-11-09', days: 3
    }));
  });

  test('部门审批阶段 HR 不能直接批准', async () => {
    const res = await decide(org.as.hr, leaveId, 'approved');
    expect(res.status).toBe(403);
    expect((await Leave.findByPk(leaveId)).status).toBe('pending');
  });

  test('部门负责人批准后进入 HR 复核，考勤还不变，并通知 HR', async () => {
    const res = await decide(org.as.manager, leaveId, 'approved');
    expect(res.status).toBe(200);
    const leave = await Leave.findByPk(leaveId);
    expect(leave).toMatchObject({ status: 'pending', approval_stage: 'hr' });
    expect(leave.manager_approver_id).toBe(org.users.manager.user_id);
    expect(await attendanceOf(org.staffEmp)).toEqual([]);
    const hrNotes = await Notification.count({
      where: { recipient_user_id: org.users.hr.user_id, title: '请假申请待HR复核' }
    });
    expect(hrNotes).toBe(1);
  });

  test('HR 复核阶段部门负责人不能再批', async () => {
    await decide(org.as.manager, leaveId, 'approved');
    expect((await decide(org.as.manager, leaveId, 'approved')).status).toBe(403);
  });

  test('HR 最终批准：请假日期中的工作日考勤记为“请假”，周末不写；申请人收到通知', async () => {
    await decide(org.as.manager, leaveId, 'approved');
    const res = await decide(org.as.hr, leaveId, 'approved');
    expect(res.status).toBe(200);
    expect((await Leave.findByPk(leaveId)).status).toBe('approved');
    const days = await attendanceOf(org.staffEmp);
    // 11-05 周四、11-06 周五、11-09 周一；11-07/08 周末
    expect(days.map((d) => [d.date, d.status])).toEqual([
      ['2026-11-05', 'leave'], ['2026-11-06', 'leave'], ['2026-11-09', 'leave']
    ]);
    expect(days.every((d) => d.leave_id === leaveId)).toBe(true);
    const note = await Notification.findOne({
      where: { recipient_user_id: org.users.staff.user_id }, raw: true
    });
    expect(note.title).toBe('请假申请已批准');
  });

  test('部门负责人拒绝：直接结束，申请人收到拒绝通知', async () => {
    await decide(org.as.manager, leaveId, 'rejected', { approval_notes: '人手不够' });
    expect((await Leave.findByPk(leaveId)).status).toBe('rejected');
    const note = await Notification.findOne({
      where: { recipient_user_id: org.users.staff.user_id }, raw: true
    });
    expect(note.title).toBe('请假申请被拒绝');
    expect(note.content).toContain('人手不够');
  });

  test('已经结束的申请不能再审批', async () => {
    await decide(org.as.manager, leaveId, 'rejected');
    expect((await decide(org.as.admin, leaveId, 'approved')).status).toBe(400);
  });

  test('其他部门的负责人看不到也审不了', async () => {
    const otherManager = await loginAs(app, await createUser({
      role: 'department_manager',
      employee: await createEmployee({ department_id: org.otherDept.department_id })
    }));
    expect((await decide(otherManager, leaveId, 'approved')).status).toBe(403);
  });

  test('普通员工不能审批，包括自己的申请', async () => {
    expect((await decide(org.as.staff, leaveId, 'approved')).status).toBe(403);
    expect((await decide(org.as.other, leaveId, 'approved')).status).toBe(403);
  });
});

describe('不能审批自己的申请', () => {
  test('HR 自己的请假不能自己批', async () => {
    const leave = await apply(org.as.hr, {});
    expect(leave.status).toBe(201);
    expect((await decide(org.as.hr, idOf(leave), 'approved')).status).toBe(403);
  });

  // 回归（测试发现并已修复）：部门负责人本人请假时，首级仍是“部门审批”，但负责人不能审自己的，HR 又被
  // “当前需部门负责人审批”挡住，只有 admin 能处理。按“部门负责人首级审批、HR 复核”，
  // 负责人本人的申请应跳过部门级，由 HR 审批。
  test('部门负责人本人的请假由 HR 审批', async () => {
    const leave = await apply(org.as.manager, {});
    const res = await decide(org.as.hr, idOf(leave), 'approved');
    expect(res.status).toBe(200);
  });
});

describe('撤销（在事务内恢复）', () => {
  test('撤销已批准请假：请假新建的考勤删除，原有考勤恢复原状态', async () => {
    await Attendance.create({
      employee_id: org.otherEmp.employee_id, date: '2026-11-02', status: 'late', source: 'card_import'
    });
    const leave = await apply(org.as.other, {
      start_date: '2026-11-02', end_date: '2026-11-03', days: 2
    });
    const leaveId = idOf(leave);
    await decide(org.as.hr, leaveId, 'approved');
    expect((await attendanceOf(org.otherEmp)).map((d) => d.status)).toEqual(['leave', 'leave']);

    const res = await decide(org.as.other, leaveId, 'cancelled');
    expect(res.status).toBe(200);
    const days = await attendanceOf(org.otherEmp);
    expect(days.map((d) => [d.date, d.status, d.leave_id])).toEqual([['2026-11-02', 'late', null]]);
    expect((await Leave.findByPk(leaveId)).status).toBe('cancelled');
  });

  test('已拒绝的申请不能撤销', async () => {
    const leave = await apply(org.as.other);
    await decide(org.as.hr, idOf(leave), 'rejected');
    expect((await decide(org.as.other, idOf(leave), 'cancelled')).status).toBe(400);
  });

  test('员工不能撤销别人的请假', async () => {
    const leave = await apply(org.as.staff);
    expect((await decide(org.as.other, idOf(leave), 'cancelled')).status).toBe(403);
  });
});

describe('年假余额联动（requirement 12.1）', () => {
  // otherEmp 入职 2024-01-01：到 2026 年底满 2 年 -> 5 天
  const applyAnnual = (days, start = '2026-11-02', end = '2026-11-06') => apply(org.as.other, {
    leave_type: 'annual', start_date: start, end_date: end, days
  });
  const balance = async () => {
    const row = await AnnualLeave.findOne({
      where: { employee_id: org.otherEmp.employee_id, year: 2026 }, raw: true
    });
    if (!row) return null;
    const num = ['total_days', 'used_days', 'carry_over_days', 'remaining_days'];
    return { ...row, ...Object.fromEntries(num.map((k) => [k, Number(row[k])])) };
  };

  test('批准时按工龄自动生成当年余额并扣减；撤销后返还', async () => {
    const leaveId = idOf(await applyAnnual(3, '2026-11-02', '2026-11-04'));
    await decide(org.as.hr, leaveId, 'approved');
    expect(await balance()).toMatchObject({ total_days: 5, used_days: 3, remaining_days: 2 });
    await decide(org.as.other, leaveId, 'cancelled');
    expect(await balance()).toMatchObject({ used_days: 0, remaining_days: 5 });
  });

  test('余额不足不能批准，考勤和余额都不变（事务回滚）', async () => {
    await AnnualLeave.create({
      employee_id: org.otherEmp.employee_id,
      year: 2026,
      total_days: 5,
      used_days: 4,
      carry_over_days: 0,
      remaining_days: 1
    });
    const leaveId = idOf(await applyAnnual(2, '2026-11-02', '2026-11-03'));
    const res = await decide(org.as.hr, leaveId, 'approved');
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('年假余额不足');
    expect(await balance()).toMatchObject({ used_days: 4, remaining_days: 1 });
    expect(await attendanceOf(org.otherEmp)).toEqual([]);
    expect((await Leave.findByPk(leaveId)).status).toBe('pending');
  });

  test('年假不能跨自然年度', async () => {
    const leaveId = idOf(await applyAnnual(2, '2026-12-31', '2027-01-01'));
    const res = await decide(org.as.hr, leaveId, 'approved');
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('跨自然年度');
  });

  test('剩余 = 应休 + 结转 - 已休（手册第 10 章）', async () => {
    await AnnualLeave.create({
      employee_id: org.otherEmp.employee_id,
      year: 2026,
      total_days: 5,
      used_days: 2,
      carry_over_days: 1,
      remaining_days: 4
    });
    const leaveId = idOf(await applyAnnual(4, '2026-11-02', '2026-11-05'));
    await decide(org.as.hr, leaveId, 'approved');
    expect(await balance()).toMatchObject({ used_days: 6, remaining_days: 0 });
  });

  test('非年假类型不扣年假余额', async () => {
    const leaveId = idOf(await apply(org.as.other, { leave_type: 'sick' }));
    await decide(org.as.hr, leaveId, 'approved');
    expect(await balance()).toBeNull();
  });

  // 回归（测试发现并已修复）：admin 删除一条已批准的年假时直接删记录，不返还年假、不恢复考勤。
  test('删除已批准的年假后，余额应恢复', async () => {
    const leaveId = idOf(await applyAnnual(2, '2026-11-02', '2026-11-03'));
    await decide(org.as.hr, leaveId, 'approved');
    await org.as.admin.delete(`/api/leaves/${leaveId}`);
    expect(await balance()).toMatchObject({ used_days: 0, remaining_days: 5 });
  });
});

describe('请假统计 /api/leaves/stats（2026-10-28 修复：已批准、已拒绝不再恒为 0）', () => {
  test('按状态计数，员工只看自己', async () => {
    const a = await apply(org.as.other, { start_date: '2026-11-02', end_date: '2026-11-02' });
    const b = await apply(org.as.other, { start_date: '2026-11-03', end_date: '2026-11-03' });
    await apply(org.as.other, { start_date: '2026-11-04', end_date: '2026-11-04' });
    await apply(org.as.staff);
    await decide(org.as.hr, idOf(a), 'approved');
    await decide(org.as.hr, idOf(b), 'rejected');

    const hrStats = (await org.as.hr.get('/api/leaves/stats')).body.data;
    expect(hrStats).toMatchObject({
      totalApplications: 4, pendingCount: 2, approvedCount: 1, rejectedCount: 1
    });
    const own = (await org.as.other.get('/api/leaves/stats')).body.data;
    expect(own).toMatchObject({ totalApplications: 3, pendingCount: 1 });
  });
});

describe('请假列表的数据范围', () => {
  beforeEach(async () => {
    await apply(org.as.staff);
    await apply(org.as.other);
  });
  const ids = async (agent) => {
    const res = await agent.get('/api/leaves');
    expect(res.status).toBe(200);
    return res.body.data.rows.map((l) => l.employee_id).sort();
  };

  test('员工只看到自己的请假', async () => {
    expect(await ids(org.as.staff)).toEqual([org.staffEmp.employee_id]);
  });

  test('部门负责人只看到本部门', async () => {
    expect(await ids(org.as.manager)).toEqual([org.staffEmp.employee_id]);
  });

  test('HR 看到全部', async () => {
    expect(await ids(org.as.hr)).toHaveLength(2);
  });

  test('列表默认不按日期筛选：补请以往日期的请假也能看到', async () => {
    await apply(org.as.other, { start_date: '2025-01-06', end_date: '2025-01-06' });
    expect(await ids(org.as.other)).toHaveLength(2);
  });
});

describe('没有关联员工的账号', () => {
  test('不能给自己提交请假', async () => {
    const lonely = await loginAs(app, await createUser({ role: 'employee' }));
    expect((await apply(lonely)).status).toBe(403);
  });

  test('请假员工不存在 -> 404', async () => {
    const ghost = await createEmployee();
    await ghost.destroy();
    expect((await apply(org.as.hr, { employee_id: ghost.employee_id })).status).toBe(404);
  });
});
