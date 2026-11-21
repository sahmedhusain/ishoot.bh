import { companyCurrency } from "../finance/company-currency";
import { isCountryCode } from "../constants/clients";
import { serverMessages } from "@platform/locales";
import type { Database } from "@platform/database/decimal";
import { runAtomicMutation } from "../api/atomic";
import { getEmployeeRelations, listEmployees } from "../api/hr";
import { deleteTableRow, listTableRows, upsertTableRow } from "../api/tables";
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

const day = (value: unknown) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};
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

export async function getGosiRules(): Promise<GosiRules> {
  const rows = await listTableRows("hr", "gosi_settings").catch(() => []);
  const row = rows.find((r) => r.id === "default") ?? rows[0];
  const rawMappings = row?.nationalityCategories;
  const sanitized: Record<string, InsuredCategory> = {};
  if (rawMappings && typeof rawMappings === "object") {
    for (const [key, val] of Object.entries(rawMappings as Record<string, unknown>)) {
      if (typeof val === "string" && (INSURED_CATEGORIES as readonly string[]).includes(val)) {
        sanitized[key] = val as InsuredCategory;
      }
    }
  }
  const hasRawKeys =
    !!rawMappings &&
    typeof rawMappings === "object" &&
    Object.keys(rawMappings as Record<string, unknown>).length > 0;
  const nationalityCategories: Record<string, InsuredCategory> =
    Object.keys(sanitized).length > 0
      ? sanitized
      : hasRawKeys
        ? { BH: "bahraini", SA: "gcc", KW: "gcc", AE: "gcc", QA: "gcc", OM: "gcc", "*": "expat" }
        : {};
  return {
    currency: await companyCurrency(),
    firstOfMonthRule: row?.firstOfMonthRule ?? true,
    wageSource: row?.wageSource === "contract" ? "contract" : "registered",
    nationalityCategories,
  };
}

export async function updateGosiRules(input: GosiRules, actorId: string) {
  if (!["contract", "registered"].includes(input.wageSource))
    throw new Error(serverMessages.chooseTheWageContributionsAreWorked);
  const categories = input.nationalityCategories ?? {};
  if (Object.entries(categories).some(([country, category]) => (country !== "*" && !isCountryCode(country)) || !(INSURED_CATEGORIES as readonly string[]).includes(category))) throw new Error(serverMessages.invalidInput);
  await upsertTableRow("hr", "gosi_settings", {
    id: "default",
    nationalityCategories: categories,
    firstOfMonthRule: !!input.firstOfMonthRule,
    wageSource: input.wageSource,
    updatedById: actorId,
  });
  return getGosiRules();
}

type ComponentRow = any;
export function toComponentRule(row: ComponentRow): GosiComponentRule {
  const code = String(row.code ?? "");
  const defaultAppliesTo: string[] = Array.isArray(row.appliesTo)
    ? row.appliesTo
    : /eos|expat/i.test(code)
      ? ["expat"]
      : /old|pension/i.test(code)
        ? ["bahraini", "gcc"]
        : ["bahraini", "gcc", "expat"];
  return {
    id: row.id,
    code,
    nameEn: row.nameEn,
    nameAr: row.nameAr,
    appliesTo: defaultAppliesTo,
    employeePercent: Number(row.employeePercent ?? 0),
    employerPercent: Number(row.employerPercent ?? 0),
    serviceTiers: Array.isArray(row.serviceTiers)
      ? (row.serviceTiers as unknown as ServiceTier[])
      : [],
    wageBasis: (WAGE_BASES as readonly string[]).includes(row.wageBasis)
      ? (row.wageBasis as WageBasis)
      : "fixed",
    minWage: num(row.minWage),
    maxWage: num(row.maxWage),
    effectiveFrom: day(row.effectiveFrom) ?? "2024-01-01",
    effectiveTo: day(row.effectiveTo),
    isActive: row.isActive !== false,
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
    ) as unknown as Database.InputJsonValue,
    wageBasis: input.wage_basis,
    minWage,
    maxWage,
    effectiveFrom,
    notes: input.notes?.trim().slice(0, 500) || null,
  };
}

export async function listGosiComponents() {
  const rows = await listTableRows("hr", "gosi_component", "code ASC");
  return rows.map((row) => ({
    ...toComponentRule({
      ...row,
      effectiveFrom: row.effectiveFrom ? new Date(row.effectiveFrom) : new Date(),
      effectiveTo: row.effectiveTo ? new Date(row.effectiveTo) : null,
    }),
    notes: row.notes,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
  }));
}

