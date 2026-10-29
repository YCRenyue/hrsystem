/**
 * 年假、社保的模板下载 -> 填写 -> 导入，以及社保手工添加的自动计算
 *
 * 规则来源：HR 使用手册第 10 章（剩余 = 应休 + 结转 - 已休；工号不存在的行单独报错不影响其他行；
 * 同一员工同一年度再导一次覆盖）、第 12 章（个人合计、公司合计；基数 8000 样例；年月被 Excel 转成
 * 日期也能导入；同一员工同一年月覆盖）。
 */
const ExcelJS = require('exceljs');
const app = require('../../app');
const { AnnualLeave, SocialSecurity } = require('../../models');
const { setupTestDb, resetTestDb, closeTestDb } = require('../helpers/testDb');
const { createEmployee, createUser, loginAs } = require('../helpers/fixtures');

beforeAll(setupTestDb, 300000);
beforeEach(resetTestDb);
afterAll(closeTestDb);

let hr;
let emp;
beforeEach(async () => {
  emp = await createEmployee({ employee_number: 'RH-0101' });
  hr = await loginAs(app, await createUser({ role: 'hr_admin' }));
});

/** 下载真实模板，删掉示例行，按模板列顺序填入 rows */
async function fillTemplate(url, rows) {
  const res = await hr.get(url).buffer(true).parse((r, cb) => {
    const chunks = [];
    r.on('data', (c) => chunks.push(c));
    r.on('end', () => cb(null, Buffer.concat(chunks)));
  });
  expect(res.status).toBe(200);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(res.body);
  const ws = wb.getWorksheet(1);
  ws.spliceRows(2, ws.rowCount - 1);
  rows.forEach((r) => ws.addRow(r));
  return Buffer.from(await wb.xlsx.writeBuffer());
}
const upload = (url, buffer) => hr.post(url).attach('file', buffer, 'import.xlsx');
const num = (v) => Number(v);

describe('年假导入', () => {
  test('剩余 = 应休 + 结转 - 已休；工号不存在的行单独报错，不影响其他行', async () => {
    const file = await fillTemplate('/api/annual-leave/template', [
      ['RH-0101', 2026, 5, 2, 1, '2026-12-31', ''],
      ['RH-9999', 2026, 5, 0, 0, '2026-12-31', '']
    ]);
    const res = await upload('/api/annual-leave/import', file);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ success_count: 1, error_count: 1 });
    expect(res.body.data.errors[0].row).toBe(3);
    const row = await AnnualLeave.findOne({ where: { employee_id: emp.employee_id }, raw: true });
    expect([row.total_days, row.used_days, row.carry_over_days, row.remaining_days].map(num))
      .toEqual([5, 2, 1, 4]);
  });

  test('同一员工同一年度再导一次覆盖原记录', async () => {
    await upload('/api/annual-leave/import', await fillTemplate('/api/annual-leave/template', [
      ['RH-0101', 2026, 5, 0, 0, '', '']
    ]));
    await upload('/api/annual-leave/import', await fillTemplate('/api/annual-leave/template', [
      ['RH-0101', 2026, 10, 3, 0, '', '']
    ]));
    const rows = await AnnualLeave.findAll({ where: { employee_id: emp.employee_id }, raw: true });
    expect(rows).toHaveLength(1);
    expect(num(rows[0].remaining_days)).toBe(7);
  });
});

