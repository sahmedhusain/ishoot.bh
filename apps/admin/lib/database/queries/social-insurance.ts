import { companyCurrency } from "../finance/company-currency";
import { isCountryCode } from "../constants/clients";
import { serverMessages } from "@platform/locales";
import type { Prisma } from "@prisma/client";
import { db, runAtomicMutation } from "../db";
import {
  INSURED_CATEGORIES,
  WAGE_BASES,
  monthlyContributions,
  profileInForce,
  type ComponentOverride,
  type GosiComponentRule,
  type GosiProfile,
  type GosiRules,
  type InsuredCategory,
  type PayParts,
  type ServiceTier,
  type WageBasis,
} from "../hr/social-insurance";

const day = (value: Date | null | undefined) =>
  value ? value.toISOString().slice(0, 10) : null;
const num = (value: unknown) => (value == null ? null : Number(value));
const dateInput = (
  value: string | null | undefined,
  label = "Invalid date",
) => {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)))
    throw new Error(label);
  const date = new Date(`${value}T00:00:00Z`);
  if (date.toISOString().slice(0, 10) !== value) throw new Error(label);
  return date;
};
const dayBefore = (value: Date) => new Date(value.getTime() - 86_400_000);

// ---------- Rules ----------

export async function getGosiRules(): Promise<GosiRules> {
  const row = await db.gosiSettings.findUnique({ where: { id: "default" } });
  return {
    currency: await companyCurrency(),
    firstOfMonthRule: row?.firstOfMonthRule ?? true,
    wageSource: row?.wageSource === "contract" ? "contract" : "registered",
    nationalityCategories: (row?.nationalityCategories ?? {}) as Record<string, InsuredCategory>,
  };
}

export async function updateGosiRules(input: GosiRules, actorId: string) {
  if (!["contract", "registered"].includes(input.wageSource))
    throw new Error(serverMessages.chooseTheWageContributionsAreWorked);
  const categories = input.nationalityCategories ?? {};
  if (Object.entries(categories).some(([country, category]) => (country !== "*" && !isCountryCode(country)) || !(INSURED_CATEGORIES as readonly string[]).includes(category))) throw new Error(serverMessages.invalidInput);
  await db.gosiSettings.upsert({
    where: { id: "default" },
    update: {
      nationalityCategories: categories,
      firstOfMonthRule: !!input.firstOfMonthRule,
      wageSource: input.wageSource,
      updatedById: actorId,
    },
    create: {
      id: "default",
      nationalityCategories: categories,
      firstOfMonthRule: !!input.firstOfMonthRule,
      wageSource: input.wageSource,
      updatedById: actorId,
    },
  });
  return getGosiRules();
}

// ---------- Components ----------

type ComponentRow = Awaited<
  ReturnType<typeof db.gosiComponent.findMany>
>[number];
export function toComponentRule(row: ComponentRow): GosiComponentRule {
  return {
    id: row.id,
    code: row.code,
    nameEn: row.nameEn,
    nameAr: row.nameAr,
    appliesTo: row.appliesTo,
    employeePercent: Number(row.employeePercent),
    employerPercent: Number(row.employerPercent),
    serviceTiers: Array.isArray(row.serviceTiers)
      ? (row.serviceTiers as unknown as ServiceTier[])
      : [],
    wageBasis: row.wageBasis as WageBasis,
    minWage: num(row.minWage),
    maxWage: num(row.maxWage),
    effectiveFrom: day(row.effectiveFrom)!,
    effectiveTo: day(row.effectiveTo),
    isActive: row.isActive,
  };
}

export interface GosiComponentInput {
  code: string;
  name_en: string;
  name_ar: string;
  applies_to: string[];
  employee_percent: number;
  employer_percent: number;
  service_tiers: Array<{
    from_years: number;
    employee_percent: number;
    employer_percent: number;
  }>;
  wage_basis: string;
  min_wage?: number | null;
  max_wage?: number | null;
  effective_from: string;
  notes?: string | null;
}

