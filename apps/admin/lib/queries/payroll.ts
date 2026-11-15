import { assertCompanyCurrency } from "../finance/company-currency";
import { roundMoney } from "../finance/money";
import {
  serverTemplates,
  formatMessage,
  serverMessages,
} from "@platform/locales";

import {
  calculateContributions,
  parsePayrollSettings,
} from "../payroll-calculation";
import { MAX_PAY_LINES, PAY_LINE_CATEGORIES } from "../constants/hr";
import { runAtomicMutation } from "../api/atomic";
import {
  deleteTableRow,
  listTableRows,
  upsertTableRow,
} from "../api/tables";
import { PayrollRun } from "../types";
import { submitForApproval } from "../services/approval-engine";
import { assertActorNotOnLeave } from "./leave";
import { getHrPolicy, holidaySet, toLeaveTypeRules } from "./hr-settings";
import { attendanceForPayroll } from "./attendance";
import { commissionAmount, commissionsForRange } from "./sales-attribution";
import {
  loadGosiContext,
  schemeContributions,
  type GosiContext,
} from "./social-insurance";
import {
  loadSupportContext,
  supportLinesFor,
  type SupportContext,
} from "./support-programs";
import {
  computeEmployeePayroll,
  dayKey,
  payrollTotals,
  payrollWindow,
  r3,
  utcDay,
  type DayPortion,
  type HrPolicyRules,
  type LeaveInWindow,
  type PayrollBreakdown,
  type PayrollWindow,
} from "../hr/payroll-engine";
import type { EmployeePayrollSettings } from "../types";

const DECIMAL_FIELDS = [
  "basicSalary",
  "housingAllowance",
  "transportAllowance",
  "otherAllowances",
  "grossSalary",
  "gosiEmployee",
  "gosiEmployer",
  "externalSupport",
  "otherDeductions",
  "bonus",
  "overtimePay",
  "shiftAllowance",
  "commission",
  "absenceDeduction",
  "leaveDeduction",
  "latenessDeduction",
  "netSalary",
] as const;

const toIso = (v: any): string =>
  v instanceof Date ? v.toISOString() : v ? String(v) : new Date().toISOString();

const toIsoOrNull = (v: any): string | null =>
  v ? (v instanceof Date ? v.toISOString() : String(v)) : null;

function mapPayrollItem(it: any) {
  const out = { ...it };
  for (const field of DECIMAL_FIELDS) out[field] = Number(it[field] ?? 0);
  out.createdAt = toIso(it.createdAt);
  out.editedAt = toIsoOrNull(it.editedAt);
  out.paidAt = toIsoOrNull(it.paidAt);
  delete out.commissionPayout;
  delete out.lines;
  return out;
}

function mapRun(run: any): PayrollRun {
  return {
    ...run,
    totalGross: Number(run.totalGross ?? 0),
    totalDeductions: Number(run.totalDeductions ?? 0),
    totalNet: Number(run.totalNet ?? 0),
    totalEmployerCost: Number(run.totalEmployerCost ?? 0),
    periodStart: toIso(run.periodStart),
    periodEnd: toIso(run.periodEnd),
    attendanceStart: toIsoOrNull(run.attendanceStart),
    attendanceEnd: toIsoOrNull(run.attendanceEnd),
    payDate: toIsoOrNull(run.payDate),
    createdAt: toIso(run.createdAt),
    updatedAt: toIso(run.updatedAt),
    approvedAt: toIsoOrNull(run.approvedAt) || null,
    paidAt: toIsoOrNull(run.paidAt) || null,
    items: (run.items ?? []).map(mapPayrollItem),
  };
}

async function hydrateRuns(runs: any[]) {
  if (!runs.length) return [];
  const [items, employees] = await Promise.all([
    listTableRows<any>("hr", "payroll_item"),
    listTableRows<any>("hr", "employee"),
  ]);
  const empMap = new Map<string, any>(
    employees.map((e) => [
      e.id,
      {
        id: e.id,
        employeeNumber: e.employeeNumber,
        firstNameEn: e.firstNameEn,
        lastNameEn: e.lastNameEn,
        firstNameAr: e.firstNameAr,
        lastNameAr: e.lastNameAr,
      },
    ]),
  );
  return runs.map((run) => ({
    ...run,
    items: items
      .filter((i) => i.payrollRunId === run.id)
      .map((i) => ({ ...i, employee: empMap.get(i.employeeId) ?? null })),
  }));
}

async function hydrateRunById(runId: string) {
  const runs = await listTableRows<any>("hr", "payroll_run");
  const run = runs.find((r) => r.id === runId);
  if (!run) throw new Error(serverMessages.payrollRunNotFound);
  const [hydrated] = await hydrateRuns([run]);
  return hydrated;
}

export interface PayrollLineInput {
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowances: number;
  bonus?: number;
  otherDeductions?: number;
}

export function computePayrollLine(
  input: PayrollLineInput,
  settings: EmployeePayrollSettings | null,
  month: string,
) {
  for (const [key, value] of Object.entries(input))
    if (value !== undefined && !(Number.isFinite(value) && value >= 0))
      throw new Error(
        formatMessage(serverTemplates["0MustBeZeroOrMore"], { 0: key }),
      );
  const fixed = r3(
    input.basicSalary +
      input.housingAllowance +
      input.transportAllowance +
      input.otherAllowances,
  );
  const calculated = calculateContributions(fixed, settings, month);
  const totals = payrollTotals(
    {
      fixedPay: fixed,
      overtimePay: 0,
      shiftAllowance: 0,
      commission: 0,
      bonus: r3(input.bonus ?? 0),
      absenceDeduction: 0,
      leaveDeduction: 0,
      latenessDeduction: 0,
      otherDeductions: r3(input.otherDeductions ?? 0),
    },
    calculated.employee,
  );
  return {
    grossSalary: totals.gross,
    gosiEmployee: calculated.employee,
    gosiEmployer: calculated.employer,
    externalSupport: calculated.support,
    netSalary: totals.net,
    employerCost: r3(totals.gross + calculated.employer - calculated.support),
    deductions: totals.deductions,
  };
}

