/**
 * 部门、通知中心、综合报表、系统概览、用户管理
 *
 * 规则来源：HR 使用手册第 6 章（部门编码不能重复）、14 章（通知中心、用户管理可编辑角色）、
 * docs/test-cases/03、10、11、12，requirement.md 2.3.2（综合报表三个接口、系统概览“待审批请假”
 * 统计全部待审批）。
 */
const app = require('../../app');
const { Department, Leave, Notification } = require('../../models');
const { setupTestDb, resetTestDb, closeTestDb } = require('../helpers/testDb');
const {
  createOrg, createUser, createEmployee, loginAs
} = require('../helpers/fixtures');

beforeAll(setupTestDb, 300000);
beforeEach(resetTestDb);
afterAll(closeTestDb);

let org;
beforeEach(async () => {
  org = await createOrg(app);
});

describe('部门管理（DEPT）', () => {
  test('HR 新建部门；编码重复被拒绝', async () => {
    const body = { name: '测试部门QA', code: 'QA_TEST' };
    expect((await org.as.hr.post('/api/departments').send(body)).status).toBe(201);
    const dup = await org.as.hr.post('/api/departments').send({ name: '另一个', code: 'QA_TEST' });
    expect(dup.status).toBe(400);
    expect(await Department.count({ where: { code: 'QA_TEST' } })).toBe(1);
  });

  test('名称和编码必填', async () => {
    expect((await org.as.hr.post('/api/departments').send({ name: '只有名称' })).status).toBe(400);
  });

  test('员工、部门负责人不能新建部门；只有 admin 能删除', async () => {
    expect((await org.as.staff.post('/api/departments').send({ name: 'x', code: 'X1' })).status)
      .toBe(403);
    expect((await org.as.hr.delete(`/api/departments/${org.dept.department_id}`)).status)
      .toBe(403);
  });

  test('列表带各部门人数', async () => {
    const res = await org.as.hr.get('/api/departments');
    expect(res.status).toBe(200);
    const list = res.body.data.departments || res.body.data.items || res.body.data;
    const sales = list.find((d) => d.department_id === org.dept.department_id);
    expect(Number(sales.employee_count)).toBe(2);
  });
});

describe('通知中心（NOTIFY）', () => {
  beforeEach(async () => {
    // staff 提交请假会通知部门负责人、HR、admin
    await org.as.staff.post('/api/leaves').send({
      leave_type: 'personal', start_date: '2026-11-02', end_date: '2026-11-02', days: 1
    });
    await org.as.other.post('/api/leaves').send({
      leave_type: 'sick', start_date: '2026-11-03', end_date: '2026-11-03', days: 1
    });
  });

  test('未读数只算自己的通知', async () => {
    const hr = (await org.as.hr.get('/api/notifications/unread-count')).body.data;
    const manager = (await org.as.manager.get('/api/notifications/unread-count')).body.data;
    const staff = (await org.as.staff.get('/api/notifications/unread-count')).body.data;
    const count = (v) => (typeof v === 'object' ? v.count ?? v.unread_count ?? v.unread : v);
    expect(count(hr)).toBe(2);
    expect(count(manager)).toBe(1);
    expect(count(staff)).toBe(0);
  });

  test('全部已读后未读数清零（NOTIFY 全部已读）', async () => {
    expect((await org.as.hr.post('/api/notifications/read-all')).status).toBe(200);
    expect(await Notification.count({
      where: { recipient_user_id: org.users.hr.user_id, is_read: false }
    })).toBe(0);
    // 其他人的通知不受影响
    expect(await Notification.count({
      where: { recipient_user_id: org.users.admin.user_id, is_read: false }
    })).toBe(2);
  });

  test('不能把别人的通知标为已读', async () => {
    const adminNote = await Notification.findOne({
      where: { recipient_user_id: org.users.admin.user_id }
    });
    await org.as.hr.post(`/api/notifications/${adminNote.notification_id}/read`);
    await adminNote.reload();
    expect(adminNote.is_read).toBe(false);
  });

  test('通知内容里的请假类型显示中文', async () => {
    const note = await Notification.findOne({
      where: { recipient_user_id: org.users.manager.user_id }, raw: true
    });
    expect(note.content).toContain('事假');
    expect(note.content).not.toContain('personal');
  });
});

