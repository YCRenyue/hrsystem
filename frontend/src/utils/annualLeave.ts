/**
 * 年假剩余天数：剩余 = 应休 + 结转 - 已休（HR 使用手册第 10 章）
 * 空值或非数字按 0 计
 */
export function calcRemainingDays(
  total: unknown,
  used: unknown,
  carryOver: unknown
): number {
  const n = (v: unknown) => parseFloat(String(v ?? 0)) || 0;
  return n(total) + n(carryOver) - n(used);
}

/** 剩余天数的颜色：大于 5 绿、大于 0 橙、不大于 0 红（requirement.md 12.1） */
export function remainingDaysColor(days: number): string {
  if (days > 5) return "#52c41a";
  if (days > 0) return "#faad14";
  return "#ff4d4f";
}
