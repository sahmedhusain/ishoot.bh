import { roundMoney } from "../finance/money";
import { serverMessages } from "@platform/locales";
import { monthsOfService, r3 } from "./payroll-engine";

export interface GratuityRules {
  enabled: boolean;
  appliesTo: string[];
  wageBasis: "basic" | "fixed";
  firstYears: number;
  firstYearsMonths: number;
  laterYearsMonths: number;
  minServiceMonths: number;
  serviceUntil: string | null;
}

export const DEFAULT_GRATUITY_RULES: GratuityRules = {
  enabled: false,
  appliesTo: [],
  wageBasis: "basic",
  firstYears: 3,
  firstYearsMonths: 0.5,
  laterYearsMonths: 1,
  minServiceMonths: 0,
  serviceUntil: null,
};

export function parseGratuityRules(value: unknown): GratuityRules {
  const v = (value ?? {}) as Partial<GratuityRules>;
  const n = (x: unknown, fallback: number) =>
    typeof x === "number" && Number.isFinite(x) ? x : fallback;
  return {
    enabled: v.enabled ?? DEFAULT_GRATUITY_RULES.enabled,
    appliesTo: Array.isArray(v.appliesTo)
      ? v.appliesTo.filter((c) => typeof c === "string")
      : DEFAULT_GRATUITY_RULES.appliesTo,
    wageBasis: v.wageBasis === "fixed" ? "fixed" : "basic",
    firstYears: n(v.firstYears, DEFAULT_GRATUITY_RULES.firstYears),
    firstYearsMonths: n(
      v.firstYearsMonths,
      DEFAULT_GRATUITY_RULES.firstYearsMonths,
    ),
    laterYearsMonths: n(
      v.laterYearsMonths,
      DEFAULT_GRATUITY_RULES.laterYearsMonths,
    ),
    minServiceMonths: n(
      v.minServiceMonths,
      DEFAULT_GRATUITY_RULES.minServiceMonths,
    ),
    serviceUntil:
      typeof v.serviceUntil === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(v.serviceUntil)
        ? v.serviceUntil
        : v.serviceUntil === null
          ? null
          : DEFAULT_GRATUITY_RULES.serviceUntil,
  };
}

export function validateGratuityRules(input: GratuityRules): GratuityRules {
  const rules = parseGratuityRules(input);
  if (!(rules.firstYears >= 0 && rules.firstYears <= 40))
    throw new Error(serverMessages.theFirstBandOfYearsMustBe);
  if (
    !(rules.firstYearsMonths >= 0 && rules.firstYearsMonths <= 3) ||
    !(rules.laterYearsMonths >= 0 && rules.laterYearsMonths <= 3)
  )
    throw new Error(serverMessages.monthsOfPayPerYearMustBe);
  if (!(rules.minServiceMonths >= 0 && rules.minServiceMonths <= 120))
    throw new Error(serverMessages.minimumServiceMustBeBetween);
  return rules;
}

const DAY = 86_400_000;
const inclusiveDays = (from: Date, to: Date) =>
  Math.max(0, Math.floor((to.getTime() - from.getTime()) / DAY) + 1);

export function leavingIndemnity(input: {
  rules: GratuityRules;
  category: string;
  hireDate: Date;
  lastWorkingDay: Date;
  monthlyWage: number;
  currency?: string;
}) {
  const { rules } = input;
  const none = (reason: string) => ({ amount: 0, years: 0, reason });
  if (!rules.enabled) return none("disabled");
  if (!rules.appliesTo.includes(input.category)) return none("not_applicable");
  const until = rules.serviceUntil
    ? new Date(`${rules.serviceUntil}T00:00:00Z`)
    : null;
  const end =
    until && until < input.lastWorkingDay ? until : input.lastWorkingDay;
  if (end < input.hireDate) return none("no_service_before_cutoff");
  const totalDays = inclusiveDays(input.hireDate, input.lastWorkingDay);
  if (totalDays < (rules.minServiceMonths * 365) / 12)
    return none("below_minimum_service");
  const years = inclusiveDays(input.hireDate, end) / 365;
  const first = Math.min(years, rules.firstYears);
  const later = Math.max(0, years - rules.firstYears);
  const months =
    first * rules.firstYearsMonths + later * rules.laterYearsMonths;
  return {
    amount: input.currency ? roundMoney(input.monthlyWage * months, input.currency) : r3(input.monthlyWage * months),
    years: Math.round(years * 1000) / 1000,
    months: Math.round(months * 1000) / 1000,
    reason: "due",
  };
}

export function accruedLeaveToDate(input: {
  daysPerYear: number;
  accrual: "annual" | "monthly" | "none";
  hireDate: Date;
  lastWorkingDay: Date;
}) {
  if (input.accrual === "none") return 0;
  const year = input.lastWorkingDay.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const from = input.hireDate > yearStart ? input.hireDate : yearStart;
  if (from > input.lastWorkingDay) return 0;
  const yearDays = inclusiveDays(yearStart, new Date(Date.UTC(year, 11, 31)));
  if (input.accrual === "annual")
    return (
      Math.round(
        ((input.daysPerYear * inclusiveDays(from, input.lastWorkingDay)) /
          yearDays) *
          100,
      ) / 100
    );
  const months = monthsOfService(
    from,
    new Date(input.lastWorkingDay.getTime() + DAY),
  );
  return (
    Math.round((input.daysPerYear / 12) * Math.min(12, months) * 100) / 100
  );
}

export function partMonthPay(fixedPay: number, from: Date, to: Date, currency?: string) {
  const days = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const amount = (fixedPay * inclusiveDays(from, to)) / days;
  return currency ? roundMoney(amount, currency) : r3(amount);
}