function normalizeComponent(input: GosiComponentInput) {
  const code = input.code?.trim().toLowerCase();
  if (!code || !/^[a-z][a-z0-9_]{1,39}$/.test(code))
    throw new Error(serverMessages.giveTheContributionAShortCode);
  const nameEn = input.name_en?.trim().slice(0, 120);
  const nameAr = input.name_ar?.trim().slice(0, 120);
  if (!nameEn || !nameAr)
    throw new Error(serverMessages.enterTheContributionNameInEnglish);
  const appliesTo = Array.from(new Set(input.applies_to)).filter(
    (c) =>
      (INSURED_CATEGORIES as readonly string[]).includes(c) && c !== "exempt",
  );
  if (!appliesTo.length)
    throw new Error(serverMessages.chooseWhoTheContributionAppliesTo);
  const percent = (value: number) => {
    const v = Math.round(Number(value) * 1000) / 1000;
    if (!Number.isFinite(v) || v < 0 || v > 100)
      throw new Error(serverMessages.ratesMustBeBetween0And100);
    return v;
  };
  if (!(WAGE_BASES as readonly string[]).includes(input.wage_basis))
    throw new Error(serverMessages.chooseTheWageTheContributionIsWorked);
  const money = (value: number | null | undefined) =>
    value == null || Number.isNaN(value)
      ? null
      : Math.round(Number(value) * 1000) / 1000;
  const minWage = money(input.min_wage);
  const maxWage = money(input.max_wage);
  if (
    (minWage != null && minWage < 0) ||
    (maxWage != null && maxWage <= 0) ||
    (minWage != null && maxWage != null && maxWage < minWage)
  )
    throw new Error(serverMessages.checkTheMinimumAndMaximumWage);
  const tiers = (input.service_tiers ?? []).map((t) => ({
    fromYears: Math.round(Number(t.from_years)),
    employeePercent: percent(t.employee_percent),
    employerPercent: percent(t.employer_percent),
  }));
  if (
    tiers.some(
      (t) =>
        !Number.isInteger(t.fromYears) || t.fromYears < 1 || t.fromYears > 50,
    ) ||
    new Set(tiers.map((t) => t.fromYears)).size !== tiers.length
  )
    throw new Error(serverMessages.eachServiceBandStartsAt);
  const effectiveFrom = dateInput(
    input.effective_from,
    "Choose the date the rates take effect",
  );
  if (!effectiveFrom)
    throw new Error(serverMessages.chooseTheDateTheRatesTakeEffect);
  return {
    code,
    nameEn,
    nameAr,
    appliesTo,
    employeePercent: percent(input.employee_percent),
    employerPercent: percent(input.employer_percent),
    serviceTiers: tiers.sort(
      (a, b) => a.fromYears - b.fromYears,
    ) as unknown as Prisma.InputJsonValue,
    wageBasis: input.wage_basis,
    minWage,
    maxWage,
    effectiveFrom,
    notes: input.notes?.trim().slice(0, 500) || null,
  };
}

/** Every component with its dated history, newest first within each code. */
export async function listGosiComponents() {
  const rows = await db.gosiComponent.findMany({
    orderBy: [{ code: "asc" }, { effectiveFrom: "desc" }],
  });
  return rows.map((row) => ({
    ...toComponentRule(row),
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
  }));
}

/**
 * Adds a contribution, or schedules new rates for an existing one from a date: the rates in force until then
 * end the day before, so payroll for earlier months keeps them.
 */
export async function scheduleGosiComponent(
  input: GosiComponentInput,
  actorId: string,
) {
  const data = normalizeComponent(input);
  return runAtomicMutation(async () => {
    const versions = await db.gosiComponent.findMany({
      where: { code: data.code },
      orderBy: { effectiveFrom: "asc" },
    });
    if (
      versions.some(
        (v) => v.effectiveFrom.getTime() === data.effectiveFrom.getTime(),
      )
    )
      throw new Error(serverMessages.ratesAlreadyStartOnThatDate);
    // The version in force on the new date ends the day before; a later version caps the new one.
    const previous = versions
      .filter((v) => v.effectiveFrom < data.effectiveFrom)
      .pop();
    const next = versions.find((v) => v.effectiveFrom > data.effectiveFrom);
    if (
      previous &&
      (!previous.effectiveTo || previous.effectiveTo >= data.effectiveFrom)
    )
      await db.gosiComponent.update({
        where: { id: previous.id },
        data: { effectiveTo: dayBefore(data.effectiveFrom) },
      });
    return db.gosiComponent.create({
      data: {
        ...data,
        effectiveTo: next ? dayBefore(next.effectiveFrom) : null,
        createdById: actorId,
      },
    });
  });
}