const roundIntermediate = (value: number) => Math.round(value * 1_000_000) / 1_000_000;

async function refreshPayrollTotals(runId: string) {
  const [runs, allItems] = await Promise.all([
    listTableRows<any>("hr", "payroll_run"),
    listTableRows<any>("hr", "payroll_item"),
  ]);
  const run = runs.find((r) => r.id === runId);
  if (!run) return;
  const items = allItems.filter((i) => i.payrollRunId === runId);
  const sum = (pick: (i: any) => number) =>
    roundIntermediate(items.reduce((acc, i) => acc + pick(i), 0));
  await upsertTableRow("hr", "payroll_run", {
    ...run,
    totalGross: sum((i) => Number(i.grossSalary)),
    totalDeductions: sum(
      (i) =>
        Number(i.gosiEmployee) +
        Number(i.absenceDeduction) +
        Number(i.leaveDeduction) +
        Number(i.latenessDeduction) +
        Number(i.otherDeductions),
    ),
    totalNet: sum((i) => Number(i.netSalary)),
    totalEmployerCost: sum(
      (i) =>
        Number(i.grossSalary) +
        Number(i.gosiEmployer) -
        Number(i.externalSupport),
    ),
  });
}

interface RunContext {
  policy: HrPolicyRules;
  window: PayrollWindow;
  month: string;
  holidays: Set<string>;
  attendance: Awaited<ReturnType<typeof attendanceForPayroll>>;
  leaves: Map<string, LeaveInWindow[]>;
  commissions: Map<string, number>;
  commissionPaidElsewhere: Set<string>;
  gosi: GosiContext;
  supports: SupportContext;
}

type EligibleEmployee = Awaited<ReturnType<typeof eligibleEmployees>>[number];

async function eligibleEmployees(window: PayrollWindow) {
  const [employees, users, records] = await Promise.all([
    listTableRows<any>("hr", "employee"),
    listTableRows<any>("identity", "user"),
    listTableRows<any>("system", "employment_record"),
  ]);
  const userMap = new Map<string, any>(
    users.map((u) => [u.id, { id: u.id, commissionRatePercent: u.commissionRatePercent }]),
  );
  const salaryStartMs = window.salaryStart.getTime();
  const salaryEndMs = window.salaryEnd.getTime();
  return employees
    .filter((e) => {
      if (!["active", "on_leave"].includes(e.status)) return false;
      const hireMs = e.hireDate ? new Date(e.hireDate).getTime() : 0;
      return hireMs <= salaryEndMs;
    })
    .map((e) => {
      const empRecords = records
        .filter((r) => {
          if (r.employeeId !== e.id) return false;
          const fromMs = r.effectiveFrom ? new Date(r.effectiveFrom).getTime() : 0;
          if (fromMs > salaryEndMs) return false;
          if (!r.effectiveTo) return true;
          return new Date(r.effectiveTo).getTime() >= salaryStartMs;
        })
        .sort((a, b) =>
          String(b.effectiveFrom ?? "").localeCompare(String(a.effectiveFrom ?? "")),
        )
        .slice(0, 1);
      return {
        ...e,
        hireDate: new Date(e.hireDate),
        user: e.userId ? userMap.get(e.userId) ?? null : null,
        employmentRecords: empRecords,
      };
    });
}

async function buildContext(
  year: number,
  month: number,
  window: PayrollWindow | null,
  employees: EligibleEmployee[],
): Promise<RunContext> {
  const policy = await getHrPolicy();
  const w = window ?? payrollWindow(policy, year, month);
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const ids = employees.map((e) => e.id);
  const yearStart = utcDay(w.attendanceStart.getUTCFullYear(), 0, 1);
  const [
    holidays,
    attendance,
    allLeaveRows,
    leaveTypes,
    commissions,
    allPayouts,
    gosi,
    supports,
  ] = await Promise.all([
    holidaySet(
      w.attendanceStart.getTime() < w.salaryStart.getTime()
        ? w.attendanceStart
        : w.salaryStart,
      w.attendanceEnd.getTime() > w.salaryEnd.getTime()
        ? w.attendanceEnd
        : w.salaryEnd,
    ),
    attendanceForPayroll(ids, w.attendanceStart, w.attendanceEnd),
    listTableRows<any>("hr", "leave_request"),
    listTableRows<any>("hr", "leave_type"),
    policy.commissionInPayroll
      ? commissionsForRange(
          {
            gte: w.attendanceStart,
            lt: new Date(w.attendanceEnd.getTime() + 86_400_000),
          },
          employees.map((e) => e.userId).filter(Boolean) as string[],
        )
      : Promise.resolve(
          new Map<string, { net: number; invoices: Set<string> }>(),
        ),
    listTableRows<any>("finance", "commission_payout"),
    loadGosiContext(ids),
    loadSupportContext(ids),
  ]);

  const leaveTypeMap = new Map<string, any>(leaveTypes.map((t) => [t.id, t]));
  const idSet = new Set(ids);
  const leaveRows = allLeaveRows
    .filter((row) => {
      if (!idSet.has(row.employeeId) || row.status !== "approved") return false;
      const startMs = new Date(row.startDate).getTime();
      return startMs >= yearStart.getTime() && startMs <= w.attendanceEnd.getTime();
    })
    .map((row) => ({
      ...row,
      startDate: new Date(row.startDate),
      endDate: new Date(row.endDate),
      leaveType: leaveTypeMap.get(row.leaveTypeId) ?? {},
    }))
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  const payoutsElsewhere = allPayouts.filter(
    (p) => p.periodMonth === monthKey && !p.payrollItemId,
  );

  const leaves = new Map<string, LeaveInWindow[]>();
  const takenByTypeYear = new Map<string, number>();
  for (const row of leaveRows) {
    const k = `${row.employeeId}:${row.leaveTypeId}:${row.startDate.getUTCFullYear()}`;
    const takenBefore = takenByTypeYear.get(k) ?? 0;
    takenByTypeYear.set(k, takenBefore + Number(row.days));
    if (row.endDate < w.attendanceStart) continue;
    const rules = toLeaveTypeRules(row.leaveType);
    const list = leaves.get(row.employeeId) ?? [];
    list.push({
      typeCode: rules.code,
      type: rules,
      start: row.startDate,
      end: row.endDate,
      portion: row.dayPortion as DayPortion,
      hourFraction: row.dayPortion === "hours" ? Number(row.days) : null,
      takenBefore,
    });
    leaves.set(row.employeeId, list);
  }

  const rates = new Map(
    employees
      .filter((e) => e.user)
      .map((e) => [e.user!.id, Number(e.user!.commissionRatePercent ?? 0)]),
  );
  const commissionByUser = new Map<string, number>();
  for (const [userId, earned] of Array.from(commissions))
    commissionByUser.set(
      userId,
      commissionAmount(
        policy.currency ? roundMoney(earned.net, policy.currency) : r3(earned.net),
        rates.get(userId) ?? 0,
        policy.currency,
      ),
    );

  return {
    policy,
    window: w,
    month: monthKey,
    holidays,
    attendance,
    leaves,
    commissions: commissionByUser,
    commissionPaidElsewhere: new Set(payoutsElsewhere.map((p) => p.userId)),
    gosi,
    supports,
  };
}

