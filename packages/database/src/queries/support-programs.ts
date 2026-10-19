import { serverMessages } from "@ishoot/locales";
import type { Prisma } from "@prisma/client";
import { db, runAtomicMutation } from "../db";
import {
  QUALIFICATIONS,
  SUPPORT_STATUSES,
  WAGE_BASES,
  supportForMonth,
  type PayParts,
  type SupportEnrolment,
  type SupportLine,
  type SupportRule,
  type WageBasis,
} from "../hr/social-insurance";

const day = (value: Date | null | undefined) =>
  value ? value.toISOString().slice(0, 10) : null;
const num = (value: unknown) => (value == null ? null : Number(value));
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const dateInput = (value: string | null | undefined, label: string) => {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)))
    throw new Error(label);
  const date = new Date(`${value}T00:00:00Z`);
  if (date.toISOString().slice(0, 10) !== value) throw new Error(label);
  return date;
};
const dayBefore = (value: Date) => new Date(value.getTime() - 86_400_000);
const money = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) return null;
  const v = Math.round(Number(value) * 1000) / 1000;
  if (!Number.isFinite(v) || v < 0)
    throw new Error(serverMessages.enterAmountsOfZeroOrMore);
  return v;
};

type RuleRow = Awaited<
  ReturnType<typeof db.supportProgramRule.findMany>
>[number];
export function toSupportRule(
  row: RuleRow,
): SupportRule & { id: string; notes: string | null } {
  return {
    id: row.id,
    effectiveFrom: day(row.effectiveFrom)!,
    effectiveTo: day(row.effectiveTo),
    wageBasis: row.wageBasis as WageBasis,
    schedule: Array.isArray(row.schedule)
      ? (row.schedule as unknown as SupportRule["schedule"])
      : [],
    wageCap: num(row.wageCap),
    monthlyCap: num(row.monthlyCap),
    qualificationCaps: Array.isArray(row.qualificationCaps)
      ? (row.qualificationCaps as unknown as SupportRule["qualificationCaps"])
      : [],
    notes: row.notes,
  };
}

// ---------- Programmes and their dated terms ----------

export async function listSupportPrograms() {
  const programs = await db.supportProgram.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      rules: { orderBy: { effectiveFrom: "desc" } },
      _count: { select: { enrolments: true } },
    },
  });
  return programs.map((p) => ({
    id: p.id,
    code: p.code,
    nameEn: p.nameEn,
    nameAr: p.nameAr,
    provider: p.provider,
    claimPeriodMonths: p.claimPeriodMonths,
    prorate: p.prorate,
    isActive: p.isActive,
    notes: p.notes,
    enrolments: p._count.enrolments,
    rules: p.rules.map(toSupportRule),
  }));
}

export interface SupportProgramInput {
  code?: string;
  name_en: string;
  name_ar: string;
  provider: string;
  claim_period_months: number;
  prorate: boolean;
  is_active: boolean;
  notes?: string | null;
}

export async function saveSupportProgram(
  input: SupportProgramInput,
  id?: string,
) {
  const nameEn = input.name_en?.trim().slice(0, 120);
  const nameAr = input.name_ar?.trim().slice(0, 120);
  const provider = input.provider?.trim().slice(0, 80);
  if (!nameEn || !nameAr || !provider)
    throw new Error(
      serverMessages.enterTheProgrammeNameInBothLanguages,
    );
  const months = Math.round(Number(input.claim_period_months));
  if (!(months >= 1 && months <= 24))
    throw new Error(serverMessages.claimsCover1To24Months);
  const data = {
    nameEn,
    nameAr,
    provider,
    claimPeriodMonths: months,
    prorate: !!input.prorate,
    isActive: !!input.is_active,
    notes: input.notes?.trim().slice(0, 500) || null,
  };
  if (id) return db.supportProgram.update({ where: { id }, data });
  const code =
    (input.code?.trim().toLowerCase() || nameEn.toLowerCase())
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "programme";
  if (
    await db.supportProgram.findUnique({
      where: { code },
      select: { id: true },
    })
  )
    throw new Error(serverMessages.aProgrammeWithThatCodeAlreadyExists);
  return db.supportProgram.create({ data: { ...data, code } });
}

