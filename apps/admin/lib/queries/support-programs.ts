import { serverMessages } from "@platform/locales";
import { runAtomicMutation } from "../api/atomic";
import { listEmployees } from "../api/hr";
import { deleteTableRow, listTableRows, upsertTableRow } from "../api/tables";
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
  const v = Math.round(Number(value) * 1_000_000) / 1_000_000;
  if (!Number.isFinite(v) || v < 0)
    throw new Error(serverMessages.enterAmountsOfZeroOrMore);
  return v;
};

type RuleRow = any;
export function toSupportRule(
  row: RuleRow,
): SupportRule & { id: string; notes: string | null } {
  return {
    id: row.id,
    effectiveFrom: String(row.effectiveFrom).slice(0, 10),
    effectiveTo: row.effectiveTo ? String(row.effectiveTo).slice(0, 10) : null,
    wageBasis: row.wageBasis as WageBasis,
    schedule: Array.isArray(row.schedule)
      ? (row.schedule as unknown as SupportRule["schedule"])
      : [],
    wageCap: num(row.wageCap),
    monthlyCap: num(row.monthlyCap),
    qualificationCaps: Array.isArray(row.qualificationCaps)
      ? (row.qualificationCaps as unknown as SupportRule["qualificationCaps"])
      : [],
    notes: row.notes ?? null,
  };
}

export async function listSupportPrograms() {
  const [programs, rules, enrolments] = await Promise.all([
    listTableRows("itsm", "support_program", "created_at ASC"),
    listTableRows("itsm", "support_program_rule", "effective_from DESC"),
    listTableRows("hr", "employee_support"),
  ]);
  const rulesByProgram = new Map<string, any[]>();
  for (const r of rules) {
    const arr = rulesByProgram.get(r.programId) ?? [];
    arr.push(r);
    rulesByProgram.set(r.programId, arr);
  }
  const countByProgram = new Map<string, number>();
  for (const e of enrolments) {
    countByProgram.set(e.programId, (countByProgram.get(e.programId) ?? 0) + 1);
  }
  return programs.map((p) => ({
    id: p.id,
    code: p.code,
    nameEn: p.nameEn,
    nameAr: p.nameAr,
    provider: p.provider,
    claimPeriodMonths: p.claimPeriodMonths,
    prorate: p.prorate,
    isActive: p.isActive,
    notes: p.notes ?? null,
    enrolments: countByProgram.get(p.id) ?? 0,
    rules: (rulesByProgram.get(p.id) ?? []).map(toSupportRule),
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
    throw new Error(serverMessages.enterTheProgrammeNameInBothLanguages);
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
  if (id) return upsertTableRow("itsm", "support_program", { id, ...data });
  const code =
    (input.code?.trim().toLowerCase() || nameEn.toLowerCase())
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "programme";
  const existing = await listTableRows("itsm", "support_program");
  if (existing.some((p) => p.code === code))
    throw new Error(serverMessages.aProgrammeWithThatCodeAlreadyExists);
  return upsertTableRow("itsm", "support_program", { ...data, code });
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

export async function scheduleSupportRule(
  programId: string,
  input: SupportRuleInput,
  actorId: string,
) {
  const effectiveFrom = dateInput(
    input.effective_from,
    "Choose the date the terms take effect",
  );
  if (!effectiveFrom)
    throw new Error(serverMessages.chooseTheDateTheTermsTakeEffect);
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
    throw new Error(serverMessages.giveEachYearOfSupport);
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
    const programs = await listTableRows("itsm", "support_program");
    if (!programs.some((p) => p.id === programId))
      throw new Error(serverMessages.programmeNotFound);
    const allVersions = await listTableRows("itsm", "support_program_rule", "effective_from ASC");
    const versions = allVersions
      .filter((v) => v.programId === programId)
      .map((v) => ({
        ...v,
        effectiveFrom: new Date(v.effectiveFrom),
        effectiveTo: v.effectiveTo ? new Date(v.effectiveTo) : null,
      }));
    if (
      versions.some(
        (v) => v.effectiveFrom.getTime() === effectiveFrom.getTime(),
      )
    )
      throw new Error(serverMessages.termsAlreadyStartOnThatDate);
    const previous: any = versions
      .filter((v) => v.effectiveFrom < effectiveFrom)
      .pop();
    const next = versions.find((v) => v.effectiveFrom > effectiveFrom);
    if (
      previous &&
      (!previous.effectiveTo || previous.effectiveTo >= effectiveFrom)
    )
      await upsertTableRow("itsm", "support_program_rule", {
        id: previous.id,
        effectiveTo: dayBefore(effectiveFrom).toISOString().slice(0, 10),
      });
    return upsertTableRow("itsm", "support_program_rule", {
      programId,
      effectiveFrom: effectiveFrom.toISOString().slice(0, 10),
      effectiveTo: next ? dayBefore(next.effectiveFrom).toISOString().slice(0, 10) : null,
      wageBasis: input.wage_basis,
      schedule: schedule.sort((a, b) => a.year - b.year),
      wageCap: money(input.wage_cap),
      monthlyCap: money(input.monthly_cap),
      qualificationCaps: caps,
      notes: input.notes?.trim().slice(0, 500) || null,
      createdById: actorId,
    });
  });
}

export async function deleteSupportRule(id: string) {
  const all = await listTableRows("itsm", "support_program_rule", "effective_from DESC");
  const rule = all.find((r) => r.id === id);
  if (!rule) throw new Error(serverMessages.termsNotFound);
  return runAtomicMutation(async () => {
    await deleteTableRow("itsm", "support_program_rule", id);
    const previous = all.find(
      (r) =>
        r.id !== id &&
        r.programId === rule.programId &&
        new Date(r.effectiveFrom) < new Date(rule.effectiveFrom),
    );
    if (previous)
      await upsertTableRow("itsm", "support_program_rule", {
        id: previous.id,
        effectiveTo: rule.effectiveTo,
      });
  });
}

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

type EnrolmentRow = Record<string, any>;

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
      createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : new Date(e.createdAt || Date.now()).toISOString(),
    })),
  };
}
export type EmployeeSupportRecord = ReturnType<typeof mapEnrolment>;