interface Preserved {
  bonus: number;
  otherDeductions: number;
  adjustmentNote: string | null;
}

type LineDraft = {
  kind: string;
  category: string;
  label: string;
  amount: number;
  note: string | null;
  source: string;
  recurringId: string | null;
  displayOrder: number;
};

async function recurringPayFor(employeeIds: string[], monthKey: string) {
  const idSet = new Set(employeeIds);
  const allRows = await listTableRows<any>("hr", "employee_recurring_pay");
  const rows = allRows
    .filter(
      (r) =>
        idSet.has(r.employeeId) &&
        r.isActive &&
        String(r.startMonth ?? "") <= monthKey &&
        (!r.endMonth || String(r.endMonth) >= monthKey),
    )
    .sort((a, b) =>
      String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")),
    );
  const map = new Map<string, LineDraft[]>();
  for (const r of rows) {
    const list = map.get(r.employeeId) ?? [];
    list.push({
      kind: r.kind,
      category: r.category,
      label: r.label,
      amount: Number(r.amount),
      note: r.note,
      source: "recurring",
      recurringId: r.id,
      displayOrder: list.length,
    });
    map.set(r.employeeId, list);
  }
  return map;
}

function lineTotals(lines: Array<{ kind: string; amount: unknown }>) {
  const sum = (kind: string) =>
    roundIntermediate(
      lines
        .filter((l) => l.kind === kind)
        .reduce((total, l) => total + Number(l.amount), 0),
    );
  return { bonus: sum("addition"), otherDeductions: sum("deduction") };
}

function lineFor(
  employee: EligibleEmployee,
  ctx: RunContext,
  preserved: Preserved,
) {
  const r3 = (value: number) => ctx.policy.currency ? roundMoney(value, ctx.policy.currency) : Math.round(value * 1000) / 1000;
  const record = employee.employmentRecords[0];
  const settings = parsePayrollSettings(record?.payrollSettings);
  const [year, monthNumber] = ctx.month.split("-").map(Number);
  const pay = record
    ? {
        basic: Number(record.basicSalary),
        housing: Number(record.housingAllowance),
        transport: Number(record.transportAllowance),
        other: Number(record.otherAllowances),
      }
    : { basic: 0, housing: 0, transport: 0, other: 0 };
  const scheme = record
    ? schemeContributions(ctx.gosi, employee.id, {
        pay,
        hireDate: employee.hireDate,
        year,
        month: monthNumber,
      })
    : null;
  if (!record || (!settings && !scheme))
    throw new Error(
      formatMessage(serverTemplates.completeTheSalaryAndPayrollSettingsFor, {
        0: employee.firstNameEn,
        1: employee.lastNameEn,
        2: employee.employeeNumber,
      }),
    );
  const userId = employee.userId;
  const commission =
    userId && !ctx.commissionPaidElsewhere.has(userId)
      ? (ctx.commissions.get(userId) ?? 0)
      : 0;
  const breakdown: PayrollBreakdown = computeEmployeePayroll({
    hireDate: employee.hireDate,
    pay,
    window: ctx.window,
    policy: ctx.policy,
    holidays: ctx.holidays,
    attendance: ctx.attendance.filter((a) => a.employeeId === employee.id),
    leaves: ctx.leaves.get(employee.id) ?? [],
    commission,
    bonus: preserved.bonus,
    otherDeductions: preserved.otherDeductions,
  });
  const legacy =
    !scheme && settings
      ? calculateContributions(breakdown.fixedPay, settings, ctx.month, ctx.policy.currency)
      : null;
  const contributions = scheme
    ? { employee: scheme.employee, employer: scheme.employer }
    : { employee: legacy!.employee, employer: legacy!.employer };
  const totals = payrollTotals(breakdown, contributions.employee, ctx.policy.currency);
  const paidShare =
    breakdown.fixedPay > 0
      ? Math.max(
          0,
          (breakdown.fixedPay -
            breakdown.absenceDeduction -
            breakdown.leaveDeduction) /
            breakdown.fixedPay,
        )
      : 0;
  let supportLines = supportLinesFor(
    ctx.supports,
    employee.id,
    pay,
    ctx.month,
    paidShare,
    ctx.policy.currency,
  );
  const support = r3(
    Math.min(
      totals.gross + contributions.employer,
      supportLines
        ? supportLines.reduce((sum, l) => sum + l.amount, 0)
        : (legacy?.support ?? 0),
    ),
  );
  if (supportLines?.length) {
    const total = supportLines.reduce((sum, l) => sum + l.amount, 0);
    if (total !== support) {
      let remaining = support;
      supportLines = supportLines.map((line, index) => {
        const amount =
          index === supportLines!.length - 1
            ? remaining
            : Math.min(remaining, r3((line.amount * support) / total));
        remaining = r3(remaining - amount);
        return { ...line, amount };
      });
    }
  }
  return {
    data: {
      basicSalary: pay.basic,
      housingAllowance: pay.housing,
      transportAllowance: pay.transport,
      otherAllowances: pay.other,
      bonus: breakdown.bonus,
      overtimePay: breakdown.overtimePay,
      shiftAllowance: breakdown.shiftAllowance,
      commission: breakdown.commission,
      absenceDeduction: breakdown.absenceDeduction,
      leaveDeduction: breakdown.leaveDeduction,
      latenessDeduction: breakdown.latenessDeduction,
      otherDeductions: breakdown.otherDeductions,
      grossSalary: totals.gross,
      gosiEmployee: contributions.employee,
      gosiEmployer: contributions.employer,
      externalSupport: support,
      netSalary: totals.net,
      adjustmentNote: preserved.adjustmentNote,
      calculationSnapshot: JSON.parse(
        JSON.stringify({
          currency: ctx.policy.currency,
          ...(settings ?? {
            employee: { mode: "fixed", value: 0 },
            employer: { mode: "fixed", value: 0 },
            supports: [],
          }),
          gosi: scheme
            ? {
                category: scheme.profile.category,
                registrationNumber: scheme.profile.registrationNumber ?? null,
                due: scheme.due,
                reason: scheme.reason,
                lines: scheme.lines,
              }
            : null,
          supportLines,
        }),
      ),
      attendanceSummary: JSON.parse(
        JSON.stringify({
          ...breakdown.summary,
          dailyRate: breakdown.dailyRate,
          hourlyOvertimeRate: breakdown.hourlyOvertimeRate,
          policy: ctx.policy,
        }),
      ),
    },
    commission,
    userId,
  };
}

