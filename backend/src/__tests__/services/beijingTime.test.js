/**
 * 北京时间约定测试
 *
 * 后端进程运行在 TZ=Asia/Shanghai（测试由 jest.setup.js 设置）：
 * - 取日期按北京时间，北京时间 0 点至 8 点不会差一天
 * - 前端提交的无时区时间按北京时间理解，出差按北京时间自然日切分
 */

const { formatLocalDate, formatLocalDateTime } = require('../../utils/dateUtils');
const { calculateDurations } = require('../../services/BusinessTripService');

describe('dateUtils', () => {
  test('北京时间凌晨的日期不会退回前一天', () => {
    // 2026-10-21 00:30 北京时间 = 2026-10-20 16:30 UTC
    const instant = new Date('2026-10-20T16:30:00Z');
    expect(formatLocalDate(instant)).toBe('2026-10-21');
    expect(formatLocalDateTime(instant)).toBe('2026-10-21 00:30');
  });

  test('签署时间按北京时间输出（带秒）', () => {
    // 2026-10-23 11:05:01 北京时间 = 2026-10-23 03:05:01 UTC
    const signedAt = new Date('2026-10-23T03:05:01Z');
    expect(formatLocalDateTime(signedAt, { withSeconds: true })).toBe('2026-10-23 11:05:01');
  });
});

describe('business trip times', () => {
  test('无时区的 09:00 按北京时间理解', () => {
    const start = new Date('2026-10-23T09:00:00');
    expect(start.toISOString()).toBe('2026-10-23T01:00:00.000Z');
    expect(formatLocalDateTime(start)).toBe('2026-10-23 09:00');
  });

  test('09:00 至 17:30 计 8 工时', () => {
    const result = calculateDurations('2026-10-23T09:00:00', '2026-10-23T17:30:00');
    expect(result.duration_hours).toBe(8.5);
    expect(result.work_hours).toBe(8);
  });

  test('跨天出差按北京时间自然日切分', () => {
    // 周四 20:00 至周五 04:00：两个自然日各 4 小时
    const result = calculateDurations('2026-10-22T20:00:00', '2026-10-23T04:00:00');
    expect(result.duration_hours).toBe(8);
    expect(result.work_hours).toBe(8);
  });
});
