import type { Dayjs } from "dayjs";

export interface TripDurations {
  duration_hours: number;
  work_hours: number;
  span_days: number;
}

const STANDARD_WORK_HOURS_PER_DAY = 8;
const MAX_DAYS = 366;

/**
 * 出差时长预估（与后端 BusinessTripService.calculateDurations 同一口径，最终以服务端为准）
 *
 * - 总时长：结束减开始
 * - 计入工时：按自然日拆开，工作日计当天时长但最多 8 小时，周六日不计
 * - 跨越天数：每天时长除以 24 后相加
 *
 * @returns 结束不晚于开始时返回 null
 */
export function calculateTripDurations(start: Dayjs, end: Dayjs): TripDurations | null {
  if (!end.isAfter(start)) return null;

  let workHours = 0;
  let spanDays = 0;
  let cursor = start.startOf("day");
  const lastDay = end.startOf("day");
  let safety = 0;

  while (cursor.isBefore(lastDay) || cursor.isSame(lastDay, "day")) {
    safety += 1;
    if (safety > MAX_DAYS) break;

    const segStart = cursor.isSame(start, "day") ? start : cursor;
    const dayEnd = cursor.endOf("day");
    const segEnd = dayEnd.isAfter(end) ? end : dayEnd;
    const hours = segEnd.diff(segStart, "minute") / 60;
    spanDays += Math.min(hours / 24, 1);

    const day = cursor.day();
    if (day !== 0 && day !== 6) {
      workHours += Math.min(hours, STANDARD_WORK_HOURS_PER_DAY);
    }
    cursor = cursor.add(1, "day");
  }

  return {
    duration_hours: Number((end.diff(start, "minute") / 60).toFixed(2)),
    work_hours: Number(workHours.toFixed(2)),
    span_days: Number(spanDays.toFixed(2)),
  };
}