async function syncCommissionPayout(
  itemId: string,
  userId: string | null,
  month: string,
  amount: number,
  basis: number,
  rate: number,
  actorId: string,
) {
  if (!userId || amount <= 0) {
    const payouts = await listTableRows<any>("finance", "commission_payout");
    await Promise.all(
      payouts
        .filter((p) => p.payrollItemId === itemId)
        .map((p) => deleteTableRow("finance", "commission_payout", p.id)),
    );
    return;
  }
  const payouts = await listTableRows<any>("finance", "commission_payout");
  const existing = payouts.find((p) => p.payrollItemId === itemId);
  if (existing) {
    await upsertTableRow("finance", "commission_payout", {
      ...existing,
      amount,
      basisAmount: basis,
      ratePercent: rate,
      recordedById: actorId,
    });
  } else {
    await upsertTableRow("finance", "commission_payout", {
      id: crypto.randomUUID(),
      userId,
      currency: await assertCompanyCurrency(),
      periodMonth: month,
      amount,
      basisAmount: basis,
      ratePercent: rate,
      payrollItemId: itemId,
      recordedById: actorId,
    });
  }
}

function assertPeriod(month: number, year: number) {
  if (
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2200
  )
    throw new Error(serverMessages.invalidPayrollPeriod);
}

export async function createPayrollRun(
  month: number,
  year: number,
  actorId: string,
): Promise<PayrollRun> {
  await assertActorNotOnLeave(actorId);
  assertPeriod(month, year);
  const runs = await listTableRows<any>("hr", "payroll_run");
  const existing = runs.find((r) => r.year === year && r.month === month);
  if (existing) {
    const [hydrated] = await hydrateRuns([existing]);
    return mapRun(hydrated);
  }

  const policy = await getHrPolicy();
  const window = payrollWindow(policy, year, month);
  const employees = await eligibleEmployees(window);
  const ctx = await buildContext(year, month, window, employees);
  const recurring = await recurringPayFor(
    employees.map((e) => e.id),
    ctx.month,
  );
  const lines = employees.map((employee) => {
    const payLines = recurring.get(employee.id) ?? [];
    return {
      employee,
      payLines,
      ...lineFor(employee, ctx, {
        ...lineTotals(payLines),
        adjustmentNote: null,
      }),
    };
  });

  const run = await runAtomicMutation(async () => {
    const created = await upsertTableRow<any>("hr", "payroll_run", {
      id: crypto.randomUUID(),
      month,
      year,
      periodStart: window.salaryStart.toISOString(),
      periodEnd: window.salaryEnd.toISOString(),
      attendanceStart: window.attendanceStart.toISOString(),
      attendanceEnd: window.attendanceEnd.toISOString(),
      payDate: window.payDate ? window.payDate.toISOString() : null,
      status: "calculated",
      totalGross: 0,
      totalDeductions: 0,
      totalNet: 0,
      totalEmployerCost: 0,
    });
    for (const line of lines) {
      const item = await upsertTableRow<any>("hr", "payroll_item", {
        id: crypto.randomUUID(),
        payrollRunId: created.id,
        employeeId: line.employee.id,
        paymentStatus: "pending",
        ...line.data,
      });
      if (line.payLines.length)
        await Promise.all(
          line.payLines.map((l) =>
            upsertTableRow("hr", "payroll_item_line", {
              id: crypto.randomUUID(),
              ...l,
              payrollItemId: item.id,
            }),
          ),
        );
      const rate = Number(line.employee.user?.commissionRatePercent ?? 0);
      await syncCommissionPayout(
        item.id,
        line.userId,
        ctx.month,
        line.commission,
        rate > 0 ? roundIntermediate((line.commission * 100) / rate) : 0,
        rate,
        actorId,
      );
    }
    await refreshPayrollTotals(created.id);
    return hydrateRunById(created.id);
  });
  return mapRun(run);
}