/** Corrects one dated version in place (name, rates, wage limits). Its dates stay as they are. */
export async function updateGosiComponent(
  id: string,
  input: Omit<GosiComponentInput, "effective_from" | "code">,
) {
  const existing = await db.gosiComponent.findUnique({ where: { id } });
  if (!existing) throw new Error(serverMessages.contributionNotFound);
  const data = normalizeComponent({
    ...input,
    code: existing.code,
    effective_from: day(existing.effectiveFrom)!,
  });
  const { effectiveFrom: _from, code: _code, ...rest } = data;
  return db.gosiComponent.update({ where: { id }, data: rest });
}

/** Stops a contribution from a date (it no longer applies from that day). */
export async function endGosiComponent(id: string, endsOn: string) {
  const existing = await db.gosiComponent.findUnique({ where: { id } });
  if (!existing) throw new Error(serverMessages.contributionNotFound);
  const end = dateInput(endsOn, "Choose the last day the contribution applies");
  if (!end || end < existing.effectiveFrom)
    throw new Error(serverMessages.theEndDateCannotBeBeforeTheContribution);
  return db.gosiComponent.update({ where: { id }, data: { effectiveTo: end } });
}

// ---------- Employee registrations ----------

export interface EmployeeGosiInput {
  category: string;
  registration_number?: string | null;
  registered_wage?: number | null;
  overrides?: Array<{
    code: string;
    employee_percent?: number | null;
    employer_percent?: number | null;
    wage?: number | null;
    exempt?: boolean;
  }>;
  effective_from: string;
  notes?: string | null;
}

type ProfileRow = Awaited<
  ReturnType<typeof db.employeeGosiRecord.findMany>
>[number];
export function toGosiProfile(
  row: ProfileRow,
): GosiProfile & { id: string; notes: string | null } {
  return {
    id: row.id,
    category: row.category as InsuredCategory,
    registrationNumber: row.registrationNumber,
    registeredWage: num(row.registeredWage),
    overrides: Array.isArray(row.overrides)
      ? (row.overrides as unknown as ComponentOverride[])
      : [],
    effectiveFrom: day(row.effectiveFrom)!,
    effectiveTo: day(row.effectiveTo),
    notes: row.notes,
  };
}

export async function listEmployeeGosiRecords(employeeId: string) {
  const rows = await db.employeeGosiRecord.findMany({
    where: { employeeId },
    orderBy: { effectiveFrom: "desc" },
  });
  return rows.map(toGosiProfile);
}

/**
 * Registers the employee from a date (category, GOSI number, registered wage, exceptions per contribution).
 * The registration in force until then ends the day before.
 */