export async function scheduleGosiComponent(
  input: GosiComponentInput,
  actorId: string,
) {
  const data = normalizeComponent(input);
  return runAtomicMutation(async () => {
    const all = await listTableRows("hr", "gosi_component", "code ASC");
    const versions = all
      .filter((v) => v.code === data.code)
      .map((v) => ({
        ...v,
        effectiveFrom: v.effectiveFrom ? new Date(v.effectiveFrom) : new Date(),
        effectiveTo: v.effectiveTo ? new Date(v.effectiveTo) : null,
      }));
    if (
      versions.some(
        (v) => v.effectiveFrom.getTime() === data.effectiveFrom.getTime(),
      )
    )
      throw new Error(serverMessages.ratesAlreadyStartOnThatDate);
    const previous: any = versions
      .filter((v) => v.effectiveFrom < data.effectiveFrom)
      .pop();
    const next = versions.find((v) => v.effectiveFrom > data.effectiveFrom);
    if (
      previous &&
      (!previous.effectiveTo || previous.effectiveTo >= data.effectiveFrom)
    )
      await upsertTableRow("hr", "gosi_component", {
        id: previous.id,
        effectiveTo: dayBefore(data.effectiveFrom).toISOString().slice(0, 10),
      });
    return upsertTableRow("hr", "gosi_component", {
      ...data,
      effectiveFrom: data.effectiveFrom.toISOString().slice(0, 10),
      effectiveTo: next ? dayBefore(next.effectiveFrom).toISOString().slice(0, 10) : null,
      createdById: actorId,
    });
  });
}

export async function updateGosiComponent(
  id: string,
  input: Omit<GosiComponentInput, "effective_from" | "code">,
) {
  const all = await listTableRows("hr", "gosi_component");
  const existing = all.find((r) => r.id === id);
  if (!existing) throw new Error(serverMessages.contributionNotFound);
  const data = normalizeComponent({
    ...input,
    code: existing.code,
    effective_from: String(existing.effectiveFrom).slice(0, 10),
  });
  const { effectiveFrom: _from, code: _code, ...rest } = data;
  return upsertTableRow("hr", "gosi_component", { id, ...rest });
}

export async function endGosiComponent(id: string, endsOn: string) {
  const all = await listTableRows("hr", "gosi_component");
  const existing = all.find((r) => r.id === id);
  if (!existing) throw new Error(serverMessages.contributionNotFound);
  const end = dateInput(endsOn, "Choose the last day the contribution applies");
  if (!end || end < new Date(existing.effectiveFrom))
    throw new Error(serverMessages.theEndDateCannotBeBeforeTheContribution);
  return upsertTableRow("hr", "gosi_component", {
    id,
    effectiveTo: end.toISOString().slice(0, 10),
  });
}

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

type ProfileRow = any;
export function toGosiProfile(
  row: ProfileRow,
): GosiProfile & { id: string; notes: string | null } {
  const category = (INSURED_CATEGORIES as readonly string[]).includes(row.category)
    ? (row.category as InsuredCategory)
    : "expat";
  return {
    id: row.id,
    category,
    registrationNumber: row.registrationNumber ?? null,
    registeredWage: num(row.registeredWage),
    overrides: Array.isArray(row.overrides)
      ? (row.overrides as unknown as ComponentOverride[])
      : [],
    effectiveFrom: day(row.effectiveFrom) ?? "2024-01-01",
    effectiveTo: day(row.effectiveTo),
    notes: row.notes ?? null,
  };
}

export async function listEmployeeGosiRecords(employeeId: string) {
  const rows = await listTableRows("hr", "employee_gosi_record", "id DESC");
  return rows
    .filter((r) => r.employeeId === employeeId)
    .map((r) =>
      toGosiProfile({
        ...r,
        effectiveFrom: r.effectiveFrom ? new Date(r.effectiveFrom) : new Date(),
        effectiveTo: r.effectiveTo ? new Date(r.effectiveTo) : null,
      }),
    );
}

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
    const employees = await listEmployees();
    const employee = employees.find((e) => e.id === employeeId);
    if (!employee) throw new Error(serverMessages.employeeNotFound);
    const allVersions = await listTableRows("hr", "employee_gosi_record", "id ASC");
    const versions = allVersions
      .filter((v) => v.employeeId === employeeId)
      .map((v) => ({
        ...v,
        effectiveFrom: v.effectiveFrom ? new Date(v.effectiveFrom) : new Date(),
        effectiveTo: v.effectiveTo ? new Date(v.effectiveTo) : null,
      }));
    if (
      versions.some(
        (v) => v.effectiveFrom.getTime() === effectiveFrom.getTime(),
      )
    )
      throw new Error(serverMessages.aRegistrationAlreadyStartsOnThatDate);
    const previous: any = versions
      .filter((v) => v.effectiveFrom < effectiveFrom)
      .pop();
    const next = versions.find((v) => v.effectiveFrom > effectiveFrom);
    if (
      previous &&
      (!previous.effectiveTo || previous.effectiveTo >= effectiveFrom)
    )
      await upsertTableRow("hr", "employee_gosi_record", {
        id: previous.id,
        effectiveTo: dayBefore(effectiveFrom).toISOString().slice(0, 10),
      });
    return upsertTableRow("hr", "employee_gosi_record", {
      employeeId,
      category: input.category,
      registrationNumber:
        input.registration_number?.trim().slice(0, 40) || null,
      registeredWage: wage,
      overrides,
      effectiveFrom: effectiveFrom.toISOString().slice(0, 10),
      effectiveTo: next ? dayBefore(next.effectiveFrom).toISOString().slice(0, 10) : null,
      notes: input.notes?.trim().slice(0, 500) || null,
      createdById: actorId,
    });
  });
}

