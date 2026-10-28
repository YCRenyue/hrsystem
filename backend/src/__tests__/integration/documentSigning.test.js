/**
 * 制度确认签署（PUT /api/employees/:id/sign-document）
 *
 * 规则来源：HR 使用手册第 14 章（签署由员工本人登录后完成）、4.4 端到端样例、
 * 代码注释中的签署前重新验证登录密码。OSS 是外部服务，这里替换为假实现。
 */
const app = require('../../app');
const { Employee, OperationLog } = require('../../models');
const { ossService } = require('../../services/OSSService');
const { setupTestDb, resetTestDb, closeTestDb } = require('../helpers/testDb');
const { createOrg } = require('../helpers/fixtures');

beforeAll(setupTestDb, 300000);
beforeEach(resetTestDb);
afterAll(closeTestDb);

let org;
beforeEach(async () => {
  org = await createOrg(app);
  jest.spyOn(ossService, 'isConfigured').mockReturnValue(true);
  jest.spyOn(ossService, 'uploadFile').mockResolvedValue({ success: true, objectKey: 'k/sign.png' });
  jest.spyOn(ossService, 'deleteFile').mockResolvedValue({ success: true });
});
afterEach(() => jest.restoreAllMocks());

const sign = (agent, employee, fields = {}) => {
  const req = agent.put(`/api/employees/${employee.employee_id}/sign-document`)
    .field('documentType', fields.documentType || 'policy_ack')
    .field('password', fields.password === undefined ? 'Passw0rd!' : fields.password);
  return fields.noFile ? req : req.attach('screenshot', Buffer.from('png'), 'sign.png');
};

test('员工本人输入登录密码后签署：状态变为已签署，记录时间和文件，写审计日志', async () => {
  const res = await sign(org.as.staff, org.staffEmp);
  expect(res.status).toBe(200);
  const emp = await Employee.findByPk(org.staffEmp.employee_id);
  expect(emp.policy_ack_status).toBeTruthy();
  expect(emp.policy_ack_signed_at).not.toBeNull();
  expect(emp.policy_ack_file_key).toBe('k/sign.png');
  expect(await OperationLog.count({ where: { operation_type: 'sign_document' } })).toBe(1);
});

test('密码错误不能签署，并记录验证失败', async () => {
  const res = await sign(org.as.staff, org.staffEmp, { password: 'wrong' });
  expect(res.status).toBe(400);
  expect((await Employee.findByPk(org.staffEmp.employee_id)).policy_ack_status).toBeFalsy();
  expect(await OperationLog.count({ where: { operation_type: 'sign_verify_failed' } })).toBe(1);
  expect(ossService.uploadFile).not.toHaveBeenCalled();
});

test('已签署的不能重复签', async () => {
  await sign(org.as.staff, org.staffEmp);
  expect((await sign(org.as.staff, org.staffEmp)).status).toBe(400);
});

test('没有签署截图不能签', async () => {
  expect((await sign(org.as.staff, org.staffEmp, { noFile: true })).status).toBe(400);
});

test('截图上传失败时不标记为已签署', async () => {
  ossService.uploadFile.mockResolvedValue({ success: false, error: 'network' });
  expect((await sign(org.as.staff, org.staffEmp)).status).toBe(400);
  expect((await Employee.findByPk(org.staffEmp.employee_id)).policy_ack_status).toBeFalsy();
});

test('无效的文件类型 -> 400', async () => {
  expect((await sign(org.as.staff, org.staffEmp, { documentType: 'nda' })).status).toBe(400);
});

test('员工不能替别人签', async () => {
  const res = await sign(org.as.other, org.staffEmp);
  expect(res.status).toBeGreaterThanOrEqual(400);
  expect((await Employee.findByPk(org.staffEmp.employee_id)).policy_ack_status).toBeFalsy();
});

// 待确认：手册写明“签署由员工本人登录后完成”，但接口允许 HR/admin 用自己的密码替员工签，
// 签署记录会显示该员工已签署。是否允许代签需要 HR 确认。
test.failing('HR 不能替员工签署', async () => {
  const res = await sign(org.as.hr, org.staffEmp);
  expect(res.status).toBe(403);
});
