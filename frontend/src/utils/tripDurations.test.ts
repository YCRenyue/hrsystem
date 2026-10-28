/**
 * 出差时长预估：预期值来自 HR 使用手册 13.2 的样例，与后端测试同一组数据，
 * 保证前端表单里看到的数字和服务端最终保存的一致。
 */
import dayjs from "dayjs";
import { calculateTripDurations } from "./tripDurations";

const t = (s: string) => dayjs(s);

describe("calculateTripDurations", () => {
  test("10-23（周五）09:00 至 17:30：总时长 8.5，计入工时 8.0，跨越天数 0.35", () => {
    expect(calculateTripDurations(t("2026-10-23T09:00"), t("2026-10-23T17:30"))).toEqual({
      duration_hours: 8.5,
      work_hours: 8,
      span_days: 0.35,
    });
  });

  test("周四 14:00 出发、周六 12:00 返回：周四封顶 8、周五 8、周六不计 = 16", () => {
    const r = calculateTripDurations(t("2026-10-22T14:00"), t("2026-10-24T12:00"));
    expect(r?.work_hours).toBe(16);
    expect(r?.duration_hours).toBe(46);
  });

  test("整天出差跨越天数为 1", () => {
    const r = calculateTripDurations(t("2026-10-21T00:00"), t("2026-10-22T00:00"));
    expect(r?.span_days).toBe(1);
  });

  test("只在周末出差：计入工时为 0，总时长照算", () => {
    const r = calculateTripDurations(t("2026-10-24T08:00"), t("2026-10-25T18:00"));
    expect(r).toMatchObject({ work_hours: 0, duration_hours: 34 });
  });

  test("不足 8 小时按实际时长", () => {
    expect(calculateTripDurations(t("2026-10-23T13:00"), t("2026-10-23T16:30"))?.work_hours)
      .toBe(3.5);
  });

  test("结束不晚于开始时返回 null", () => {
    expect(calculateTripDurations(t("2026-10-23T09:00"), t("2026-10-23T09:00"))).toBeNull();
    expect(calculateTripDurations(t("2026-10-23T09:00"), t("2026-10-22T09:00"))).toBeNull();
  });
});