export async function deleteEmployeeGosiRecord(id: string) {
  const all = await listTableRows("hr", "employee_gosi_record", "id DESC");
  const record = all.find((r) => r.id === id);
  if (!record) throw new Error(serverMessages.registrationNotFound);
  return runAtomicMutation(async () => {
    await deleteTableRow("hr", "employee_gosi_record", id);
    const previous = all.find(
      (r) =>
        r.id !== id &&
        r.employeeId === record.employeeId &&
        record.effectiveFrom &&
        r.effectiveFrom &&
        new Date(r.effectiveFrom) < new Date(record.effectiveFrom),
    );
    if (previous)
      await upsertTableRow("hr", "employee_gosi_record", {
        id: previous.id,
        effectiveTo: record.effectiveTo,
      });
    return record.employeeId;
  });
}

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
  const [allEmps, existingRecords, rules] = await Promise.all([
    listEmployees(),
    listTableRows("hr", "employee_gosi_record"),
    getGosiRules(),
  ]);
  const registeredEmpIds = new Set(existingRecords.map((r) => r.employeeId));
  const employees = allEmps.filter(
    (e) => e.status !== "terminated" && !registeredEmpIds.has(e.id),
  );
  let registered = 0;
  for (const e of employees) {
    const category = (e as any).nationality
      ? rules.nationalityCategories?.[(e as any).nationality] ?? rules.nationalityCategories?.["*"]
      : undefined;
    if (category) {
      await upsertTableRow("hr", "employee_gosi_record", {
        employeeId: e.id,
        category,
        effectiveFrom: effectiveFrom.toISOString().slice(0, 10),
        createdById: actorId,
      });
      registered++;
    }
  }
  return { registered, skipped: employees.length - registered };
}

export interface GosiContext {
  rules: GosiRules;
  components: GosiComponentRule[];
  profiles: Map<string, Array<GosiProfile & { id: string }>>;
}

export async function loadGosiContext(
  employeeIds: string[],
): Promise<GosiContext> {
  const empSet = new Set(employeeIds);
  const [rules, components, allRecords] = await Promise.all([
    getGosiRules(),
    listTableRows("hr", "gosi_component"),
    listTableRows("hr", "employee_gosi_record"),
  ]);
  const records = allRecords.filter((r) => empSet.has(r.employeeId));
  const profiles = new Map<string, Array<GosiProfile & { id: string }>>();
  for (const row of records) {
    const list = profiles.get(row.employeeId) ?? [];
    list.push(
      toGosiProfile({
        ...row,
        effectiveFrom: new Date(row.effectiveFrom),
        effectiveTo: row.effectiveTo ? new Date(row.effectiveTo) : null,
      }),
    );
    profiles.set(row.employeeId, list);
  }
  return { rules, components: components.map(toComponentRule), profiles };
}

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

export async function previewEmployeeContributions(
  employeeId: string,
  months: string[],
) {
  const employee = await getEmployeeRelations(employeeId);
  const empRecords = (employee as any).employmentRecords ?? [];
  const record = empRecords.find((r: any) => r.isCurrent) ?? empRecords[0];
  if (!record) return [];
  const pay = {
    basic: Number(record.basicSalary ?? employee.basicSalary ?? 0),
    housing: Number(record.housingAllowance ?? employee.housingAllowance ?? 0),
    transport: Number(record.transportAllowance ?? employee.transportAllowance ?? 0),
    other: Number(record.otherAllowances ?? employee.otherAllowances ?? 0),
  };
  const ctx = await loadGosiContext([employeeId]);
  return months.map((m) => {
    const [year, month] = m.split("-").map(Number);
    const result = schemeContributions(ctx, employeeId, {
      pay,
      hireDate: new Date(employee.hireDate),
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

export async function listGosiRegistrations() {
  const [allEmps, gosiRecords, empRecords] = await Promise.all([
    listEmployees(),
    listTableRows("hr", "employee_gosi_record", "id DESC"),
    listTableRows("system", "employment_record").catch(() => []),
  ]);
  const gosiByEmp = new Map<string, any[]>();
  for (const r of gosiRecords) {
    const arr = gosiByEmp.get(r.employeeId) ?? [];
    arr.push(r);
    gosiByEmp.set(r.employeeId, arr);
  }
  const compByEmp = new Map<string, any>();
  for (const r of empRecords) {
    if (r.isCurrent || !compByEmp.has(r.employeeId)) compByEmp.set(r.employeeId, r);
  }
  const employees = allEmps
    .filter((e) => e.status !== "terminated")
    .map((e) => ({
      ...e,
      hireDate: new Date(e.hireDate),
      gosiRecords: gosiByEmp.get(e.id) ?? [],
      employmentRecords: compByEmp.has(e.id) ? [compByEmp.get(e.id)] : [],
    }))
    .sort((a, b) => `${a.firstNameEn} ${a.lastNameEn}`.localeCompare(`${b.firstNameEn} ${b.lastNameEn}`));
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
      nationality: (e as any).nationality ?? null,
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