export async function saveEmployeeGosiRecord(
  employeeId: string,
  input: EmployeeGosiInput,
  actorId: string,
) {
  if (!(INSURED_CATEGORIES as readonly string[]).includes(input.category))
    throw new Error(serverMessages.chooseTheEmployeesInsuranceCategory);
  const effectiveFrom = dateInput(
    input.effective_from,
    "Choose the date the registration takes effect",
  );
  if (!effectiveFrom)
    throw new Error(serverMessages.chooseTheDateTheRegistrationTakesEffect);
  const wage =
    input.registered_wage == null || Number.isNaN(input.registered_wage)
      ? null
      : Math.round(Number(input.registered_wage) * 1000) / 1000;
  if (wage != null && (!Number.isFinite(wage) || wage < 0))
    throw new Error(serverMessages.enterAValidRegisteredWage);
  const overrides = (input.overrides ?? [])
    .map((o) => {
      const pct = (v: number | null | undefined) => {
        if (v == null || Number.isNaN(v)) return null;
        if (!(v >= 0 && v <= 100))
          throw new Error(serverMessages.ratesMustBeBetween0And100);
        return Math.round(v * 1000) / 1000;
      };
      if (o.wage != null && (!Number.isFinite(o.wage) || o.wage < 0))
        throw new Error(serverMessages.enterAValidRegisteredWage);
      return {
        code: o.code,
        wage: o.wage == null ? null : Math.round(o.wage * 1000) / 1000,
        employeePercent: pct(o.employee_percent),
        employerPercent: pct(o.employer_percent),
        exempt: !!o.exempt,
      };
    })
    .filter(
      (o) =>
        o.exempt ||
        o.wage != null ||
        o.employeePercent != null ||
        o.employerPercent != null,
    );
  return runAtomicMutation(async () => {
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      select: { id: true },
    });
    if (!employee) throw new Error(serverMessages.employeeNotFound);
    const versions = await db.employeeGosiRecord.findMany({
      where: { employeeId },
      orderBy: { effectiveFrom: "asc" },
    });
    if (
      versions.some(
        (v) => v.effectiveFrom.getTime() === effectiveFrom.getTime(),
      )
    )
      throw new Error(serverMessages.aRegistrationAlreadyStartsOnThatDate);
    const previous = versions
      .filter((v) => v.effectiveFrom < effectiveFrom)
      .pop();
    const next = versions.find((v) => v.effectiveFrom > effectiveFrom);
    if (
      previous &&
      (!previous.effectiveTo || previous.effectiveTo >= effectiveFrom)
    )
      await db.employeeGosiRecord.update({
        where: { id: previous.id },
        data: { effectiveTo: dayBefore(effectiveFrom) },
      });
    return db.employeeGosiRecord.create({
      data: {
        employeeId,
        category: input.category,
        registrationNumber:
          input.registration_number?.trim().slice(0, 40) || null,
        registeredWage: wage,
        overrides: overrides as unknown as Prisma.InputJsonValue,
        effectiveFrom,
        effectiveTo: next ? dayBefore(next.effectiveFrom) : null,
        notes: input.notes?.trim().slice(0, 500) || null,
        createdById: actorId,
      },
    });
  });
}

export async function deleteEmployeeGosiRecord(id: string) {
  const record = await db.employeeGosiRecord.findUnique({ where: { id } });
  if (!record) throw new Error(serverMessages.registrationNotFound);
  return runAtomicMutation(async () => {
    await db.employeeGosiRecord.delete({ where: { id } });
    // The registration before it runs on until the next one, as if this one never existed.
    const previous = await db.employeeGosiRecord.findFirst({
      where: {
        employeeId: record.employeeId,
        effectiveFrom: { lt: record.effectiveFrom },
      },
      orderBy: { effectiveFrom: "desc" },
    });
    if (previous)
      await db.employeeGosiRecord.update({
        where: { id: previous.id },
        data: { effectiveTo: record.effectiveTo },
      });
    return record.employeeId;
  });
}

/** Registers only explicitly configured nationality groups; existing employee registrations remain unchanged. */
export async function registerUnregisteredEmployees(
  effectiveFromInput: string,
  actorId: string,
) {
  const effectiveFrom = dateInput(
    effectiveFromInput,
    "Choose the date the registration takes effect",
  );
  if (!effectiveFrom)
    throw new Error(serverMessages.chooseTheDateTheRegistrationTakesEffect);
  const employees = await db.employee.findMany({
    where: { status: { not: "terminated" }, gosiRecords: { none: {} } },
    select: { id: true, nationality: true },
  });
  const rules = await getGosiRules();
  const records = employees.flatMap((e) => {
    const category = e.nationality ? rules.nationalityCategories?.[e.nationality] ?? rules.nationalityCategories?.["*"] : undefined;
    return category ? [{ employeeId: e.id, category, effectiveFrom, createdById: actorId }] : [];
  });
  if (records.length) await db.employeeGosiRecord.createMany({ data: records });
  return { registered: records.length, skipped: employees.length - records.length };
}

// ---------- For payroll and settlements ----------

export interface GosiContext {
  rules: GosiRules;
  components: GosiComponentRule[];
  profiles: Map<string, Array<GosiProfile & { id: string }>>;
}

