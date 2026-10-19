/**
 * Social insurance (GOSI / SIO) contributions and wage-support programmes, with no database access.
 *
 * Contributions are monthly and never prorated: GOSI counts the month in full when the employee is employed on its
 * 1st day, and not at all for a month they join after the 1st. Rates are dated components, so a change in the law
 * is a new component from its effective date and every past month keeps the rates it was paid under.
 */

export type InsuredCategory = "bahraini" | "gcc" | "expat" | "exempt";
export const INSURED_CATEGORIES = [
  "bahraini",
  "gcc",
  "expat",
  "exempt",
] as const;
export type WageBasis = "basic" | "basic_housing" | "fixed";
export const WAGE_BASES = ["basic", "basic_housing", "fixed"] as const;

export interface ServiceTier {
  /** Completed years of service from which these rates apply. */
  fromYears: number;
  employeePercent: number;
  employerPercent: number;
}

export interface GosiComponentRule {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  appliesTo: string[];
  employeePercent: number;
  employerPercent: number;
  serviceTiers: ServiceTier[];
  wageBasis: WageBasis;
  minWage: number | null;
  maxWage: number | null;
  /** YYYY-MM-DD */
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
}

export interface ComponentOverride {
  code: string;
  employeePercent?: number | null;
  employerPercent?: number | null;
  wage?: number | null;
  exempt?: boolean;
}

export interface GosiProfile {
  category: InsuredCategory;
  registrationNumber?: string | null;
  registeredWage: number | null;
  overrides: ComponentOverride[];
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface GosiRules {
  firstOfMonthRule: boolean;
  wageSource: "contract" | "registered";
}

export interface PayParts {
  basic: number;
  housing: number;
  transport: number;
  other: number;
}

export interface ContributionLine {
  code: string;
  nameEn: string;
  nameAr: string;
  wage: number;
  employeePercent: number;
  employerPercent: number;
  employee: number;
  employer: number;
}

export interface MonthlyContributions {
  /** False when nothing is due for the month (joined after the 1st, left before it, or exempt). */
  due: boolean;
  reason: "due" | "exempt" | "not_employed_on_first" | "no_components";
  employee: number;
  employer: number;
  lines: ContributionLine[];
}

const r3 = (value: number) =>
  Math.round((value + Number.EPSILON) * 1000) / 1000;
const key = (date: Date) => date.toISOString().slice(0, 10);
const firstOfMonth = (year: number, month: number) =>
  new Date(Date.UTC(year, month - 1, 1));
const lastOfMonth = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 0));

/** The wage a component or programme is worked out on. */
export function basisWage(pay: PayParts, basis: WageBasis): number {
  if (basis === "basic") return r3(pay.basic);
  if (basis === "basic_housing") return r3(pay.basic + pay.housing);
  return r3(pay.basic + pay.housing + pay.transport + pay.other);
}

/** Whole years of service completed by `on`. */
export function completedYears(hireDate: Date, on: Date): number {
  let years = on.getUTCFullYear() - hireDate.getUTCFullYear();
  const anniversary = new Date(
    Date.UTC(
      on.getUTCFullYear(),
      hireDate.getUTCMonth(),
      hireDate.getUTCDate(),
    ),
  );
  if (on < anniversary) years -= 1;
  return Math.max(0, years);
}

/** True when contributions are due for the month: employed on its 1st (or on any day, without the 1st-of-month rule). */
export function contributionDue(
  hireDate: Date,
  exitDate: Date | null,
  year: number,
  month: number,
  firstOfMonthRule: boolean,
): boolean {
  const first = firstOfMonth(year, month);
  const last = lastOfMonth(year, month);
  if (firstOfMonthRule)
    return hireDate <= first && (!exitDate || exitDate >= first);
  return hireDate <= last && (!exitDate || exitDate >= first);
}

