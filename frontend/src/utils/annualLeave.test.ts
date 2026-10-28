/**
 * 年假表单的自动计算（HR 使用手册第 10 章、requirement.md 12.1）
 */
import { calcRemainingDays, remainingDaysColor } from "./annualLeave";

describe("calcRemainingDays", () => {
  test("手册样例：应休 5、已休 2、结转 1，剩余 4 天", () => {
    expect(calcRemainingDays(5, 2, 1)).toBe(4);
  });

  test("支持半天", () => {
    expect(calcRemainingDays("5", "1.5", "0")).toBe(3.5);
  });

  test("空值按 0 计；超休时为负数", () => {
    expect(calcRemainingDays(5, undefined, null)).toBe(5);
    expect(calcRemainingDays(5, 7, 0)).toBe(-2);
  });
});

describe("remainingDaysColor：大于 5 绿、大于 0 橙、不大于 0 红", () => {
  test.each([
    [6, "#52c41a"],
    [5, "#faad14"],
    [0.5, "#faad14"],
    [0, "#ff4d4f"],
    [-1, "#ff4d4f"],
  ])("%s 天 -> %s", (days, color) => {
    expect(remainingDaysColor(days)).toBe(color);
  });
});
