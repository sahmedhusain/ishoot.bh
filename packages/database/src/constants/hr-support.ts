import { serverMessages } from "@platform/locales";
// Wage support programmes (Tamkeen). Runtime-free so the employee form and payroll share it.

export const TAMKEEN_PROVIDER = "Tamkeen";
/** Share of gross pay before GOSI that Tamkeen covers in years one, two and three. */
export const TAMKEEN_SCHEDULE = [70, 50, 30] as const;
/** Tamkeen reimburses employers in six-month claims. */
export const SUPPORT_CLAIM_MONTHS = 6;

/** Adds whole months to a YYYY-MM string. */
export function addMonths(month: string, count: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + count, 1));
  return d.toISOString().slice(0, 7);
}

/** The three yearly Tamkeen support entries (70%, 50%, 30%) starting from the first supported month. */
export function tamkeenSupports(startMonth: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(startMonth)) throw new Error(serverMessages.chooseTheFirstSupportedMonth);
  return TAMKEEN_SCHEDULE.map((value, year) => ({
    provider: TAMKEEN_PROVIDER,
    mode: "percentage" as const,
    value,
    startMonth: addMonths(startMonth, year * 12),
    endMonth: addMonths(startMonth, year * 12 + 11),
  }));
}