export async function recalculatePayrollRun(
  runId: string,
  actorId: string,
): Promise<PayrollRun> {
  const [runs, allItems, allLines] = await Promise.all([
    listTableRows<any>("hr", "payroll_run"),
    listTableRows<any>("hr", "payroll_item"),
    listTableRows<any>("hr", "payroll_item_line"),
  ]);
  const rawRun = runs.find((r) => r.id === runId);
  if (!rawRun) throw new Error(serverMessages.payrollRunNotFound);
  const runItems = allItems
    .filter((i) => i.payrollRunId === runId)
    .map((i) => ({
      ...i,
      lines: allLines.filter((l) => l.payrollItemId === i.id),
    }));
  const run = { ...rawRun, items: runItems };
  if (!["draft", "calculated"].includes(run.status))
    throw new Error(
      formatMessage(serverTemplates.payrollIs0ItCanOnlyBe, { 0: run.status }),
    );
  const policy = await getHrPolicy();
  const window = payrollWindow(policy, run.year, run.month);
  const employees = await eligibleEmployees(window);
  const ctx = await buildContext(run.year, run.month, window, employees);
  const recurring = await recurringPayFor(
    employees.map((e) => e.id),
    ctx.month,
  );
  await runAtomicMutation(async () => {
    await upsertTableRow("hr", "payroll_run", {
      ...rawRun,
      attendanceStart: window.attendanceStart.toISOString(),
      attendanceEnd: window.attendanceEnd.toISOString(),
      payDate: window.payDate ? window.payDate.toISOString() : null,
      periodStart: window.salaryStart.toISOString(),
      periodEnd: window.salaryEnd.toISOString(),
    });
    const keep = new Set<string>();
    for (const employee of employees) {
      const existing = run.items.find((i: any) => i.employeeId === employee.id);
      const manual = (existing?.lines ?? []).filter(
        (l: any) => l.source === "manual",
      );
      const fresh = recurring.get(employee.id) ?? [];
      const line = lineFor(employee, ctx, {
        ...lineTotals([...manual, ...fresh]),
        adjustmentNote: existing?.adjustmentNote ?? null,
      });
      const item = existing
        ? await upsertTableRow<any>("hr", "payroll_item", {
            ...existing,
            ...line.data,
          })
        : await upsertTableRow<any>("hr", "payroll_item", {
            id: crypto.randomUUID(),
            payrollRunId: runId,
            employeeId: employee.id,
            paymentStatus: "pending",
            ...line.data,
          });
      const oldRecurring = (existing?.lines ?? []).filter(
        (l: any) => l.source === "recurring",
      );
      await Promise.all(
        oldRecurring.map((l: any) =>
          deleteTableRow("hr", "payroll_item_line", l.id),
        ),
      );
      if (fresh.length)
        await Promise.all(
          fresh.map((l) =>
            upsertTableRow("hr", "payroll_item_line", {
              id: crypto.randomUUID(),
              ...l,
              payrollItemId: item.id,
              displayOrder: manual.length + l.displayOrder,
            }),
          ),
        );
      keep.add(item.id);
      const rate = Number(employee.user?.commissionRatePercent ?? 0);
      await syncCommissionPayout(
        item.id,
        line.userId,
        ctx.month,
        line.commission,
        rate > 0 ? roundIntermediate((line.commission * 100) / rate) : 0,
        rate,
        actorId,
      );
    }
    const dropped = run.items
      .filter((i: any) => !keep.has(i.id))
      .map((i: any) => i.id);
    if (dropped.length)
      await Promise.all(
        dropped.map((id: string) => deleteTableRow("hr", "payroll_item", id)),
      );
    await refreshPayrollTotals(runId);
  });
  return mapRun(await hydrateRunById(runId));
}

export interface PayLineInput {
  category: string;
  label: string;
  amount: number;
  note?: string;
}

export async function setPayrollItemLines(
  itemId: string,
  input: {
    additions: PayLineInput[];
    deductions: PayLineInput[];
    note?: string | null;
  },
  actorId: string,
) {
  const [items, runs, allLines] = await Promise.all([
    listTableRows<any>("hr", "payroll_item"),
    listTableRows<any>("hr", "payroll_run"),
    listTableRows<any>("hr", "payroll_item_line"),
  ]);
  const rawItem = items.find((i) => i.id === itemId);
  if (!rawItem) throw new Error(serverMessages.payrollRunNotFound);
  const payrollRun = runs.find((r) => r.id === rawItem.payrollRunId);
  if (!payrollRun) throw new Error(serverMessages.payrollRunNotFound);
  const lines = allLines.filter((l) => l.payrollItemId === itemId);
  const item = { ...rawItem, payrollRun, lines };
  if (!["draft", "calculated"].includes(item.payrollRun.status))
    throw new Error(
      formatMessage(serverTemplates.payrollIs0LinesCanOnlyBe, {
        0: item.payrollRun.status,
      }),
    );
  if (input.additions.length + input.deductions.length > MAX_PAY_LINES)
    throw new Error(serverMessages.aSalaryCanHaveAtMost);
  const drafts = (
    [
      ["addition", input.additions],
      ["deduction", input.deductions],
    ] as const
  ).flatMap(([kind, list]) =>
    list.map((l, index) => {
      const label = l.label?.trim().slice(0, 120);
      if (!label)
        throw new Error(serverMessages.everyAdditionAndDeductionNeedsA);
      if (
        !(PAY_LINE_CATEGORIES[kind] as readonly string[]).includes(l.category)
      )
        throw new Error(serverMessages.chooseACategoryForEveryLine);
      const amount = roundIntermediate(Number(l.amount));
      if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000)
        throw new Error(serverMessages.everyLineNeedsAnAmountAbove);
      return {
        kind,
        category: l.category,
        label,
        amount,
        note: l.note?.trim().slice(0, 300) || null,
        source: "manual",
        recurringId: null,
        displayOrder: index,
        createdById: actorId,
      };
    }),
  );
  const recurring = item.lines.filter((l: any) => l.source === "recurring");
  const { bonus, otherDeductions } = lineTotals([...drafts, ...recurring]);
  const fixedPay = roundIntermediate(
    Number(item.basicSalary) +
      Number(item.housingAllowance) +
      Number(item.transportAllowance) +
      Number(item.otherAllowances),
  );
  const totals = payrollTotals(
    {
      fixedPay,
      overtimePay: Number(item.overtimePay),
      shiftAllowance: Number(item.shiftAllowance),
      commission: Number(item.commission),
      bonus,
      absenceDeduction: Number(item.absenceDeduction),
      leaveDeduction: Number(item.leaveDeduction),
      latenessDeduction: Number(item.latenessDeduction),
      otherDeductions,
    },
    Number(item.gosiEmployee),
  );
  const note =
    input.note === undefined
      ? item.adjustmentNote
      : input.note?.trim().slice(0, 500) || null;
  const oldManual = item.lines.filter((l: any) => l.source === "manual");
  await Promise.all(
    oldManual.map((l: any) => deleteTableRow("hr", "payroll_item_line", l.id)),
  );
  if (drafts.length)
    await Promise.all(
      drafts.map((d) =>
        upsertTableRow("hr", "payroll_item_line", {
          id: crypto.randomUUID(),
          ...d,
          payrollItemId: itemId,
        }),
      ),
    );
  const updated = await upsertTableRow<any>("hr", "payroll_item", {
    ...rawItem,
    bonus,
    otherDeductions,
    grossSalary: totals.gross,
    netSalary: totals.net,
    adjustmentNote: note,
    editedById: actorId,
    editedAt: new Date().toISOString(),
  });
  await refreshPayrollTotals(item.payrollRun.id);
  return {
    item: mapPayrollItem(updated),
    before: mapPayrollItem(item),
    lines: drafts.length,
  };
}