export interface SupportRuleInput {
  effective_from: string;
  wage_basis: string;
  schedule: Array<{ year: number; percent: number }>;
  wage_cap?: number | null;
  monthly_cap?: number | null;
  qualification_caps: Array<{ qualification: string; cap: number }>;
  notes?: string | null;
}

/** New terms for a programme from a date; the terms in force until then end the day before. */
export async function scheduleSupportRule(
  programId: string,
  input: SupportRuleInput,
  actorId: string,
) {
  const effectiveFrom = dateInput(
    input.effective_from,
    "Choose the date the terms take effect",
  );
  if (!effectiveFrom) throw new Error(serverMessages.chooseTheDateTheTermsTakeEffect);
  if (!(WAGE_BASES as readonly string[]).includes(input.wage_basis))
    throw new Error(serverMessages.chooseTheWageTheSupportIsWorkedOut);
  const schedule = (input.schedule ?? []).map((s) => ({
    year: Math.round(Number(s.year)),
    percent: Math.round(Number(s.percent) * 100) / 100,
  }));
  if (
    !schedule.length ||
    schedule.some(
      (s) =>
        !(s.year >= 1 && s.year <= 10) || !(s.percent >= 0 && s.percent <= 100),
    ) ||
    new Set(schedule.map((s) => s.year)).size !== schedule.length
  )
    throw new Error(
      serverMessages.giveEachYearOfSupport,
    );
  const caps = (input.qualification_caps ?? []).map((q) => ({
    qualification: q.qualification,
    cap: money(q.cap) ?? 0,
  }));
  if (
    caps.some(
      (q) => !(QUALIFICATIONS as readonly string[]).includes(q.qualification),
    ) ||
    new Set(caps.map((q) => q.qualification)).size !== caps.length
  )
    throw new Error(serverMessages.eachQualificationCanHaveOneCap);
  return runAtomicMutation(async () => {
    const program = await db.supportProgram.findUnique({
      where: { id: programId },
      select: { id: true },
    });
    if (!program) throw new Error(serverMessages.programmeNotFound);
    const versions = await db.supportProgramRule.findMany({
      where: { programId },
      orderBy: { effectiveFrom: "asc" },
    });
    if (
      versions.some(
        (v) => v.effectiveFrom.getTime() === effectiveFrom.getTime(),
      )
    )
      throw new Error(serverMessages.termsAlreadyStartOnThatDate);
    const previous = versions
      .filter((v) => v.effectiveFrom < effectiveFrom)
      .pop();
    const next = versions.find((v) => v.effectiveFrom > effectiveFrom);
    if (
      previous &&
      (!previous.effectiveTo || previous.effectiveTo >= effectiveFrom)
    )
      await db.supportProgramRule.update({
        where: { id: previous.id },
        data: { effectiveTo: dayBefore(effectiveFrom) },
      });
    return db.supportProgramRule.create({
      data: {
        programId,
        effectiveFrom,
        effectiveTo: next ? dayBefore(next.effectiveFrom) : null,
        wageBasis: input.wage_basis,
        schedule: schedule.sort(
          (a, b) => a.year - b.year,
        ) as unknown as Prisma.InputJsonValue,
        wageCap: money(input.wage_cap),
        monthlyCap: money(input.monthly_cap),
        qualificationCaps: caps as unknown as Prisma.InputJsonValue,
        notes: input.notes?.trim().slice(0, 500) || null,
        createdById: actorId,
      },
    });
  });
}

export async function deleteSupportRule(id: string) {
  const rule = await db.supportProgramRule.findUnique({ where: { id } });
  if (!rule) throw new Error(serverMessages.termsNotFound);
  return runAtomicMutation(async () => {
    await db.supportProgramRule.delete({ where: { id } });
    const previous = await db.supportProgramRule.findFirst({
      where: {
        programId: rule.programId,
        effectiveFrom: { lt: rule.effectiveFrom },
      },
      orderBy: { effectiveFrom: "desc" },
    });
    if (previous)
      await db.supportProgramRule.update({
        where: { id: previous.id },
        data: { effectiveTo: rule.effectiveTo },
      });
  });
}

// ---------- Employee enrolments ----------

export interface EmployeeSupportInput {
  employee_id: string;
  program_id: string;
  status: string;
  qualification?: string | null;
  application_ref?: string | null;
  applied_on?: string | null;
  decided_on?: string | null;
  start_month: string;
  end_month?: string | null;
  approved_percent?: number | null;
  approved_amount?: number | null;
  monthly_cap?: number | null;
  notes?: string | null;
}

