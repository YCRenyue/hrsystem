/**
 * 登录、改密、员工档案、敏感数据脱敏、办理离职
 *
 * 规则来源：docs/test-cases/01-auth-and-account.md（AUTH-04 至 AUTH-09）、HR 使用手册第 5 章
 * （首次登录强制改密、连续输错 5 次锁 30 分钟）、7.5 办理离职、CLAUDE.md（敏感数据加密、
 * 按权限脱敏如 138****8888、员工不删除只办理离职、JWT）、requirement.md 2.3.2（离职：记录离职日期、
 * 停用账号、结算年假；删除 DELETE /api/employees/:id）。
 */
const request = require('supertest');
const app = require('../../app');
const {
  User, Employee, AnnualLeave, OperationLog
} = require('../../models');
const { sequelize } = require('../../models');
const { setupTestDb, resetTestDb, closeTestDb } = require('../helpers/testDb');
const {
  createOrg, createUser, createEmployee, loginAs
} = require('../helpers/fixtures');

beforeAll(setupTestDb, 300000);
beforeEach(resetTestDb);
afterAll(closeTestDb);

const login = (username, password) => request(app).post('/api/auth/login')
  .send({ username, password });

describe('登录（AUTH-04 至 AUTH-09）', () => {
  let user;
  beforeEach(async () => {
    user = await createUser({ role: 'employee' });
  });

  test('用户名或密码为空 -> 400', async () => {
    expect((await login(user.username, '')).status).toBe(400);
    expect((await login('', 'x')).status).toBe(400);
  });

  test('不存在的用户名与密码错误返回同样的 401 提示，不暴露用户是否存在', async () => {
    const a = await login('nobody', 'Passw0rd!');
    const b = await login(user.username, 'wrong');
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.message).toBe(b.body.message);
  });

  test('登录成功返回令牌和用户，不含密码哈希', async () => {
    const res = await login(user.username, 'Passw0rd!');
    expect(res.status).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(JSON.stringify(res.body)).not.toContain('password_hash');
  });

  test('连续输错 5 次锁定，锁定期间正确密码也登录不了', async () => {
    for (let i = 0; i < 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await login(user.username, 'wrong');
    }
    const res = await login(user.username, 'Passw0rd!');
    expect(res.status).toBe(401);
    expect(res.body.message).toContain('锁定');
    const locked = await User.findByPk(user.user_id);
    const minutes = (new Date(locked.locked_until) - Date.now()) / 60000;
    expect(minutes).toBeGreaterThan(29);
    expect(minutes).toBeLessThanOrEqual(30);
  });

  test('输错 4 次后登录成功，失败次数清零', async () => {
    for (let i = 0; i < 4; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await login(user.username, 'wrong');
    }
    expect((await login(user.username, 'Passw0rd!')).status).toBe(200);
    expect((await User.findByPk(user.user_id)).login_attempts).toBe(0);
  });

  test('锁定 30 分钟到期后可以再登录', async () => {
    await user.update({
      status: 'locked', login_attempts: 5, locked_until: new Date(Date.now() - 1000)
    });
    expect((await login(user.username, 'Passw0rd!')).status).toBe(200);
  });

  test('未带令牌 -> 401', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
  });

  // AUTH-08 曾记录为“状态码不规范”（返回 403），已修复为 401
  test('伪造令牌 -> 401', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer abc.def.ghi');
    expect(res.status).toBe(401);
  });

  test('账号被停用后，已签发的令牌立即失效', async () => {
    const agent = await loginAs(app, user);
    await user.update({ is_active: false });
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });
});