export async function submitPayrollRunForApproval(
  id: string,
  actorId: string,
): Promise<{ success: boolean; approvalRequestId: string }> {
  await assertActorNotOnLeave(actorId);
  const [runs, items] = await Promise.all([
    listTableRows<any>("hr", "payroll_run"),
    listTableRows<any>("hr", "payroll_item"),
  ]);
  const rawRun = runs.find((r) => r.id === id);
  const run = rawRun
    ? { ...rawRun, items: items.filter((i) => i.payrollRunId === id) }
    : null;
  if (!run) throw new Error(serverMessages.payrollRunNotFound);
  if (run.status !== "calculated" && run.status !== "draft")
    throw new Error(
      formatMessage(serverTemplates.payrollRunCannotBeSubmittedStatusIs, {
        0: run.status,
      }),
    );
  await upsertTableRow("hr", "payroll_run", {
    ...rawRun,
    status: "submitted",
  });
  const approvalReq = await submitForApproval({
    targetType: "payroll_run",
    targetId: run.id,
    requesterId: actorId,
    policySnapshot: {
      month: run.month,
      year: run.year,
      totalGross: Number(run.totalGross),
      totalNet: Number(run.totalNet),
      totalEmployerCost: Number(run.totalEmployerCost),
      employeesCount: run.items.length,
    },
    diffPayload: {
      month: run.month,
      year: run.year,
      totalNet: Number(run.totalNet),
      totalEmployerCost: Number(run.totalEmployerCost),
      itemsCount: run.items.length,
    },
  });
  return { success: true, approvalRequestId: approvalReq.approvalRequestId };
}

export const PAYMENT_METHODS = [
  "bank_transfer",
  "cash",
  "cheque",
  "wps",
] as const;

export interface ItemPaymentInput {
  method: string;
  reference?: string | null;
  paidOn?: string | null;
}

async function payItems(
  runId: string,
  itemIds: string[] | null,
  input: ItemPaymentInput,
  actorId: string,
) {
  if (!(PAYMENT_METHODS as readonly string[]).includes(input.method))
    throw new Error(serverMessages.chooseHowTheSalaryWasPaid);
  const paidAt = input.paidOn
    ? new Date(`${input.paidOn}T12:00:00Z`)
    : new Date();
  if (
    Number.isNaN(paidAt.getTime()) ||
    paidAt.getTime() > Date.now() + 86_400_000
  )
    throw new Error(serverMessages.chooseAPaymentDateThatIsNot);
  return runAtomicMutation(async () => {
    const [runs, allItems, existingSlips] = await Promise.all([
      listTableRows<any>("hr", "payroll_run"),
      listTableRows<any>("hr", "payroll_item"),
      listTableRows<any>("system", "payslip"),
    ]);
    const rawRun = runs.find((r) => r.id === runId);
    if (!rawRun) throw new Error(serverMessages.payrollRunNotFound);
    const runItems = allItems.filter((i) => i.payrollRunId === runId);
    if (rawRun.status !== "approved")
      throw new Error(
        formatMessage(serverTemplates.salariesCanBePaidOnceThePayroll, {
          0: rawRun.status,
        }),
      );
    const targets = runItems.filter(
      (i) => i.paymentStatus !== "paid" && (!itemIds || itemIds.includes(i.id)),
    );
    if (itemIds && targets.length !== itemIds.length)
      throw new Error(serverMessages.thisSalaryIsAlreadyPaid);
    const paidAtIso = paidAt.toISOString();
    await Promise.all(
      targets.map((item) =>
        upsertTableRow("hr", "payroll_item", {
          ...item,
          paymentStatus: "paid",
          paidAt: paidAtIso,
          paidById: actorId,
          paymentMethod: input.method,
          paymentReference: input.reference?.trim().slice(0, 120) || null,
        }),
      ),
    );
    const issuedAtIso = new Date().toISOString();
    const slipItemIds = new Set(existingSlips.map((s) => s.payrollItemId));
    await Promise.all(
      targets
        .filter((item) => !slipItemIds.has(item.id))
        .map((item) =>
          upsertTableRow("system", "payslip", {
            id: crypto.randomUUID(),
            payrollItemId: item.id,
            employeeId: item.employeeId,
            month: rawRun.month,
            year: rawRun.year,
            issuedAt: issuedAtIso,
          }),
        ),
    );
    const paidIds = new Set(targets.map((t) => t.id));
    const remaining = runItems.filter(
      (i) => i.paymentStatus !== "paid" && !paidIds.has(i.id),
    ).length;
    if (remaining === 0)
      await upsertTableRow("hr", "payroll_run", {
        ...rawRun,
        status: "paid",
        paidAt: paidAtIso,
      });
    return hydrateRunById(runId);
  });
}