describe('系统概览', () => {
  test('“待审批请假”统计全部待审批，包括补请以前月份的', async () => {
    await Leave.bulkCreate([
      {
        employee_id: org.staffEmp.employee_id,
        leave_type: 'sick',
        start_date: '2025-01-06',
        end_date: '2025-01-06',
        days: 1,
        status: 'pending'
      },
      {
        employee_id: org.otherEmp.employee_id,
        leave_type: 'sick',
        start_date: '2027-03-01',
        end_date: '2027-03-01',
        days: 1,
        status: 'pending'
      },
      {
        employee_id: org.otherEmp.employee_id,
        leave_type: 'sick',
        start_date: '2025-02-03',
        end_date: '2025-02-03',
        days: 1,
        status: 'approved'
      }
    ]);
    const res = await org.as.hr.get('/api/dashboard/stats');
    expect(res.status).toBe(200);
    expect(res.body.data.pendingLeaves).toBe(2);
  });

  test('在职人数只算在职员工', async () => {
    await createEmployee({ status: 'inactive', leave_date: '2026-01-31' });
    await createEmployee({ status: 'pending' });
    const res = await org.as.hr.get('/api/dashboard/stats');
    expect(res.body.data.totalEmployees).toBe(4);
  });
});

describe('综合报表权限', () => {
  test('员工不能看综合报表', async () => {
    expect((await org.as.staff.get('/api/reports/leaves')).status).toBe(403);
  });

  test('超级管理员可以看三个报表', async () => {
    const admin = await loginAs(app, await createUser({ role: 'admin', permissions: ['*'] }));
    // eslint-disable-next-line no-restricted-syntax
    for (const url of ['/api/reports/leaves', '/api/reports/attendance',
      '/api/reports/onboarding-offboarding']) {
      // eslint-disable-next-line no-await-in-loop
      expect((await admin.get(url)).status).toBe(200);
    }
  });

  // 回归（测试发现并已修复）：报表接口按 users.permissions 校验 reports.view_all，但通过“用户管理”把账号改成
  // HR 管理员时只改了 role，permissions 仍为空，HR 打开综合报表一律 403。只有种子管理员
  // 带有 '*'。手册第 4 章每月例行工作要求 HR 查看综合报表。
  test('通过用户管理设为 HR 管理员的账号可以看综合报表', async () => {
    const emp = await createEmployee();
    const account = await createUser({ role: 'employee', employee: emp });
    const superAdmin = await loginAs(app, await createUser({ role: 'admin', permissions: ['*'] }));
    const res = await superAdmin.put(`/api/users/${account.user_id}/role`)
      .send({ role: 'hr_admin', data_scope: 'all' });
    expect(res.status).toBe(200);
    const hr = await loginAs(app, account);
    expect((await hr.get('/api/reports/leaves')).status).toBe(200);
    // 前端按权限显示导入、导出按钮：登录后拿到的权限要包含 HR 的默认权限
    const me = (await hr.get('/api/auth/me')).body.data;
    expect(me.permissions).toEqual(expect.arrayContaining([
      'employees.import', 'employees.export', 'reports.view_all'
    ]));
  });

  test('普通员工的默认权限里没有导入导出', async () => {
    const me = (await org.as.staff.get('/api/auth/me')).body.data;
    expect(me.permissions).not.toContain('employees.import');
    expect(me.permissions).not.toContain('employees.export');
  });
});

describe('用户管理（超级管理员）', () => {
  let superAdmin;
  beforeEach(async () => {
    superAdmin = await loginAs(app, await createUser({ role: 'admin', permissions: ['*'] }));
  });

  test('不能修改自己的角色', async () => {
    const me = (await superAdmin.get('/api/auth/me')).body.data;
    const res = await superAdmin.put(`/api/users/${me.user_id}/role`).send({ role: 'employee' });
    expect(res.status).toBe(403);
  });

  test('无效角色、无效数据范围 -> 400', async () => {
    const id = org.users.staff.user_id;
    expect((await superAdmin.put(`/api/users/${id}/role`).send({ role: 'boss' })).status).toBe(400);
    expect((await superAdmin.put(`/api/users/${id}/role`).send({ data_scope: 'world' })).status)
      .toBe(400);
  });

  test('设为财务时数据范围默认全部（财务要看所有报销单）', async () => {
    const id = org.users.staff.user_id;
    await superAdmin.put(`/api/users/${id}/role`).send({ role: 'finance' });
    const res = await superAdmin.get(`/api/users/${id}`);
    const user = res.body.data.user || res.body.data;
    expect(user).toMatchObject({ role: 'finance', data_scope: 'all' });
  });

  test('重置密码后该用户下次登录必须改密', async () => {
    const id = org.users.other.user_id;
    const res = await superAdmin.post(`/api/users/${id}/reset-password`).send({});
    expect(res.status).toBe(200);
    const { User } = require('../../models'); // eslint-disable-line global-require
    expect((await User.findByPk(id)).must_change_password).toBe(true);
  });
});
