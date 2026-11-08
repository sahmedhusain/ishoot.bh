import { serverMessages } from "@platform/locales";
/** Historical support snapshots predate configurable programme periods. Never regroup posted claims. */
export const SUPPORT_CLAIM_MONTHS = 6;

/** Adds whole months to a YYYY-MM string. */
export function addMonths(month: string, count: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + count, 1));
  return d.toISOString().slice(0, 7);
}

/** Builds dated entries from a supplied programme schedule; rates and provider are configuration. */
export function supportSchedule(provider: string, startMonth: string, schedule: readonly number[]) {
  if (!provider.trim() || !/^\d{4}-(0[1-9]|1[0-2])$/.test(startMonth) || !schedule.length || schedule.some((value) => !Number.isFinite(value) || value < 0 || value > 100))
    throw new Error(serverMessages.chooseTheFirstSupportedMonth);
  return schedule.map((value, year) => ({
    provider: provider.trim(), mode: "percentage" as const, value,
    startMonth: addMonths(startMonth, year * 12),
    endMonth: addMonths(startMonth, year * 12 + 11),
  }));
}