const enrolmentInclude = {
  program: {
    select: {
      id: true,
      code: true,
      nameEn: true,
      nameAr: true,
      provider: true,
      prorate: true,
    },
  },
  employee: {
    select: {
      id: true,
      employeeNumber: true,
      firstNameEn: true,
      lastNameEn: true,
      firstNameAr: true,
      lastNameAr: true,
    },
  },
  events: { orderBy: { createdAt: "desc" as const }, take: 30 },
} satisfies Prisma.EmployeeSupportInclude;
type EnrolmentRow = Prisma.EmployeeSupportGetPayload<{
  include: typeof enrolmentInclude;
}>;

function mapEnrolment(row: EnrolmentRow) {
  return {
    id: row.id,
    employee: {
      id: row.employee.id,
      number: row.employee.employeeNumber,
      nameEn: `${row.employee.firstNameEn} ${row.employee.lastNameEn}`,
      nameAr: `${row.employee.firstNameAr} ${row.employee.lastNameAr}`,
    },
    program: row.program,
    status: row.status,
    qualification: row.qualification,
    applicationRef: row.applicationRef,
    appliedOn: day(row.appliedOn),
    decidedOn: day(row.decidedOn),
    startMonth: row.startMonth,
    endMonth: row.endMonth,
    approvedPercent: num(row.approvedPercent),
    approvedAmount: num(row.approvedAmount),
    monthlyCap: num(row.monthlyCap),
    notes: row.notes,
    events: row.events.map((e) => ({
      id: e.id,
      action: e.action,
      details: e.details as Record<string, unknown> | null,
      actorId: e.actorId,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}
export type EmployeeSupportRecord = ReturnType<typeof mapEnrolment>;

export async function listEmployeeSupports(
  filters: { employeeId?: string; programId?: string; status?: string } = {},
) {
  const rows = await db.employeeSupport.findMany({
    where: {
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters.programId ? { programId: filters.programId } : {}),
      ...(filters.status && filters.status !== "all"
        ? { status: filters.status }
        : {}),
    },
    include: enrolmentInclude,
    orderBy: [{ startMonth: "desc" }, { createdAt: "desc" }],
    take: 500,
  });
  return rows.map(mapEnrolment);
}

function normalizeEnrolment(input: EmployeeSupportInput) {
  if (!(SUPPORT_STATUSES as readonly string[]).includes(input.status))
    throw new Error(serverMessages.chooseTheApplicationStatus);
  if (!MONTH.test(input.start_month ?? ""))
    throw new Error(serverMessages.chooseTheFirstSupportedMonth);
  if (
    input.end_month &&
    (!MONTH.test(input.end_month) || input.end_month < input.start_month)
  )
    throw new Error(serverMessages.theLastSupportedMonthCannotBeBefore);
  if (
    input.qualification &&
    !(QUALIFICATIONS as readonly string[]).includes(input.qualification)
  )
    throw new Error(serverMessages.chooseTheEmployeesQualification);
  const approvedPercent =
    input.approved_percent == null || Number.isNaN(input.approved_percent)
      ? null
      : Math.round(Number(input.approved_percent) * 100) / 100;
  if (
    approvedPercent != null &&
    !(approvedPercent >= 0 && approvedPercent <= 100)
  )
    throw new Error(serverMessages.theApprovedShareMustBeBetween);
  const approvedAmount = money(input.approved_amount);
  if (
    input.status === "partially_approved" &&
    approvedPercent == null &&
    approvedAmount == null
  )
    throw new Error(
      serverMessages.forAPartialApprovalEnterTheApproved,
    );
  return {
    status: input.status,
    qualification: input.qualification || null,
    applicationRef: input.application_ref?.trim().slice(0, 60) || null,
    appliedOn: dateInput(input.applied_on, "Invalid date"),
    decidedOn: dateInput(input.decided_on, "Invalid date"),
    startMonth: input.start_month,
    endMonth: input.end_month || null,
    approvedPercent,
    approvedAmount,
    monthlyCap: money(input.monthly_cap),
    notes: input.notes?.trim().slice(0, 1000) || null,
  };
}

/** Records an application to a programme or changes it; every change is kept in the enrolment's history. */
export async function saveEmployeeSupport(
  input: EmployeeSupportInput,
  actorId: string,
  id?: string,
) {
  const data = normalizeEnrolment(input);
  return runAtomicMutation(async () => {
    const program = await db.supportProgram.findUnique({
      where: { id: input.program_id },
      select: { id: true },
    });
    if (!program) throw new Error(serverMessages.programmeNotFound);
    if (id) {
      const before = await db.employeeSupport.findUnique({ where: { id } });
      if (!before) throw new Error(serverMessages.supportRecordNotFound);
      const changes = Object.fromEntries(
        Object.entries(data)
          .filter(([key, value]) => {
            const old = (before as unknown as Record<string, unknown>)[key];
            const normal = (v: unknown) =>
              v instanceof Date
                ? day(v)
                : v != null && typeof v === "object"
                  ? Number(v)
                  : v;
            return normal(old) !== normal(value);
          })
          .map(([key, value]) => [
            key,
            {
              from: (before as unknown as Record<string, unknown>)[key] ?? null,
              to: value,
            },
          ]),
      );
      if (!Object.keys(changes).length) throw new Error(serverMessages.nothingChanged);
      const updated = await db.employeeSupport.update({ where: { id }, data });
      await db.employeeSupportEvent.create({
        data: {
          supportId: id,
          action: changes.status ? `status_${data.status}` : "updated",
          details: JSON.parse(JSON.stringify(changes)),
          actorId,
        },
      });
      return updated;
    }
    const employee = await db.employee.findUnique({
      where: { id: input.employee_id },
      select: { id: true },
    });
    if (!employee) throw new Error(serverMessages.employeeNotFound);
    const created = await db.employeeSupport.create({
      data: {
        ...data,
        employeeId: input.employee_id,
        programId: input.program_id,
        createdById: actorId,
      },
    });
    await db.employeeSupportEvent.create({
      data: {
        supportId: created.id,
        action: "created",
        details: { status: data.status, startMonth: data.startMonth },
        actorId,
      },
    });
    return created;
  });
}

export async function deleteEmployeeSupport(id: string) {
  const row = await db.employeeSupport.findUnique({
    where: { id },
    select: { employeeId: true, status: true },
  });
  if (!row) throw new Error(serverMessages.supportRecordNotFound);
  if (["approved", "partially_approved"].includes(row.status))
    throw new Error(serverMessages.endOrSuspendApprovedSupport);
  await db.employeeSupport.delete({ where: { id } });
  return row.employeeId;
}

// ---------- For payroll ----------

export type SupportContext = Map<
  string,
  Array<{ enrolment: SupportEnrolment; rules: SupportRule[] }>
>;

export async function loadSupportContext(
  employeeIds: string[],
): Promise<SupportContext> {
  const rows = await db.employeeSupport.findMany({
    where: { employeeId: { in: employeeIds } },
    include: { program: { include: { rules: true } } },
  });
  const map: SupportContext = new Map();
  for (const row of rows) {
    const list = map.get(row.employeeId) ?? [];
    list.push({
      enrolment: {
        id: row.id,
        programCode: row.program.code,
        claimPeriodMonths: row.program.claimPeriodMonths,
        provider: row.program.provider,
        nameEn: row.program.nameEn,
        nameAr: row.program.nameAr,
        prorate: row.program.prorate,
        status: row.status,
        qualification: row.qualification,
        startMonth: row.startMonth,
        endMonth: row.endMonth,
        approvedPercent: num(row.approvedPercent),
        approvedAmount: num(row.approvedAmount),
        monthlyCap: num(row.monthlyCap),
      },
      rules: row.program.isActive ? row.program.rules.map(toSupportRule) : [],
    });
    map.set(row.employeeId, list);
  }
  return map;
}

/** Support lines for one employee's month; `null` when the employee has no enrolments (legacy settings apply). */
export function supportLinesFor(
  ctx: SupportContext,
  employeeId: string,
  pay: PayParts,
  month: string,
  paidShare: number,
): SupportLine[] | null {
  const list = ctx.get(employeeId);
  if (!list?.length) return null;
  return list
    .map(({ enrolment, rules }) =>
      supportForMonth(enrolment, rules, pay, month, paidShare),
    )
    .filter((l): l is SupportLine => l !== null);
}
