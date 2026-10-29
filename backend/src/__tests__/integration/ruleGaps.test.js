/**
 * 完整变异测试后补的规则测试：每一条都对应一处“改了代码测试却没发现”的业务规则。
 *
 * 规则来源：requirement.md 12.1（年度余额按上限结转）、12.3（出差报销状态同步、编辑）、
 * HR 使用手册 13.4（水印打卡按每个自然日检查，含周末）、13.6（报销状态与按天限额）、
 * 8.1/8.4（制表时间、重新导入）、CLAUDE.md 三级权限（数据范围）。
 * 2026-10-22 周四、10-24/25 周末。
 */
const app = require('../../app');
const {
  AnnualLeave, BusinessTrip, Reimbursement, ReimbursementItem, Leave
} = require('../../models');
const AnnualLeaveService = require('../../services/AnnualLeaveService');
const dataScope = require('../../services/DataScopeService');
const { setupTestDb, resetTestDb, closeTestDb } = require('../helpers/testDb');
const { createOrg, createEmployee } = require('../helpers/fixtures');

beforeAll(setupTestDb, 300000);
beforeEach(resetTestDb);
afterAll(closeTestDb);

let org;
beforeEach(async () => {
  org = await createOrg(app);
});

describe('年假结转（上年剩余按上限 5 天结转，requirement 12.1）', () => {
  // otherEmp 入职 2024-01-01：2026 年满 2 年，应休 5 天
  const lastYear = (remaining) => AnnualLeave.create({
    employee_id: org.otherEmp.employee_id,
    year: 2025,
    total_days: 5,
    used_days: 5 - remaining,
    remaining_days: remaining
  });
  const balance2026 = async () => {
    const b = await AnnualLeaveService.ensureBalance(org.otherEmp, 2026);
    return [b.total_days, b.carry_over_days, b.remaining_days].map(Number);
  };

  test('上年剩余 3 天：结转 3 天，今年剩余 = 5 + 3', async () => {
    await lastYear(3);
    expect(await balance2026()).toEqual([5, 3, 8]);
  });

  test('上年剩余超过上限：只结转 5 天', async () => {
    await AnnualLeave.create({
      employee_id: org.otherEmp.employee_id, year: 2025, total_days: 10, used_days: 2, remaining_days: 8
    });
    expect(await balance2026()).toEqual([5, 5, 10]);
  });

  test('上年休完（剩余 0）：不结转', async () => {
    await lastYear(0);
    expect(await balance2026()).toEqual([5, 0, 5]);
  });

  test('只看上一年，前年的余额不结转', async () => {
    await AnnualLeave.create({
      employee_id: org.otherEmp.employee_id, year: 2024, total_days: 5, used_days: 0, remaining_days: 5
    });
    expect(await balance2026()).toEqual([5, 0, 5]);
  });

  test('当年记录已存在时原样返回，不重复生成', async () => {
    await AnnualLeave.create({
      employee_id: org.otherEmp.employee_id, year: 2026, total_days: 7, used_days: 1, remaining_days: 6
    });
    expect(await balance2026()).toEqual([7, 0, 6]);
    expect(await AnnualLeave.count({ where: { employee_id: org.otherEmp.employee_id } })).toBe(1);
  });

  test('离职结算：当年没有年假记录时不报错', async () => {
    expect(await AnnualLeaveService.settleOnOffboarding(org.otherEmp, '2026-10-31')).toBeNull();
  });
});