describe('首次登录强制改密（手册第 5 章）', () => {
  let user;
  let agent;
  beforeEach(async () => {
    user = await createUser({ role: 'hr_admin', must_change_password: true });
    agent = await loginAs(app, user);
  });

  test('改密前除了改密、查看自己、退出，其他接口都返回 403 PASSWORD_CHANGE_REQUIRED', async () => {
    const res = await agent.get('/api/employees');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PASSWORD_CHANGE_REQUIRED');
    expect((await agent.get('/api/auth/me')).status).toBe(200);
  });

  test.each([
    ['少于 8 位', 'Ab1'],
    ['没有大写', 'abcdefg1'],
    ['没有小写', 'ABCDEFG1'],
    ['没有数字', 'Abcdefgh']
  ])('新密码%s -> 400', async (label, pwd) => {
    const res = await agent.post('/api/users/change-password')
      .send({ currentPassword: 'Passw0rd!', newPassword: pwd });
    expect(res.status).toBe(400);
  });

  test('新密码不能与当前密码相同', async () => {
    const res = await agent.post('/api/users/change-password')
      .send({ currentPassword: 'Passw0rd!', newPassword: 'Passw0rd!' });
    expect(res.status).toBe(400);
  });

  test('当前密码错误 -> 401', async () => {
    const res = await agent.post('/api/users/change-password')
      .send({ currentPassword: 'nope', newPassword: 'NewPassw0rd' });
    expect(res.status).toBe(401);
  });

  test('改密成功后可以正常使用，旧密码不能再登录，并写审计日志', async () => {
    const res = await agent.post('/api/users/change-password')
      .send({ currentPassword: 'Passw0rd!', newPassword: 'NewPassw0rd' });
    expect(res.status).toBe(200);
    expect((await agent.get('/api/employees')).status).toBe(200);
    expect((await login(user.username, 'Passw0rd!')).status).toBe(401);
    expect((await login(user.username, 'NewPassw0rd')).status).toBe(200);
    expect(await OperationLog.count({ where: { operation_type: 'password_change' } })).toBe(1);
  });
});