export async function payPayrollItem(
  itemId: string,
  input: ItemPaymentInput,
  actorId: string,
) {
  await assertActorNotOnLeave(actorId);
  const items = await listTableRows<any>("hr", "payroll_item");
  const item = items.find((i) => i.id === itemId);
  if (!item) throw new Error(serverMessages.payrollRunNotFound);
  return mapRun(await payItems(item.payrollRunId, [itemId], input, actorId));
}

export async function markPayrollAsPaid(
  id: string,
  actorId: string,
  input: ItemPaymentInput = { method: "bank_transfer" },
): Promise<PayrollRun> {
  await assertActorNotOnLeave(actorId);
  return mapRun(await payItems(id, null, input, actorId));
}

export async function listPayrollRuns(): Promise<PayrollRun[]> {
  const runs = await listTableRows<any>("hr", "payroll_run");
  runs.sort((a, b) => b.year - a.year || b.month - a.month);
  const hydrated = await hydrateRuns(runs);
  return hydrated.map(mapRun);
}

export async function getPayrollItemDetail(itemId: string) {
  const [
    allItems,
    runs,
    slips,
    payouts,
    allLines,
    employees,
    departments,
  ] = await Promise.all([
    listTableRows<any>("hr", "payroll_item"),
    listTableRows<any>("hr", "payroll_run"),
    listTableRows<any>("system", "payslip"),
    listTableRows<any>("finance", "commission_payout"),
    listTableRows<any>("hr", "payroll_item_line"),
    listTableRows<any>("hr", "employee"),
    listTableRows<any>("hr", "department"),
  ]);
  const rawItem = allItems.find((i) => i.id === itemId);
  if (!rawItem) {
    return await getApiPayrollItemDetail(itemId);
  }
  const run = runs.find((r) => r.id === rawItem.payrollRunId);
  if (!run) {
    return await getApiPayrollItemDetail(itemId);
  }
  const emp = employees.find((e) => e.id === rawItem.employeeId);
  if (!emp) {
    return await getApiPayrollItemDetail(itemId);
  }
  const dept = departments.find((d) => d.id === emp.departmentId) ?? null;
  const item = {
    ...rawItem,
    payrollRun: run,
    payslip: slips.find((s) => s.payrollItemId === itemId) ?? null,
    commissionPayout: payouts.find((p) => p.payrollItemId === itemId) ?? null,
    lines: allLines
      .filter((l) => l.payrollItemId === itemId)
      .sort((a, b) => {
        const kCmp = String(a.kind ?? "").localeCompare(String(b.kind ?? ""));
        return kCmp !== 0 ? kCmp : Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0);
      }),
    employee: {
      id: emp.id,
      employeeNumber: emp.employeeNumber,
      firstNameEn: emp.firstNameEn,
      lastNameEn: emp.lastNameEn,
      firstNameAr: emp.firstNameAr,
      lastNameAr: emp.lastNameAr,
      jobTitleEn: emp.jobTitleEn,
      jobTitleAr: emp.jobTitleAr,
      hireDate: emp.hireDate,
      userId: emp.userId,
      department: dept ? { nameEn: dept.nameEn, nameAr: dept.nameAr } : null,
    },
  };
  const start = new Date(run.attendanceStart ?? run.periodStart);
  const end = new Date(run.attendanceEnd ?? run.periodEnd);
  const [allAttendance, shiftTypes, allLeaves, leaveTypes, users] =
    await Promise.all([
      listTableRows<any>("hr", "attendance_entry"),
      listTableRows<any>("hr", "shift_type"),
      listTableRows<any>("hr", "leave_request"),
      listTableRows<any>("hr", "leave_type"),
      listTableRows<any>("identity", "user"),
    ]);
  const shiftMap = new Map<string, any>(
    shiftTypes.map((s) => [s.id, { nameEn: s.nameEn, nameAr: s.nameAr }]),
  );
  const leaveTypeMap = new Map<string, any>(
    leaveTypes.map((t) => [
      t.id,
      { code: t.code, nameEn: t.nameEn, nameAr: t.nameAr },
    ]),
  );
  const empMap = new Map<string, any>(employees.map((e) => [e.id, e]));
  const attendance = allAttendance
    .filter((a) => {
      if (a.employeeId !== item.employeeId) return false;
      const ms = new Date(a.date).getTime();
      return ms >= start.getTime() && ms <= end.getTime();
    })
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map((a) => ({
      ...a,
      date: new Date(a.date),
      shiftType: a.shiftTypeId ? shiftMap.get(a.shiftTypeId) ?? null : null,
    }));
  const leaves = allLeaves
    .filter((l) => {
      if (l.employeeId !== item.employeeId || l.status !== "approved")
        return false;
      const sMs = new Date(l.startDate).getTime();
      const eMs = new Date(l.endDate).getTime();
      return sMs <= end.getTime() && eMs >= start.getTime();
    })
    .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)))
    .map((l) => ({
      ...l,
      startDate: new Date(l.startDate),
      endDate: new Date(l.endDate),
      leaveType: leaveTypeMap.get(l.leaveTypeId) ?? {},
    }));
  const editedBy = item.editedById
    ? users.find((u) => u.id === item.editedById) ?? null
    : null;
  const paidBy = item.paidById
    ? users.find((u) => u.id === item.paidById) ?? null
    : null;
  const siblings = allItems
    .filter((i) => i.payrollRunId === run.id)
    .map((i) => ({
      id: i.id,
      employee: empMap.get(i.employeeId) ?? { firstNameEn: "", lastNameEn: "" },
    }))
    .sort((a, b) => {
      const f = String(a.employee.firstNameEn ?? "").localeCompare(
        String(b.employee.firstNameEn ?? ""),
      );
      return f !== 0
        ? f
        : String(a.employee.lastNameEn ?? "").localeCompare(
            String(b.employee.lastNameEn ?? ""),
          );
    });
  const index = siblings.findIndex((s) => s.id === item.id);
  return {
    item: {
      ...mapPayrollItem(item),
      attendanceSummary: item.attendanceSummary ?? null,
    },
    run: {
      id: run.id,
      month: run.month,
      year: run.year,
      status: run.status,
      periodStart: dayKey(run.periodStart),
      periodEnd: dayKey(run.periodEnd),
      attendanceStart: dayKey(start),
      attendanceEnd: dayKey(end),
      payDate: run.payDate ? dayKey(run.payDate) : null,
    },
    employee: { ...item.employee, hireDate: dayKey(item.employee.hireDate) },
    lines: item.lines.map((l) => ({
      id: l.id,
      kind: l.kind as "addition" | "deduction",
      category: l.category,
      label: l.label,
      amount: Number(l.amount),
      note: l.note,
      source: l.source,
    })),
    commission: item.commissionPayout
      ? {
          basis: Number(item.commissionPayout.basisAmount),
          ratePercent: Number(item.commissionPayout.ratePercent),
          amount: Number(item.commissionPayout.amount),
        }
      : null,
    attendance: attendance.map((a) => ({
      date: dayKey(a.date),
      status: a.status,
      lateMinutes: a.lateMinutes,
      overtimeMinutes: a.overtimeMinutes,
      overtimeNightMinutes: a.overtimeNightMinutes,
      overtimeRestDayMinutes: a.overtimeRestDayMinutes,
      overtimeHolidayMinutes: a.overtimeHolidayMinutes,
      shift: a.shiftType,
      notes: a.notes,
    })),
    leaves: leaves.map((l) => ({
      id: l.id,
      type: l.leaveType,
      startDate: dayKey(l.startDate),
      endDate: dayKey(l.endDate),
      dayPortion: l.dayPortion,
      days: Number(l.days),
    })),
    editedBy: editedBy?.fullName ?? null,
    paidBy: paidBy?.fullName ?? null,
    payslipId: item.payslip?.id ?? null,
    previousId: index > 0 ? siblings[index - 1].id : null,
    nextId:
      index >= 0 && index < siblings.length - 1 ? siblings[index + 1].id : null,
    position: { index: index + 1, total: siblings.length },
  };
}