/** Components in force on the 1st of the month (each code once: the latest effective one). */
export function componentsInForce(
  components: GosiComponentRule[],
  year: number,
  month: number,
): GosiComponentRule[] {
  const on = key(firstOfMonth(year, month));
  const byCode = new Map<string, GosiComponentRule>();
  for (const c of components) {
    if (
      !c.isActive ||
      c.effectiveFrom > on ||
      (c.effectiveTo && c.effectiveTo < on)
    )
      continue;
    const current = byCode.get(c.code);
    if (!current || c.effectiveFrom > current.effectiveFrom)
      byCode.set(c.code, c);
  }
  return Array.from(byCode.values()).sort((a, b) =>
    a.code.localeCompare(b.code),
  );
}

/** The employee's registration in force on the 1st of the month, if any. */
export function profileInForce<
  T extends Pick<GosiProfile, "effectiveFrom" | "effectiveTo">,
>(profiles: T[], year: number, month: number): T | null {
  const on = key(firstOfMonth(year, month));
  return (
    profiles
      .filter(
        (p) => p.effectiveFrom <= on && (!p.effectiveTo || p.effectiveTo >= on),
      )
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0] ?? null
  );
}

/** One month of contributions for an employee under the components and their registration. */
export function monthlyContributions(input: {
  components: GosiComponentRule[];
  profile: GosiProfile;
  rules: GosiRules;
  pay: PayParts;
  hireDate: Date;
  exitDate?: Date | null;
  year: number;
  month: number;
}): MonthlyContributions {
  const { profile, rules, pay, year, month } = input;
  const none = (
    reason: MonthlyContributions["reason"],
  ): MonthlyContributions => ({
    due: false,
    reason,
    employee: 0,
    employer: 0,
    lines: [],
  });
  if (profile.category === "exempt") return none("exempt");
  if (
    !contributionDue(
      input.hireDate,
      input.exitDate ?? null,
      year,
      month,
      rules.firstOfMonthRule,
    )
  )
    return none("not_employed_on_first");
  const active = componentsInForce(input.components, year, month).filter((c) =>
    c.appliesTo.includes(profile.category),
  );
  if (!active.length) return none("no_components");
  const years = completedYears(input.hireDate, firstOfMonth(year, month));
  const lines: ContributionLine[] = [];
  for (const c of active) {
    const override = profile.overrides.find((o) => o.code === c.code);
    if (override?.exempt) continue;
    const tier = [...c.serviceTiers]
      .sort((a, b) => b.fromYears - a.fromYears)
      .find((t) => years >= t.fromYears);
    const employeePercent =
      override?.employeePercent ?? tier?.employeePercent ?? c.employeePercent;
    const employerPercent =
      override?.employerPercent ?? tier?.employerPercent ?? c.employerPercent;
    // The wage registered with GOSI replaces the contract pay when the company declares one.
    let wage =
      c.wageBasis === "fixed" &&
      rules.wageSource === "registered" &&
      profile.registeredWage != null
        ? profile.registeredWage
        : basisWage(pay, c.wageBasis);
    if (override?.wage != null) wage = override.wage;
    if (c.minWage != null) wage = Math.max(wage, c.minWage);
    if (c.maxWage != null) wage = Math.min(wage, c.maxWage);
    lines.push({
      code: c.code,
      nameEn: c.nameEn,
      nameAr: c.nameAr,
      wage: r3(wage),
      employeePercent,
      employerPercent,
      employee: r3((wage * employeePercent) / 100),
      employer: r3((wage * employerPercent) / 100),
    });
  }
  return {
    due: true,
    reason: "due",
    employee: r3(lines.reduce((sum, l) => sum + l.employee, 0)),
    employer: r3(lines.reduce((sum, l) => sum + l.employer, 0)),
    lines,
  };
}

// ---------- Wage-support programmes ----------

export const SUPPORT_STATUSES = [
  "applied",
  "approved",
  "partially_approved",
  "rejected",
  "suspended",
  "ended",
] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];
/** Statuses for which the programme pays. */
export const PAYING_SUPPORT_STATUSES: readonly SupportStatus[] = [
  "approved",
  "partially_approved",
];
export const QUALIFICATIONS = [
  "below_secondary",
  "secondary",
  "diploma",
  "bachelor",
  "master",
  "doctorate",
  "professional",
] as const;