describe('员工档案', () => {
  let org;
  beforeEach(async () => {
    org = await createOrg(app);
  });

  test('HR 新建员工：同时建登录账号，用户名=工号，必须改密，敏感字段加密存储', async () => {
    const res = await org.as.hr.post('/api/employees').send({
      employee_number: 'RH-9001',
      name: '虚构员工',
      phone: '13812348888',
      id_card: '110101199001011234',
      department_id: org.dept.department_id,
      entry_date: '2026-10-01'
    });
    expect(res.status).toBe(201);
    const account = await User.scope('withPassword').findOne({ where: { username: 'RH-9001' } });
    expect(account).toMatchObject({ role: 'employee', data_scope: 'self', must_change_password: true });
    const [[row]] = await sequelize.query(
      'SELECT CAST(phone_encrypted AS CHAR) p, CAST(id_card_encrypted AS CHAR) c FROM employees '
      + 'WHERE employee_number = \'RH-9001\''
    );
    expect(row.p).not.toContain('13812348888');
    expect(row.c).not.toContain('110101199001011234');
  });

  test('工号重复 -> 400，且不会多建账号', async () => {
    const body = { employee_number: 'RH-9002', name: '甲' };
    await org.as.hr.post('/api/employees').send(body);
    expect((await org.as.hr.post('/api/employees').send(body)).status).toBe(400);
    expect(await User.count({ where: { username: 'RH-9002' } })).toBe(1);
  });

  test('邮箱选填（2026-10-23）：不填也能建', async () => {
    expect((await org.as.hr.post('/api/employees')
      .send({ employee_number: 'RH-9003', name: '乙' })).status).toBe(201);
  });

  // 回归（测试发现并已修复）：邮箱格式错误时 Sequelize 校验异常没有转成 400，接口返回 500“服务器发生错误”
  test('邮箱格式错误 -> 400 并说明原因', async () => {
    expect((await org.as.hr.post('/api/employees')
      .send({ employee_number: 'RH-9004', name: '丙', email: 'not-an-email' })).status).toBe(400);
  });

  test('员工、部门负责人不能新建员工', async () => {
    const body = { employee_number: 'RH-9005', name: '丁' };
    expect((await org.as.staff.post('/api/employees').send(body)).status).toBe(403);
    expect((await org.as.manager.post('/api/employees').send(body)).status).toBe(403);
  });

  describe('查看范围与脱敏', () => {
    beforeEach(async () => {
      org.staffEmp.setPhone('13812348888');
      await org.staffEmp.save();
    });

    test('员工看自己：完整手机号', async () => {
      const res = await org.as.staff.get(`/api/employees/${org.staffEmp.employee_id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.phone).toBe('13812348888');
    });

    test('HR 看员工：完整手机号', async () => {
      const res = await org.as.hr.get(`/api/employees/${org.staffEmp.employee_id}`);
      expect(res.body.data.phone).toBe('13812348888');
    });

    test('部门负责人看本部门员工：手机号脱敏为 138****8888', async () => {
      const res = await org.as.manager.get(`/api/employees/${org.staffEmp.employee_id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.phone).toBe('138****8888');
    });

    test('员工看别人、部门负责人看其他部门 -> 403', async () => {
      expect((await org.as.staff.get(`/api/employees/${org.otherEmp.employee_id}`)).status)
        .toBe(403);
      expect((await org.as.manager.get(`/api/employees/${org.otherEmp.employee_id}`)).status)
        .toBe(403);
    });

    test('员工列表：员工只看到自己', async () => {
      const res = await org.as.staff.get('/api/employees');
      const rows = res.body.data.items;
      expect(rows.map((e) => e.employee_id)).toEqual([org.staffEmp.employee_id]);
    });

    test('按姓名搜索（姓名是密文，需要解密匹配）', async () => {
      const res = await org.as.hr.get(`/api/employees?keyword=${encodeURIComponent('Staff')}`);
      const rows = res.body.data.items;
      expect(rows.map((e) => e.employee_id)).toEqual([org.staffEmp.employee_id]);
    });
  });

  describe('办理离职（员工不删除）', () => {
    test('没有删除员工的接口', async () => {
      const res = await org.as.admin.delete(`/api/employees/${org.staffEmp.employee_id}`);
      expect(res.status).toBe(404);
      expect(await Employee.findByPk(org.staffEmp.employee_id)).not.toBeNull();
    });

    test('普通编辑不能把状态改成离职，必须走办理离职', async () => {
      const res = await org.as.hr.put(`/api/employees/${org.staffEmp.employee_id}`)
        .send({ status: 'inactive' });
      expect(res.status).toBe(400);
    });

    test('办理离职：记录离职日期、停用账号（不能再登录）、当年未休年假清零', async () => {
      await AnnualLeave.create({
        employee_id: org.staffEmp.employee_id,
        year: 2026,
        total_days: 5,
        used_days: 2,
        carry_over_days: 1,
        remaining_days: 4
      });
      const res = await org.as.hr.post(`/api/employees/${org.staffEmp.employee_id}/offboard`)
        .send({ leave_date: '2026-10-31' });
      expect(res.status).toBe(200);
      const emp = await Employee.findByPk(org.staffEmp.employee_id);
      expect(emp.status).toBe('inactive');
      expect(String(emp.leave_date)).toBe('2026-10-31');
      expect((await login(org.users.staff.username, 'Passw0rd!')).status).toBe(401);
      expect((await org.as.staff.get('/api/auth/me')).status).toBe(401);
      const balance = await AnnualLeave.findOne({
        where: { employee_id: org.staffEmp.employee_id, year: 2026 }
      });
      expect(Number(balance.remaining_days)).toBe(0);
      expect(Number(balance.used_days)).toBe(2);
    });

    test('已离职的不能重复办理', async () => {
      const url = `/api/employees/${org.staffEmp.employee_id}/offboard`;
      await org.as.hr.post(url).send({ leave_date: '2026-10-31' });
      expect((await org.as.hr.post(url).send({ leave_date: '2026-11-30' })).status).toBe(400);
    });

    test('只有 HR/admin 能办理离职', async () => {
      const url = `/api/employees/${org.staffEmp.employee_id}/offboard`;
      expect((await org.as.manager.post(url).send({ leave_date: '2026-10-31' })).status).toBe(403);
    });
  });
});

describe('超级管理员才能管理账号', () => {
  test('HR 不能查看用户列表、改角色、重置密码', async () => {
    const hr = await loginAs(app, await createUser({ role: 'hr_admin' }));
    const target = await createUser({ role: 'employee', employee: await createEmployee() });
    expect((await hr.get('/api/users')).status).toBe(403);
    expect((await hr.put(`/api/users/${target.user_id}/role`).send({ role: 'admin' })).status)
      .toBe(403);
    expect((await hr.post(`/api/users/${target.user_id}/reset-password`).send({})).status)
      .toBe(403);
  });

  test('员工不能通过改个人资料提升自己的角色', async () => {
    const user = await createUser({ role: 'employee', employee: await createEmployee() });
    const agent = await loginAs(app, user);
    await agent.put('/api/users/profile').send({ role: 'admin', data_scope: 'all' });
    const after = await User.findByPk(user.user_id);
    expect(after.role).toBe('employee');
    expect(after.data_scope).toBe('self');
  });
});
