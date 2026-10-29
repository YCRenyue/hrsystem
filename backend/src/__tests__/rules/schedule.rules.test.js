/**
 * 定时任务的执行时间（HR 使用手册 4.3“系统每天自动执行的提醒”；CLAUDE.md：所有 cron 用北京时间）
 */
jest.mock('node-cron', () => ({ schedule: jest.fn(() => ({ stop: jest.fn() })) }));

const cron = require('node-cron');
const scheduler = require('../../services/SchedulerService');

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  scheduler.start();
});

afterAll(() => scheduler.stop && scheduler.stop());

const jobs = () => cron.schedule.mock.calls.map(([expr, fn, options]) => ({ expr, fn, options }));
const triggers = (expr, method) => {
  // 同一时刻可能有多个任务；全部换成假实现，避免真的去查数据库
  const runMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(scheduler))
    .filter((name) => name.startsWith('run'));
  const spies = Object.fromEntries(runMethods.map((name) => [
    name, jest.spyOn(scheduler, name).mockResolvedValue()
  ]));
  jobs().filter((j) => j.expr === expr).forEach((j) => j.fn());
  const called = spies[method].mock.calls.length > 0;
  Object.values(spies).forEach((spy) => spy.mockRestore());
  return called;
};

test('所有定时任务都按北京时间执行', () => {
  expect(jobs().length).toBeGreaterThan(0);
  jobs().forEach((j) => expect(j.options).toMatchObject({ timezone: 'Asia/Shanghai' }));
});

test.each([
  ['每天 09:00 检查当天入职并发送填表通知', '0 9 * * *', 'runDailyOnboardingTask'],
  ['每天 09:00 检查 30 天内到期的劳动合同', '0 9 * * *', 'runContractExpiryReminders'],
  ['每天 10:00 入职前 3 天提醒', '0 10 * * *', 'runPreOnboardingReminders'],
  ['每天 08:00 培训提醒', '0 8 * * *', 'runTrainingReminders'],
  ['每周一 09:00 入职满一周的欢迎消息', '0 9 * * 1', 'runWelcomeMessages']
])('%s', (label, expr, method) => {
  expect(triggers(expr, method)).toBe(true);
});