describe('社保导入（手册 12 章基数 8000 样例）', () => {
  // 员工编号、年月、社保基数、公积金基数、养老个人/公司、医疗个人/公司、失业个人/公司、
  // 工伤公司、生育公司、公积金个人/公司、缴纳状态、缴纳日期、备注
  const sample = (yearMonth) => ['RH-0101', yearMonth, 8000, 8000, 640, 1280, 160, 560, 40, 40,
    32, 64, 400, 400, '已缴纳', '2026-09-15', ''];

  test('个人合计 = 640 + 160 + 40 + 400 = 1240；公司合计 = 1280 + 560 + 40 + 32 + 64 + 400 = 2376', async () => {
    const res = await upload(
      '/api/social-security/import',
      await fillTemplate('/api/social-security/template', [sample('2026-09')])
    );
    expect(res.body.data).toMatchObject({ success_count: 1, error_count: 0 });
    const row = await SocialSecurity.findOne({ where: { employee_id: emp.employee_id }, raw: true });
    expect(num(row.total_personal)).toBe(1240);
    expect(num(row.total_company)).toBe(2376);
    expect(row).toMatchObject({ year_month: '2026-09', payment_status: 'paid' });
  });

  test('年月被 Excel 转成日期单元格时还原为 YYYY-MM', async () => {
    const res = await upload(
      '/api/social-security/import',
      await fillTemplate('/api/social-security/template', [sample(new Date(2026, 8, 1))])
    );
    expect(res.body.data.success_count).toBe(1);
    const row = await SocialSecurity.findOne({ where: { employee_id: emp.employee_id }, raw: true });
    expect(row.year_month).toBe('2026-09');
  });

  test('同一员工同一年月再导一次覆盖', async () => {
    const tpl = '/api/social-security/template';
    await upload('/api/social-security/import', await fillTemplate(tpl, [sample('2026-09')]));
    const changed = sample('2026-09');
    changed[12] = 500;
    await upload('/api/social-security/import', await fillTemplate(tpl, [changed]));
    const rows = await SocialSecurity.findAll({ where: { employee_id: emp.employee_id }, raw: true });
    expect(rows).toHaveLength(1);
    expect(num(rows[0].total_personal)).toBe(1340);
  });
});

describe('社保手工添加：按基数自动计算', () => {
  test('各项金额按配置比例计算，合计等于各项之和', async () => {
    const res = await hr.post('/api/social-security').send({
      employee_id: emp.employee_id,
      year_month: '2026-10',
      social_security_base: 8000,
      housing_fund_base: 8000,
      payment_status: 'pending'
    });
    expect(res.status).toBe(201);
    const r = await SocialSecurity.findOne({ where: { employee_id: emp.employee_id }, raw: true });
    const p = ['pension_personal', 'medical_personal', 'unemployment_personal', 'housing_fund_personal']
      .reduce((s, k) => s + num(r[k]), 0);
    const c = ['pension_company', 'medical_company', 'unemployment_company', 'injury_company',
      'maternity_company', 'housing_fund_company'].reduce((s, k) => s + num(r[k]), 0);
    expect(num(r.total_personal)).toBeCloseTo(p, 2);
    expect(num(r.total_company)).toBeCloseTo(c, 2);
    // 与手册样例一致的几项：养老 8%/16%、医疗个人 2%、失业 0.5%、工伤 0.4%、生育 0.8%
    expect([r.pension_personal, r.pension_company, r.medical_personal, r.unemployment_personal,
      r.injury_company, r.maternity_company].map(num)).toEqual([640, 1280, 160, 40, 32, 64]);
  });

  // 待确认：手册样例（HR 实际导入的数据）医疗公司 7%、公积金 5%，系统默认比例是医疗公司 10%、
  // 公积金 7%，手工添加时按默认比例算出的公司合计是 2776，不是样例的 2376。生产环境没有配置
  // SOCIAL_RATE_* / HOUSING_FUND_RATE_* 时就会按默认值计算。
  test.failing('手工添加基数 8000 时与手册样例一致：个人 1240、公司 2376', async () => {
    await hr.post('/api/social-security').send({
      employee_id: emp.employee_id,
      year_month: '2026-10',
      social_security_base: 8000,
      housing_fund_base: 8000
    });
    const r = await SocialSecurity.findOne({ where: { employee_id: emp.employee_id }, raw: true });
    expect([num(r.total_personal), num(r.total_company)]).toEqual([1240, 2376]);
  });

  test('同一员工同一年月不能重复添加', async () => {
    const body = { employee_id: emp.employee_id, year_month: '2026-10', social_security_base: 5000 };
    await hr.post('/api/social-security').send(body);
    expect((await hr.post('/api/social-security').send(body)).status).toBe(400);
  });
});