describe('出差：编辑、水印打卡、报销状态同步', () => {
  const trip = (body = {}) => org.as.other.post('/api/business-trips').send({
    start_datetime: '2026-10-22T08:00:00',
    end_datetime: '2026-10-25T18:00:00',
    destination: '南京',
    ...body
  });

  test('待审批的出差单改了地点和时间也不会和自己冲突', async () => {
    const id = (await trip()).body.data.trip_id;
    const res = await org.as.other.put(`/api/business-trips/${id}`).send({
      destination: '苏州', end_datetime: '2026-10-25T20:00:00'
    });
    expect(res.status).toBe(200);
    expect((await BusinessTrip.findByPk(id)).destination).toBe('苏州');
  });

  test('改到和本人另一张出差单重叠：不允许', async () => {
    await trip();
    const second = (await trip({
      start_datetime: '2026-10-27T08:00:00', end_datetime: '2026-10-27T18:00:00'
    })).body.data.trip_id;
    const res = await org.as.other.put(`/api/business-trips/${second}`).send({
      start_datetime: '2026-10-23T08:00:00', end_datetime: '2026-10-23T18:00:00'
    });
    expect(res.status).toBe(400);
  });

  test('水印打卡按出差期间每个自然日检查（含周末），缺哪天列哪天', async () => {
    const id = (await trip()).body.data.trip_id;
    await org.as.hr.post(`/api/business-trips/${id}/approve`).send({ decision: 'approved' });
    const shot = (takenAt) => org.as.other.post(`/api/business-trips/${id}/watermark`)
      .send({ object_key: `k/${takenAt}.jpg`, taken_at: takenAt });
    expect((await shot('2026-10-22T09:00:00')).status).toBeLessThan(300);
    expect((await shot('2026-10-22T15:00:00')).status).toBeLessThan(300);
    expect((await shot('2026-10-24T10:00:00')).status).toBeLessThan(300);

    const res = await org.as.other.get(`/api/business-trips/${id}/watermark/audit`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      expected: ['2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'],
      actual: { '2026-10-22': 2, '2026-10-24': 1 },
      missing: ['2026-10-23', '2026-10-25'],
      total_photos: 3
    });
  });

  test('拍摄时间不在出差期间：不能提交', async () => {
    const id = (await trip()).body.data.trip_id;
    await org.as.hr.post(`/api/business-trips/${id}/approve`).send({ decision: 'approved' });
    const res = await org.as.other.post(`/api/business-trips/${id}/watermark`)
      .send({ object_key: 'k/x.jpg', taken_at: '2026-10-26T09:00:00' });
    expect(res.status).toBe(400);
  });

  describe('出差单的报销状态', () => {
    let tripId;
    beforeEach(async () => {
      tripId = (await trip()).body.data.trip_id;
      await org.as.hr.post(`/api/business-trips/${tripId}/approve`).send({ decision: 'approved' });
    });
    const reimburse = (amount, extra = {}) => org.as.other.post('/api/reimbursements').send({
      trip_id: tripId,
      items: [{
        category: 'accommodation', amount, occurred_on: '2026-10-22', description: '酒店', invoice_name: 'fp.pdf'
      }],
      ...extra
    });
    const status = async () => (await BusinessTrip.findByPk(tripId)).reimbursement_status;

    test('提交后为“报销中”，全部撤销后回到“未报销”', async () => {
      const id = (await reimburse(100)).body.data.reimbursement_id;
      expect(await status()).toBe('pending');
      await org.as.other.post(`/api/reimbursements/${id}/cancel`).send({});
      expect(await status()).toBe('not_started');
    });

    test('一张已发放、一张被拒绝：算“已报销”', async () => {
      const paid = (await reimburse(100)).body.data.reimbursement_id;
      const rejected = (await reimburse(100)).body.data.reimbursement_id;
      await org.as.hr.post(`/api/reimbursements/${paid}/approve`).send({ decision: 'approved' });
      await org.as.finance.post(`/api/reimbursements/${paid}/pay`).send({});
      await org.as.hr.post(`/api/reimbursements/${rejected}/approve`).send({ decision: 'rejected' });
      expect(await status()).toBe('reimbursed');
    });

    test('明细的说明和发票文件名会保存', async () => {
      const id = (await reimburse(100)).body.data.reimbursement_id;
      const [item] = await ReimbursementItem.findAll({ where: { reimbursement_id: id }, raw: true });
      expect(item).toMatchObject({ description: '酒店', invoice_name: 'fp.pdf' });
    });

    test('被拒绝的报销单不占当天限额；草稿占', async () => {
      const rejected = (await reimburse(500)).body.data.reimbursement_id;
      await org.as.hr.post(`/api/reimbursements/${rejected}/approve`).send({ decision: 'rejected' });
      expect((await reimburse(500, { submit: false })).status).toBe(201);
      expect((await reimburse(1)).status).toBe(400);
    });

    test('被拒绝后重新提交时，若当天额度已被别的报销单用掉：不能提交', async () => {
      const first = (await reimburse(500)).body.data.reimbursement_id;
      await org.as.hr.post(`/api/reimbursements/${first}/approve`).send({ decision: 'rejected' });
      await reimburse(300);
      const res = await org.as.other.post(`/api/reimbursements/${first}/submit`);
      expect(res.status).toBe(400);
      expect((await Reimbursement.findByPk(first)).status).toBe('rejected');
    });
  });
});

describe('请假审批意见会保存', () => {
  test('HR 批准时填写的意见记录在请假单上', async () => {
    const res = await org.as.other.post('/api/leaves').send({
      leave_type: 'sick', start_date: '2026-11-02', end_date: '2026-11-02', days: 1
    });
    const id = res.body.data.leave_id;
    await org.as.hr.put(`/api/leaves/${id}`).send({ status: 'approved', approval_notes: '注意休息' });
    expect((await Leave.findByPk(id)).approval_notes).toBe('注意休息');
  });
});