export interface SupportRule {
  effectiveFrom: string;
  effectiveTo: string | null;
  wageBasis: WageBasis;
  schedule: Array<{ year: number; percent: number }>;
  wageCap: number | null;
  monthlyCap: number | null;
  qualificationCaps: Array<{ qualification: string; cap: number }>;
}

export interface SupportEnrolment {
  id: string;
  programCode: string;
  claimPeriodMonths?: number;
  provider: string;
  nameEn: string;
  nameAr: string;
  prorate: boolean;
  status: string;
  qualification: string | null;
  startMonth: string;
  endMonth: string | null;
  approvedPercent: number | null;
  approvedAmount: number | null;
  monthlyCap: number | null;
}

export interface SupportLine {
  enrolmentId: string;
  programCode: string;
  claimPeriodMonths?: number;
  provider: string;
  nameEn: string;
  nameAr: string;
  startMonth: string;
  /** Year of support (1 = first twelve months). */
  year: number;
  wage: number;
  percent: number | null;
  cap: number | null;
  share: number;
  amount: number;
}

export const monthsBetween = (from: string, to: string) => {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
};

/** The programme rule in force on the 1st of the month. */
export function ruleInForce(
  rules: SupportRule[],
  month: string,
): SupportRule | null {
  const on = `${month}-01`;
  return (
    rules
      .filter(
        (r) => r.effectiveFrom <= on && (!r.effectiveTo || r.effectiveTo >= on),
      )
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0] ?? null
  );
}

/**
 * What a programme pays towards one employee's month. `paidShare` is the share of the month's fixed pay actually
 * paid (joiners, unpaid leave), applied when the programme prorates. Null when nothing is paid.
 */
export function supportForMonth(
  enrolment: SupportEnrolment,
  rules: SupportRule[],
  pay: PayParts,
  month: string,
  paidShare = 1,
): SupportLine | null {
  if (
    !(PAYING_SUPPORT_STATUSES as readonly string[]).includes(enrolment.status)
  )
    return null;
  if (
    month < enrolment.startMonth ||
    (enrolment.endMonth && month > enrolment.endMonth)
  )
    return null;
  const rule = ruleInForce(rules, month);
  if (!rule) return null;
  const year = Math.floor(monthsBetween(enrolment.startMonth, month) / 12) + 1;
  const scheduled = rule.schedule.find((s) => s.year === year)?.percent ?? null;
  // A partial approval sets its own share or a fixed monthly amount; otherwise the schedule decides.
  if (
    enrolment.approvedAmount == null &&
    enrolment.approvedPercent == null &&
    scheduled == null
  )
    return null;
  let wage = basisWage(pay, rule.wageBasis);
  if (rule.wageCap != null) wage = Math.min(wage, rule.wageCap);
  const qualificationCap = enrolment.qualification
    ? (rule.qualificationCaps.find(
        (q) => q.qualification === enrolment.qualification,
      )?.cap ?? null)
    : null;
  if (qualificationCap != null) wage = Math.min(wage, qualificationCap);
  const percent =
    enrolment.approvedAmount != null
      ? null
      : (enrolment.approvedPercent ?? scheduled);
  let amount = enrolment.approvedAmount ?? (wage * (percent ?? 0)) / 100;
  const caps = [rule.monthlyCap, enrolment.monthlyCap].filter(
    (c): c is number => c != null,
  );
  const cap = caps.length ? Math.min(...caps) : null;
  if (cap != null) amount = Math.min(amount, cap);
  const share = enrolment.prorate ? Math.max(0, Math.min(1, paidShare)) : 1;
  amount = r3(amount * share);
  if (amount <= 0) return null;
  return {
    enrolmentId: enrolment.id,
    programCode: enrolment.programCode,
    claimPeriodMonths: enrolment.claimPeriodMonths ?? 6,
    provider: enrolment.provider,
    nameEn: enrolment.nameEn,
    nameAr: enrolment.nameAr,
    startMonth: enrolment.startMonth,
    year,
    wage: r3(wage),
    percent,
    cap,
    share: Math.round(share * 10000) / 10000,
    amount,
  };
}
