
export const WEEKEND_DAYS: readonly number[] = [5, 6];

export const STANDARD_WORKDAY_HOURS = 8;

export function leaveDaysRequested(
  start: Date,
  end: Date,
  fullDay = true,
  hours?: number | null,
  weekendDays: readonly number[] = WEEKEND_DAYS,
): number {
  if (!fullDay)
    return Math.min(
      1,
      Math.max(0, Number(hours ?? 0)) / STANDARD_WORKDAY_HOURS,
    );
  let days = 0;
  const cursor = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
  );
  const last = Date.UTC(
    end.getUTCFullYear(),
    end.getUTCMonth(),
    end.getUTCDate(),
  );
  while (cursor.getTime() <= last) {
    if (!weekendDays.includes(cursor.getUTCDay())) days++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export const PAY_LINE_CATEGORIES = {
  addition: [
    "bonus",
    "incentive",
    "allowance",
    "reimbursement",
    "arrears",
    "overtime_adjustment",
    "other",
  ],
  deduction: [
    "advance_recovery",
    "loan_repayment",
    "penalty",
    "damage",
    "absence_adjustment",
    "other",
  ],
} as const;
export type PayLineKind = keyof typeof PAY_LINE_CATEGORIES;
export const MAX_PAY_LINES = 30;