describe('数据范围的判断（CLAUDE.md 三级权限）', () => {
  const can = (user, emp) => dataScope.canAccessEmployee(user, emp.employee_id);

  test.each([
    ['超级管理员', { role: 'admin', data_scope: 'self' }, true, true],
    ['范围为全部', { role: 'finance', data_scope: 'all' }, true, true],
    ['部门负责人（本部门）', { role: 'department_manager', data_scope: 'department' }, true, false],
    ['员工角色即使范围写成本部门也只看自己', { role: 'employee', data_scope: 'department' }, true, false],
    ['部门负责人没有部门', { role: 'department_manager', data_scope: 'department', department_id: null }, false, false]
  ])('%s', async (label, extra, staffOk, otherOk) => {
    const user = {
      department_id: org.dept.department_id, employee_id: org.staffEmp.employee_id, ...extra
    };
    expect(await can(user, org.staffEmp)).toBe(staffOk);
    expect(await can(user, org.otherEmp)).toBe(otherOk);
  });

  test('没有用户或没有员工 ID：拒绝', async () => {
    expect(await dataScope.canAccessEmployee(null, org.staffEmp.employee_id)).toBe(false);
    expect(await dataScope.canAccessEmployee({ role: 'admin' }, null)).toBe(false);
  });

  test('列表过滤：部门负责人加部门条件并保留原有搜索条件；员工只看自己；没有范围返回 false', () => {
    const include = { where: { status: 'active' } };
    const where = {};
    expect(dataScope.applyResourceScope(where, include, {
      data_scope: 'department', department_id: 'D1'
    })).toBe(true);
    expect(include).toMatchObject({ where: { status: 'active', department_id: 'D1' }, required: true });

    const own = {};
    expect(dataScope.applyResourceScope(own, {}, { data_scope: 'self', employee_id: 'E1' })).toBe(true);
    expect(own).toEqual({ employee_id: 'E1' });

    expect(dataScope.applyResourceScope({}, {}, { data_scope: 'self' })).toBe(false);
    expect(dataScope.applyResourceScope({}, {}, { role: 'admin', data_scope: 'self' })).toBe(true);
  });

  test('部门负责人看不到其他部门新入职的员工', async () => {
    const newcomer = await createEmployee({ department_id: org.otherDept.department_id });
    const user = {
      role: 'department_manager', data_scope: 'department', department_id: org.dept.department_id
    };
    expect(await can(user, newcomer)).toBe(false);
  });
});

describe('考勤导入的补充规则（手册 8.1、8.3、8.4）', () => {
  // eslint-disable-next-line global-require
  const { buildPunchWorkbook } = require('../helpers/punchWorkbook');
  // eslint-disable-next-line global-require
  const { Attendance } = require('../../models');
  const importDays = (days, exportDate) => org.as.hr.post('/api/attendances/import-card').attach(
    'file',
    buildPunchWorkbook({
      start: '2026-03-02', end: '2026-03-04', exportDate, people: [{ id: '9', name: 'Other Zhao', days }]
    }),
    'p.xlsx'
  );
  const day = (date) => Attendance.findOne({
    where: { employee_id: org.otherEmp.employee_id, date }, raw: true
  });

  test('文件没有制表时间：周期内的日期全部导入', async () => {
    const res = await importDays({ '2026-03-04': ['08:00', '18:00'] }, undefined);
    expect(res.body.data.skipped_dates).toEqual([]);
    expect(await Attendance.count({ where: { employee_id: org.otherEmp.employee_id } })).toBe(3);
  });

  test('只有一次下午的打卡：记为下班卡，缺卡', async () => {
    await importDays({ '2026-03-02': ['19:15'] }, '2026-03-05');
    expect(await day('2026-03-02')).toMatchObject({
      status: 'missing_punch', check_out_time: '19:15:00', check_in_time: null
    });
  });

  test('只有一次上午的打卡：记为上班卡，缺卡', async () => {
    await importDays({ '2026-03-02': ['07:55'] }, '2026-03-05');
    expect(await day('2026-03-02')).toMatchObject({
      status: 'missing_punch', check_in_time: '07:55:00', check_out_time: null
    });
  });

  test('重新导入时仍然没打卡：再次列入旷工提醒', async () => {
    await importDays({}, '2026-03-05');
    const again = await importDays({}, '2026-03-05');
    expect(again.body.data.daily_updated).toBe(3);
    expect(again.body.data.absent_without_leave[0].dates).toEqual(['2026-03-02', '2026-03-03', '2026-03-04']);
  });

  test('只关联了出差单（状态被改过）的记录同样受保护', async () => {
    await importDays({ '2026-03-02': ['08:00', '18:00'] }, '2026-03-05');
    // 模拟状态已被别处改成正常，但仍关联着出差单
    const tripId = (await org.as.other.post('/api/business-trips').send({
      start_datetime: '2026-03-02T09:00:00', end_datetime: '2026-03-02T17:00:00', destination: 'x'
    })).body.data.trip_id;
    await Attendance.update({ business_trip_id: tripId, status: 'normal' }, {
      where: { employee_id: org.otherEmp.employee_id, date: '2026-03-02' }
    });
    await importDays({ '2026-03-02': ['09:30', '18:00'] }, '2026-03-05');
    expect(await day('2026-03-02')).toMatchObject({ status: 'normal', late_minutes: 0, check_in_time: '09:30:00' });
  });
});
