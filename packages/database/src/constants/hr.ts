// HR rules shared by leave calculations and the UI.

/** Bahrain working week: Friday (5) and Saturday (6) are the weekend (JavaScript getUTCDay numbering). */
export const WEEKEND_DAYS: readonly number[] = [5, 6];

export const STANDARD_WORKDAY_HOURS = 8;

/** Working days in an inclusive date range, excluding the weekend. Partial days count as hours / 8. */
export function leaveDaysRequested(start: Date, end: Date, fullDay = true, hours?: number | null): number {
  if (!fullDay) return Math.min(1, Math.max(0, Number(hours ?? 0)) / STANDARD_WORKDAY_HOURS);
  let days = 0;
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  while (cursor.getTime() <= last) {
    if (!WEEKEND_DAYS.includes(cursor.getUTCDay())) days++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}