export async function listEmployeeSupports(
  filters: { employeeId?: string; programId?: string; status?: string } = {},
) {
  const [enrolments, employees, programs, events] = await Promise.all([
    listTableRows("hr", "employee_support", "start_month DESC, created_at DESC"),
    listEmployees(),
    listTableRows("itsm", "support_program"),
    listTableRows("hr", "employee_support_event", "created_at DESC"),
  ]);
  const empById = new Map(employees.map((e) => [e.id, e]));
  const progById = new Map(programs.map((p) => [p.id, p]));
  const eventsBySupport = new Map<string, any[]>();
  for (const ev of events) {
    const arr = eventsBySupport.get(ev.supportId) ?? [];
    arr.push(ev);
    eventsBySupport.set(ev.supportId, arr);
  }
  return enrolments
    .filter((r) => {
      if (filters.employeeId && r.employeeId !== filters.employeeId) return false;
      if (filters.programId && r.programId !== filters.programId) return false;
      if (filters.status && filters.status !== "all" && r.status !== filters.status) return false;
      return true;
    })
    .slice(0, 500)
    .map((r) =>
      mapEnrolment({
        ...r,
        appliedOn: r.appliedOn ? new Date(r.appliedOn) : null,
        decidedOn: r.decidedOn ? new Date(r.decidedOn) : null,
        employee: empById.get(r.employeeId) ?? {
          id: r.employeeId,
          employeeNumber: "",
          firstNameEn: "",
          lastNameEn: "",
          firstNameAr: "",
          lastNameAr: "",
          hireDate: new Date(),
        },
        program: progById.get(r.programId) ?? { id: r.programId, code: "", nameEn: "", nameAr: "", provider: "" },
        events: eventsBySupport.get(r.id) ?? [],
      }),
    );
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
    throw new Error(serverMessages.forAPartialApprovalEnterTheApproved);
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

export async function saveEmployeeSupport(
  input: EmployeeSupportInput,
  actorId: string,
  id?: string,
) {
  const data = normalizeEnrolment(input);
  return runAtomicMutation(async () => {
    const programs = await listTableRows("itsm", "support_program");
    if (!programs.some((p) => p.id === input.program_id))
      throw new Error(serverMessages.programmeNotFound);
    if (id) {
      const all = await listTableRows("hr", "employee_support");
      const before = all.find((r) => r.id === id);
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
      if (!Object.keys(changes).length)
        throw new Error(serverMessages.nothingChanged);
      const updated = await upsertTableRow("hr", "employee_support", {
        id,
        ...data,
        appliedOn: data.appliedOn ? data.appliedOn.toISOString().slice(0, 10) : null,
        decidedOn: data.decidedOn ? data.decidedOn.toISOString().slice(0, 10) : null,
      });
      await upsertTableRow("hr", "employee_support_event", {
        supportId: id,
        action: changes.status ? `status_${data.status}` : "updated",
        details: JSON.parse(JSON.stringify(changes)),
        actorId,
      });
      return updated;
    }
    const employees = await listEmployees();
    if (!employees.some((e) => e.id === input.employee_id))
      throw new Error(serverMessages.employeeNotFound);
    const created = await upsertTableRow("hr", "employee_support", {
      ...data,
      appliedOn: data.appliedOn ? data.appliedOn.toISOString().slice(0, 10) : null,
      decidedOn: data.decidedOn ? data.decidedOn.toISOString().slice(0, 10) : null,
      employeeId: input.employee_id,
      programId: input.program_id,
      createdById: actorId,
    });
    await upsertTableRow("hr", "employee_support_event", {
      supportId: created.id,
      action: "created",
      details: { status: data.status, startMonth: data.startMonth },
      actorId,
    });
    return created;
  });
}

export async function deleteEmployeeSupport(id: string) {
  const all = await listTableRows("hr", "employee_support");
  const row = all.find((r) => r.id === id);
  if (!row) throw new Error(serverMessages.supportRecordNotFound);
  if (["approved", "partially_approved"].includes(row.status))
    throw new Error(serverMessages.endOrSuspendApprovedSupport);
  await deleteTableRow("hr", "employee_support", id);
  return row.employeeId;
}

export type SupportContext = Map<
  string,
  Array<{ enrolment: SupportEnrolment; rules: SupportRule[] }>
>;

export async function loadSupportContext(
  employeeIds: string[],
): Promise<SupportContext> {
  const empSet = new Set(employeeIds);
  const [allEnrolments, programs, rules] = await Promise.all([
    listTableRows("hr", "employee_support"),
    listTableRows("itsm", "support_program"),
    listTableRows("itsm", "support_program_rule"),
  ]);
  const progById = new Map(programs.map((p) => [p.id, p]));
  const rulesByProgram = new Map<string, any[]>();
  for (const r of rules) {
    const arr = rulesByProgram.get(r.programId) ?? [];
    arr.push(r);
    rulesByProgram.set(r.programId, arr);
  }
  const map: SupportContext = new Map();
  for (const row of allEnrolments.filter((r) => empSet.has(r.employeeId))) {
    const program = progById.get(row.programId) ?? { code: "", claimPeriodMonths: 6, provider: "", nameEn: "" };
    const list = map.get(row.employeeId) ?? [];
    list.push({
      enrolment: {
        id: row.id,
        programCode: program.code,
        claimPeriodMonths: program.claimPeriodMonths,
        provider: program.provider,
        nameEn: program.nameEn,
        nameAr: program.nameAr ?? "",
        prorate: Boolean(program.prorate),
        status: row.status,
        qualification: row.qualification,
        startMonth: row.startMonth,
        endMonth: row.endMonth,
        approvedPercent: num(row.approvedPercent),
        approvedAmount: num(row.approvedAmount),
        monthlyCap: num(row.monthlyCap),
      },
      rules: program.isActive ? (rulesByProgram.get(row.programId) ?? []).map(toSupportRule) : [],
    });
    map.set(row.employeeId, list);
  }
  return map;
}

export function supportLinesFor(
  ctx: SupportContext,
  employeeId: string,
  pay: PayParts,
  month: string,
  paidShare: number,
  currency?: string,
): SupportLine[] | null {
  const list = ctx.get(employeeId);
  if (!list?.length) return null;
  return list
    .map(({ enrolment, rules }) =>
      supportForMonth(enrolment, rules, pay, month, paidShare, currency),
    )
    .filter((l): l is SupportLine => l !== null);
}