export async function loadGosiContext(
  employeeIds: string[],
): Promise<GosiContext> {
  const [rules, components, records] = await Promise.all([
    getGosiRules(),
    db.gosiComponent.findMany(),
    db.employeeGosiRecord.findMany({
      where: { employeeId: { in: employeeIds } },
    }),
  ]);
  const profiles = new Map<string, Array<GosiProfile & { id: string }>>();
  for (const row of records) {
    const list = profiles.get(row.employeeId) ?? [];
    list.push(toGosiProfile(row));
    profiles.set(row.employeeId, list);
  }
  return { rules, components: components.map(toComponentRule), profiles };
}

/** The month's contributions under the scheme, or null when the employee has no registration in force (legacy settings apply). */
export function schemeContributions(
  ctx: GosiContext,
  employeeId: string,
  input: {
    pay: PayParts;
    hireDate: Date;
    exitDate?: Date | null;
    year: number;
    month: number;
  },
) {
  const profile = profileInForce(
    ctx.profiles.get(employeeId) ?? [],
    input.year,
    input.month,
  );
  if (!profile) return null;
  return {
    profile,
    ...monthlyContributions({
      components: ctx.components,
      profile,
      rules: ctx.rules,
      ...input,
    }),
  };
}

/** What the scheme takes for an employee each month over a range, for the employee's GOSI page. */
export async function previewEmployeeContributions(
  employeeId: string,
  months: string[],
) {
  const employee = await db.employee.findUniqueOrThrow({
    where: { id: employeeId },
    select: {
      hireDate: true,
      employmentRecords: { where: { isCurrent: true }, take: 1 },
    },
  });
  const record = employee.employmentRecords[0];
  if (!record) return [];
  const pay = {
    basic: Number(record.basicSalary),
    housing: Number(record.housingAllowance),
    transport: Number(record.transportAllowance),
    other: Number(record.otherAllowances),
  };
  const ctx = await loadGosiContext([employeeId]);
  return months.map((m) => {
    const [year, month] = m.split("-").map(Number);
    const result = schemeContributions(ctx, employeeId, {
      pay,
      hireDate: employee.hireDate,
      year,
      month,
    });
    return {
      month: m,
      ...(result ?? {
        due: false,
        reason: "unregistered" as const,
        employee: 0,
        employer: 0,
        lines: [],
      }),
    };
  });
}

/** Employees with their current registration, for the social insurance page. */
export async function listGosiRegistrations() {
  const employees = await db.employee.findMany({
    where: { status: { not: "terminated" } },
    select: {
      id: true,
      employeeNumber: true,
      firstNameEn: true,
      lastNameEn: true,
      firstNameAr: true,
      lastNameAr: true,
      nationality: true,
      hireDate: true,
      gosiRecords: { orderBy: { effectiveFrom: "desc" } },
      employmentRecords: {
        where: { isCurrent: true },
        take: 1,
        select: {
          basicSalary: true,
          housingAllowance: true,
          transportAllowance: true,
          otherAllowances: true,
        },
      },
    },
    orderBy: [{ firstNameEn: "asc" }, { lastNameEn: "asc" }],
  });
  const ctx = await loadGosiContext(employees.map((e) => e.id));
  const now = new Date();
  const [year, month] = [now.getUTCFullYear(), now.getUTCMonth() + 1];
  return employees.map((e) => {
    const r = e.employmentRecords[0];
    const pay = r
      ? {
          basic: Number(r.basicSalary),
          housing: Number(r.housingAllowance),
          transport: Number(r.transportAllowance),
          other: Number(r.otherAllowances),
        }
      : null;
    const current = profileInForce(
      e.gosiRecords.map(toGosiProfile),
      year,
      month,
    );
    const thisMonth = pay
      ? schemeContributions(ctx, e.id, {
          pay,
          hireDate: e.hireDate,
          year,
          month,
        })
      : null;
    return {
      id: e.id,
      employeeNumber: e.employeeNumber,
      nameEn: `${e.firstNameEn} ${e.lastNameEn}`,
      nameAr: `${e.firstNameAr} ${e.lastNameAr}`,
      nationality: e.nationality,
      hireDate: day(e.hireDate)!,
      current: current ? { ...current } : null,
      history: e.gosiRecords.map(toGosiProfile),
      thisMonth: thisMonth
        ? {
            due: thisMonth.due,
            reason: thisMonth.reason,
            employee: thisMonth.employee,
            employer: thisMonth.employer,
            lines: thisMonth.lines,
          }
        : null,
    };
  });
}
