/**
 * 定时提醒：HR 设好入职日期后，到了那一天系统会不会自动发提醒
 *
 * 规则来源：HR 使用手册 4.3（每天 09:00 给当天入职的员工发填表通知；每天 10:00 入职前 3 天提醒；
 * 每周一 09:00 入职满一周的欢迎消息；每天 09:00 检查 30 天内到期的劳动合同）、
 * CLAUDE.md（统一北京时间）。
 *
 * 做法：只把“当前时间”拨到指定的北京时间（不碰计时器，数据库照常工作），再执行到点时
 * 会被触发的任务；触发时间本身由 rules/schedule.rules.test.js 校验。钉钉和邮件是外部服务，
 * 换成记录调用的假实现。
 */
const app = require('../../app');
const { OnboardingProcess, Notification } = require('../../models');
const scheduler = require('../../services/SchedulerService');
const notificationService = require('../../services/NotificationService');
const { setupTestDb, resetTestDb, closeTestDb } = require('../helpers/testDb');
const { createUser, loginAs, createEmployee } = require('../helpers/fixtures');

beforeAll(setupTestDb, 300000);
beforeEach(resetTestDb);
afterAll(closeTestDb);

const FAKE_ONLY_DATE = {
  doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate',
    'clearImmediate', 'nextTick', 'queueMicrotask', 'hrtime', 'performance']
};
/** 把系统时间拨到北京时间 YYYY-MM-DD HH:mm */
const setBeijingNow = (text) => jest.setSystemTime(new Date(`${text.replace(' ', 'T')}:00+08:00`));

