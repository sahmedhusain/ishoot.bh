/** Business timezone for dates the company sees (issue/due dates, defaults). */
const BUSINESS_TIME_ZONE = "Asia/Bahrain";

/** YYYY-MM-DD for `date` in the business timezone (not UTC, which is a day behind after midnight Bahrain time). */
export function businessDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
