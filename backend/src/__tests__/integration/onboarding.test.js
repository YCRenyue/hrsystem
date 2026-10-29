/**
 * 员工自助填写入职登记表（/api/onboarding/form/:token）
 *
 * 规则来源：CLAUDE.md“入职自动化流程”（令牌链接、员工补全个人信息、与 HR 预登记合并、状态完成）、
 * HR 使用手册 4.3、requirement.md 2.3.2（邮箱选填，很多员工没有邮箱）。
 */
const request = require('supertest');
const app = require('../../app');
const { OnboardingProcess, Employee } = require('../../models');
const { setupTestDb, resetTestDb, closeTestDb } = require('../helpers/testDb');
const { createEmployee, createDepartment } = require('../helpers/fixtures');

beforeAll(setupTestDb, 300000);
beforeEach(resetTestDb);
afterAll(closeTestDb);

let emp;
let proc;
let dept;
beforeEach(async () => {
  dept = await createDepartment({ name: '质检部' });
  emp = await createEmployee({
    name: '新员工', status: 'pending', department_id: dept.department_id, position: '检验员'
  });
  proc = OnboardingProcess.build({ employee_id: emp.employee_id, status: 'pending' });
  proc.generateFormToken();
  await proc.save();
});

const form = (token = proc.form_token) => `/api/onboarding/form/${token}`;
const valid = {
  phone: '13900001111',
  email: 'new.staff@example.com',
  id_card: '110101199001011234',
  birth_date: '1990-01-01',
  gender: 'male',
  address: '虚构地址 1 号',
  emergency_contact: '联系人',
  emergency_phone: '13900002222'
};

test('不用登录就能打开填表链接，看到 HR 预登记的姓名、工号和岗位', async () => {
  const res = await request(app).get(form());
  expect(res.status).toBe(200);
  expect(res.body.data.employee_info).toMatchObject({
    name: '新员工', employee_number: emp.employee_number, position: '检验员'
  });
});

test('错误的令牌 -> 404', async () => {
  expect((await request(app).get(form('no-such-token'))).status).toBe(404);
  expect((await request(app).post(form('no-such-token')).send(valid)).status).toBe(404);
});

test('提交后：个人信息加密保存并与预登记合并，员工转为在职，流程完成', async () => {
  const res = await request(app).post(form()).send(valid);
  expect(res.status).toBe(200);
  const saved = await Employee.findByPk(emp.employee_id);
  expect(saved.getPhone()).toBe('13900001111');
  expect(saved.getIdCard()).toBe('110101199001011234');
  expect(saved.status).toBe('active');
  // HR 预登记的部门、岗位、工号不变
  expect(saved).toMatchObject({
    department_id: dept.department_id, position: '检验员', employee_number: emp.employee_number
  });
  expect((await OnboardingProcess.findByPk(proc.process_id)).status).toBe('completed');
});

test('员工不能通过登记表改部门、岗位或工号', async () => {
  await request(app).post(form()).send({
    ...valid, department_id: null, position: '经理', employee_number: 'HACK-1'
  });
  const saved = await Employee.findByPk(emp.employee_id);
  expect(saved).toMatchObject({
    department_id: dept.department_id, position: '检验员', employee_number: emp.employee_number
  });
});

test('已经提交过的不能再提交', async () => {
  await request(app).post(form()).send(valid);
  const again = await request(app).post(form()).send({ ...valid, phone: '13000000000' });
  expect(again.status).toBe(400);
  expect((await Employee.findByPk(emp.employee_id)).getPhone()).toBe('13900001111');
});

test('过期的链接不能提交，流程标为已过期', async () => {
  await proc.update({ token_expires_at: new Date(Date.now() - 1000) });
  const res = await request(app).post(form()).send(valid);
  expect(res.status).toBe(400);
  expect((await OnboardingProcess.findByPk(proc.process_id)).status).toBe('expired');
});

test('电话、身份证号必填', async () => {
  expect((await request(app).post(form()).send({ ...valid, phone: '' })).status).toBe(400);
  expect((await request(app).post(form()).send({ ...valid, id_card: '' })).status).toBe(400);
});

// 回归（测试发现并已修复）：2026-10-23 起邮箱改为选填（很多员工没有邮箱），但入职登记表仍把邮箱当必填，
// 没有邮箱的新员工无法提交登记表。
test('没有邮箱的新员工也能提交登记表', async () => {
  const res = await request(app).post(form()).send({ ...valid, email: '' });
  expect(res.status).toBe(200);
});

test('HR 手动发送登记表需要登录且是 HR/admin', async () => {
  const res = await request(app).post(`/api/onboarding/send/${emp.employee_id}`);
  expect(res.status).toBe(401);
});
