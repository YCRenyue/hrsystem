/**
 * 报销按天限额（HR 使用手册 13.6：同一天住宿合计不超过 ¥500，餐费合计不超过 ¥150）
 */
import dayjs from "dayjs";
import { findDailyLimitViolations } from "./reimbursementLimits";

const LIMITS = { accommodation: 500, meal: 150 };
const item = (category: string, amount: number | string, date: string | null = "2026-10-22") => ({
  category,
  amount,
  occurred_on: date ? dayjs(date) : null,
});

describe("findDailyLimitViolations", () => {
  test("同一天住宿合计正好 ¥500 不超限", () => {
    expect(findDailyLimitViolations(
      [item("accommodation", 300), item("accommodation", 200)], LIMITS
    )).toEqual([]);
  });

  test("同一天住宿合计超过 ¥500 时提示日期和金额", () => {
    expect(findDailyLimitViolations(
      [item("accommodation", 300), item("accommodation", 200.01)], LIMITS
    )).toEqual(["2026-10-22 住宿合计 ¥500.01，超过上限 ¥500"]);
  });

  test("餐费 ¥150 一天；不同天各自计算", () => {
    expect(findDailyLimitViolations(
      [item("meal", 150), item("meal", 150, "2026-10-23")], LIMITS
    )).toEqual([]);
    expect(findDailyLimitViolations([item("meal", 100), item("meal", 51)], LIMITS)).toHaveLength(1);
  });

  test("住宿和餐费分开算，不互相累加", () => {
    expect(findDailyLimitViolations([item("accommodation", 450), item("meal", 140)], LIMITS))
      .toEqual([]);
  });

  test("交通、其他没有按天限额；没有日期的明细先不算", () => {
    expect(findDailyLimitViolations([
      item("transport", 5000), item("other", 999), item("accommodation", 9999, null),
    ], LIMITS)).toEqual([]);
  });

  test("金额是字符串（输入框原值）时按数字累加", () => {
    expect(findDailyLimitViolations([item("meal", "100"), item("meal", "60")], LIMITS))
      .toHaveLength(1);
  });
});
