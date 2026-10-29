import type { Dayjs } from "dayjs";

export interface LimitItem {
  category: string;
  amount: number | string;
  occurred_on: Dayjs | null;
}

export interface DailyLimits {
  accommodation: number;
  meal: number;
}

const LABELS: Record<keyof DailyLimits, string> = { accommodation: "住宿", meal: "餐费" };

/**
 * 按天限额校验（与后端口径一致：同一天同一类别的金额合计不能超过限额）
 *
 * @returns 超限提示，每个超限的日期和类别一条；没有超限时为空数组
 */
export function findDailyLimitViolations(items: LimitItem[], limits: DailyLimits): string[] {
  const totals: Record<keyof DailyLimits, Record<string, number>> = {
    accommodation: {},
    meal: {},
  };
  items.forEach((it) => {
    if (!it.occurred_on) return;
    if (it.category !== "accommodation" && it.category !== "meal") return;
    const date = it.occurred_on.format("YYYY-MM-DD");
    const byDate = totals[it.category];
    byDate[date] = (byDate[date] || 0) + Number(it.amount);
  });
  const messages: string[] = [];
  (Object.keys(totals) as Array<keyof DailyLimits>).forEach((category) => {
    Object.entries(totals[category]).forEach(([date, total]) => {
      if (total > limits[category]) {
        messages.push(
          `${date} ${LABELS[category]}合计 ¥${total.toFixed(2)}，超过上限 ¥${limits[category]}`
        );
      }
    });
  });
  return messages;
}