async function getApiPayrollItemDetail(itemId: string) {
  try {
    const { listPayrollRuns, getEmployee } = await import("@platform/api-client");
    const runs = await listPayrollRuns().catch(() => []);
    const { apiUrl, apiTimeoutMs } = await import("../api/config");
    const { serviceToken } = await import("../api/service-token");
    const token = await serviceToken();

    for (const r of runs) {
      const runId = r.id || (r as any).ID;
      const res = await fetch(`${apiUrl()}/v1/hr/payroll/${encodeURIComponent(runId)}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(apiTimeoutMs()),
      }).catch(() => null);
      if (!res || !res.ok) continue;
      const fullRun = await res.json().catch(() => null);
      if (!fullRun || !fullRun.items) continue;

      const item = fullRun.items.find((i: any) => (i.id || i.ID) === itemId);
      if (!item) continue;

      const empId = item.employeeId || item.EmployeeID;
      const emp = empId ? await getEmployee(empId).catch(() => null) : null;
      const basic = Number(item.basicSalary || item.BasicSalary || 0);
      const allowances = Number(item.allowances || item.Allowances || 0);
      const deductions = Number(item.deductions || item.Deductions || 0);
      const net = Number(item.netSalary || item.NetSalary || basic + allowances - deductions);
      const m = Number(fullRun.periodMonth || fullRun.PeriodMonth || 10);
      const y = Number(fullRun.periodYear || fullRun.PeriodYear || 2026);
      const monthStr = String(m).padStart(2, "0");

      return {
        item: {
          id: item.id || item.ID,
          payrollRunId: fullRun.id || fullRun.ID,
          employeeId: empId,
          basicSalary: basic,
          housingAllowance: 0,
          transportAllowance: 0,
          otherAllowances: allowances,
          allowances,
          overtimeAmount: 0,
          bonus: 0,
          gosiEmployee: deductions,
          absenceDeduction: 0,
          leaveDeduction: 0,
          latenessDeduction: 0,
          otherDeductions: 0,
          deductions,
          grossSalary: basic + allowances,
          netSalary: net,
          gosiEmployer: 0,
          externalSupport: 0,
          employerCost: basic + allowances,
          status: item.status || item.Status || "paid",
          createdAt: new Date().toISOString(),
          editedAt: null,
          paidAt: new Date().toISOString(),
          attendanceSummary: null,
        },
        run: {
          id: fullRun.id || fullRun.ID,
          month: m,
          year: y,
          status: fullRun.status || fullRun.Status || "completed",
          periodStart: `${y}-${monthStr}-01`,
          periodEnd: `${y}-${monthStr}-30`,
          attendanceStart: `${y}-${monthStr}-01`,
          attendanceEnd: `${y}-${monthStr}-30`,
          payDate: `${y}-${monthStr}-28`,
        },
        employee: {
          id: empId,
          employeeNumber: emp?.employeeNumber || (emp as any)?.EmployeeNumber || "",
          firstNameEn: emp?.firstNameEn || (emp as any)?.FirstNameEn || "",
          lastNameEn: emp?.lastNameEn || (emp as any)?.LastNameEn || "",
          firstNameAr: emp?.firstNameAr || (emp as any)?.FirstNameAr || "",
          lastNameAr: emp?.lastNameAr || (emp as any)?.LastNameAr || "",
          jobTitleEn: emp?.jobTitleEn || (emp as any)?.JobTitleEn || "",
          jobTitleAr: emp?.jobTitleAr || (emp as any)?.JobTitleAr || "",
          hireDate: ((emp?.hireDate || (emp as any)?.HireDate) ? String(emp?.hireDate || (emp as any)?.HireDate).slice(0, 10) : ""),
          userId: null,
          department: ((emp as any)?.department || (emp as any)?.Department) ?? null,
        },
        lines: [],
        commission: null,
        attendance: [],
        leaves: [],
        editedBy: null,
        paidBy: null,
        payslipId: `slip-${item.id || item.ID}`,
        previousId: null,
        nextId: null,
        position: { index: 1, total: 1 },
      };
    }
  } catch (err) {
    console.warn("getApiPayrollItemDetail failed:", err);
  }
  return null;
}