let hrUser;
let sent;
beforeEach(async () => {
  hrUser = await createUser({ role: 'hr_admin' });
  sent = { onboarding: [], preOnboarding: [], welcome: [] };
  jest.spyOn(notificationService, 'sendOnboardingNotification').mockImplementation(
    async (employee, formUrl) => {
      sent.onboarding.push({ name: employee.name, formUrl });
      return { success: true, channel: 'email' };
    }
  );
  jest.spyOn(notificationService, 'sendPreOnboardingReminder').mockImplementation(
    async (employee, days) => { sent.preOnboarding.push({ id: employee.employee_id, days }); }
  );
  jest.spyOn(notificationService, 'sendWelcomeMessage').mockImplementation(
    async (employee) => { sent.welcome.push(employee.employee_id); }
  );
  jest.useFakeTimers(FAKE_ONLY_DATE);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

/** HR 通过真实接口预登记新员工（只填姓名、工号、部门、入职日期） */
async function hrPreRegisters(entryDate, extra = {}) {
  // 在拨好的时间里登录，令牌按这个时间签发（有效期 24 小时）
  const hr = await loginAs(app, hrUser);
  const res = await hr.post('/api/employees').send({
    employee_number: `RH-${Math.floor(Math.random() * 1e6)}`,
    name: '明天入职',
    email: 'newbie@example.com',
    entry_date: entryDate,
    ...extra
  });
  expect(res.status).toBe(201);
  return res.body.data;
}

describe('入职当天 09:00 发填表通知', () => {
  test('今天 HR 设定明天入职：今天不发，明天 09:00 发，链接可以打开登记表', async () => {
    setBeijingNow('2026-11-02 15:00');
    const emp = await hrPreRegisters('2026-11-03');

    // 今天的 09:00 任务（假设今天再跑一次）不会发给明天入职的人
    await scheduler.runDailyOnboardingTask();
    expect(sent.onboarding).toEqual([]);

    // 第二天 09:00
    setBeijingNow('2026-11-03 09:00');
    await scheduler.runDailyOnboardingTask();
    expect(sent.onboarding).toHaveLength(1);
    expect(sent.onboarding[0].name).toBe('明天入职');

    const proc = await OnboardingProcess.findOne({ where: { employee_id: emp.employee_id } });
    expect(proc).not.toBeNull();
    expect(sent.onboarding[0].formUrl).toContain(`/onboarding/${proc.form_token}`);
    jest.useRealTimers();
    const request = require('supertest'); // eslint-disable-line global-require
    const form = await request(app).get(`/api/onboarding/form/${proc.form_token}`);
    expect(form.body.data.employee_info.name).toBe('明天入职');
  });

  test('按北京时间判断“今天”：北京 11-03 00:30（UTC 还是 11-02）也算 11-03', async () => {
    setBeijingNow('2026-11-02 12:00');
    await hrPreRegisters('2026-11-03');
    setBeijingNow('2026-11-03 00:30');
    await scheduler.runDailyOnboardingTask();
    expect(sent.onboarding).toHaveLength(1);
  });

  test('同一天任务跑两次也只建一个入职流程', async () => {
    setBeijingNow('2026-11-02 12:00');
    const emp = await hrPreRegisters('2026-11-03');
    setBeijingNow('2026-11-03 09:00');
    await scheduler.runDailyOnboardingTask();
    await scheduler.runDailyOnboardingTask();
    expect(await OnboardingProcess.count({ where: { employee_id: emp.employee_id } })).toBe(1);
  });

  test('已经在职或信息已填完的员工不再发', async () => {
    setBeijingNow('2026-11-02 12:00');
    await hrPreRegisters('2026-11-03', { status: 'active' });
    setBeijingNow('2026-11-03 09:00');
    await scheduler.runDailyOnboardingTask();
    expect(sent.onboarding).toEqual([]);
  });

  test('发送结果记录在入职流程上', async () => {
    setBeijingNow('2026-11-02 12:00');
    const emp = await hrPreRegisters('2026-11-03');
    setBeijingNow('2026-11-03 09:00');
    await scheduler.runDailyOnboardingTask();
    const proc = await OnboardingProcess.findOne({ where: { employee_id: emp.employee_id } });
    expect(proc.toSafeObject()).toMatchObject({ status: 'sent' });
  });
});

describe('入职前 3 天 10:00 提醒', () => {
  test('11-06 入职：11-03 提醒，11-02 和 11-04 不提醒', async () => {
    setBeijingNow('2026-11-01 12:00');
    const emp = await hrPreRegisters('2026-11-06');
    // eslint-disable-next-line no-restricted-syntax
    for (const day of ['2026-11-02', '2026-11-03', '2026-11-04']) {
      setBeijingNow(`${day} 10:00`);
      // eslint-disable-next-line no-await-in-loop
      await scheduler.runPreOnboardingReminders();
    }
    expect(sent.preOnboarding).toEqual([{ id: emp.employee_id, days: 3 }]);
  });
});

describe('入职满一周的欢迎消息（每周一 09:00）', () => {
  test('上周一入职、已在职：这周一发欢迎消息', async () => {
    const emp = await createEmployee({ entry_date: '2026-11-02', status: 'active' });
    setBeijingNow('2026-11-09 09:00');
    await scheduler.runWelcomeMessages();
    expect(sent.welcome).toEqual([emp.employee_id]);
  });
});

describe('劳动合同 30 天后到期（每天 09:00）', () => {
  test('提醒发给 HR 的站内通知；31 天后到期的不提醒', async () => {
    await createEmployee({ contract_expiry_date: '2026-12-03', status: 'active' });
    await createEmployee({ contract_expiry_date: '2026-12-04', status: 'active' });
    setBeijingNow('2026-11-03 09:00');
    await scheduler.runContractExpiryReminders();
    const hrNotes = await Notification.findAll({ raw: true });
    expect(hrNotes.length).toBeGreaterThan(0);
    expect(hrNotes.every((n) => /合同/.test(n.title + n.content))).toBe(true);
    // 只对 12-03 到期的那一位提醒
    const ids = new Set(hrNotes.map((n) => n.related_id));
    expect(ids.size).toBe(1);
  });
});
