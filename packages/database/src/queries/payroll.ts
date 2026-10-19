import { serverTemplates, formatMessage, serverMessages } from "@ishoot/locales";

import {
  calculateContributions,
  parsePayrollSettings,
} from "../payroll-calculation";
import { MAX_PAY_LINES, PAY_LINE_CATEGORIES } from "../constants/hr";
import { db, runAtomicMutation } from "../db";
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

function mapPayrollItem(it: any) {
  const out = { ...it };
  for (const field of DECIMAL_FIELDS) out[field] = Number(it[field] ?? 0);
  out.createdAt = it.createdAt.toISOString();
  out.editedAt = it.editedAt ? it.editedAt.toISOString() : null;
  out.paidAt = it.paidAt ? it.paidAt.toISOString() : null;
  delete out.commissionPayout;
  delete out.lines; // Decimal amounts; the detail returns them mapped.
  return out;
}

function mapRun(run: any): PayrollRun {
  return {
    ...run,
    totalGross: Number(run.totalGross),
    totalDeductions: Number(run.totalDeductions),
    totalNet: Number(run.totalNet),
    totalEmployerCost: Number(run.totalEmployerCost),
    periodStart: run.periodStart.toISOString(),
    periodEnd: run.periodEnd.toISOString(),
    attendanceStart: run.attendanceStart?.toISOString() ?? null,
    attendanceEnd: run.attendanceEnd?.toISOString() ?? null,
    payDate: run.payDate?.toISOString() ?? null,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
    approvedAt: run.approvedAt?.toISOString() || null,
    paidAt: run.paidAt?.toISOString() || null,
    items: (run.items ?? []).map(mapPayrollItem),
  };
}

const runInclude = {
  items: {
    include: {
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
    },
  },
} as const;

export interface PayrollLineInput {
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowances: number;
  bonus?: number;
  otherDeductions?: number;
}

/**
 * Fixed pay only (no attendance): contributions and support on basic + allowances, bonus on top, other deductions
 * off net. Kept for previews and older callers; payroll runs use the attendance-aware engine.
 */
export function computePayrollLine(
  input: PayrollLineInput,
  settings: EmployeePayrollSettings | null,
  month: string,
) {
  for (const [key, value] of Object.entries(input))
    if (value !== undefined && !(Number.isFinite(value) && value >= 0))
      throw new Error(formatMessage(serverTemplates["0MustBeZeroOrMore"], { 0: key }));
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

async function refreshPayrollTotals(runId: string) {
  const items = await db.payrollItem.findMany({
    where: { payrollRunId: runId },
  });
  const sum = (pick: (i: (typeof items)[number]) => number) =>
    r3(items.reduce((acc, i) => acc + pick(i), 0));
  await db.payrollRun.update({
    where: { id: runId },
    data: {
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
    },
  });
}

// ---------- Calculation ----------

interface RunContext {
  policy: HrPolicyRules;
  window: PayrollWindow;
  month: string;
  holidays: Set<string>;
  attendance: Awaited<ReturnType<typeof attendanceForPayroll>>;
  leaves: Map<string, LeaveInWindow[]>;
  commissions: Map<string, number>;
  /** Users whose commission for this month was already paid outside payroll. */
  commissionPaidElsewhere: Set<string>;
  /** Social insurance components and registrations; employees without one keep their own contribution settings. */
  gosi: GosiContext;
  /** Wage-support programme enrolments; employees without one keep their own support entries. */
  supports: SupportContext;
}

type EligibleEmployee = Awaited<ReturnType<typeof eligibleEmployees>>[number];

async function eligibleEmployees(window: PayrollWindow) {
  return db.employee.findMany({
    where: {
      status: { in: ["active", "on_leave"] },
      hireDate: { lte: window.salaryEnd },
    },
    include: {
      user: { select: { id: true, commissionRatePercent: true } },
      employmentRecords: {
        where: {
          effectiveFrom: { lte: window.salaryEnd },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: window.salaryStart } },
          ],
        },
        orderBy: { effectiveFrom: "desc" },
        take: 1,
      },
    },
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
  // Leave from the start of the year so pay bands (e.g. sick leave) know what was already taken.
  const yearStart = utcDay(w.attendanceStart.getUTCFullYear(), 0, 1);
  const [
    holidays,
    attendance,
    leaveRows,
    commissions,
    payoutsElsewhere,
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
    db.leaveRequest.findMany({
      where: {
        employeeId: { in: ids },
        status: "approved",
        startDate: { gte: yearStart, lte: w.attendanceEnd },
      },
      include: { leaveType: true },
      orderBy: { startDate: "asc" },
    }),
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
    db.commissionPayout.findMany({
      where: { periodMonth: monthKey, payrollItemId: null },
      select: { userId: true },
    }),
    loadGosiContext(ids),
    loadSupportContext(ids),
  ]);

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
        Math.round(earned.net * 1000) / 1000,
        rates.get(userId) ?? 0,
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

/** Recurring additions and deductions due in a month, per employee. */
async function recurringPayFor(employeeIds: string[], monthKey: string) {
  const rows = await db.employeeRecurringPay.findMany({
    where: {
      employeeId: { in: employeeIds },
      isActive: true,
      startMonth: { lte: monthKey },
      OR: [{ endMonth: null }, { endMonth: { gte: monthKey } }],
    },
    orderBy: { createdAt: "asc" },
  });
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

/** Totals of a line set: additions are paid as `bonus`, deductions as `otherDeductions`. */
function lineTotals(lines: Array<{ kind: string; amount: unknown }>) {
  const sum = (kind: string) =>
    r3(
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
  // Registered employees follow the social insurance scheme (dated rates, 1st-of-month rule); others keep their own settings.
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
      formatMessage(serverTemplates.completeTheSalaryAndPayrollSettingsFor, { 0: employee.firstNameEn, 1: employee.lastNameEn, 2: employee.employeeNumber }),
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
      ? calculateContributions(breakdown.fixedPay, settings, ctx.month)
      : null;
  const contributions = scheme
    ? { employee: scheme.employee, employer: scheme.employer }
    : { employee: legacy!.employee, employer: legacy!.employer };
  const totals = payrollTotals(breakdown, contributions.employee);
  // Wage support follows the share of the month actually paid (joiners, unpaid leave) when the programme prorates.
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
    if (total > support) {
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
          ...(settings ?? {
            employee: { mode: "fixed", value: 0 },
            employer: { mode: "fixed", value: 0 },
            supports: [],
          }),
          // What the month was worked out under, so later rate changes never alter it.
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
    await db.commissionPayout.deleteMany({ where: { payrollItemId: itemId } });
    return;
  }
  await db.commissionPayout.upsert({
    where: { payrollItemId: itemId },
    update: {
      amount,
      basisAmount: basis,
      ratePercent: rate,
      recordedById: actorId,
    },
    create: {
      userId,
      periodMonth: month,
      amount,
      basisAmount: basis,
      ratePercent: rate,
      payrollItemId: itemId,
      recordedById: actorId,
    },
  });
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

/**
 * Creates the month's payroll from salaries, attendance, leave, overtime, shifts and commissions.
 * Returns the existing run when the month already has one.
 */
export async function createPayrollRun(
  month: number,
  year: number,
  actorId: string,
): Promise<PayrollRun> {
  await assertActorNotOnLeave(actorId);
  assertPeriod(month, year);
  const existing = await db.payrollRun.findUnique({
    where: { year_month: { year, month } },
    include: runInclude,
  });
  if (existing) return mapRun(existing);

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
    const created = await db.payrollRun.create({
      data: {
        month,
        year,
        periodStart: window.salaryStart,
        periodEnd: window.salaryEnd,
        attendanceStart: window.attendanceStart,
        attendanceEnd: window.attendanceEnd,
        payDate: window.payDate,
        status: "calculated",
      },
    });
    for (const line of lines) {
      const item = await db.payrollItem.create({
        data: {
          payrollRunId: created.id,
          employeeId: line.employee.id,
          paymentStatus: "pending",
          ...line.data,
        },
      });
      if (line.payLines.length)
        await db.payrollItemLine.createMany({
          data: line.payLines.map((l) => ({ ...l, payrollItemId: item.id })),
        });
      const rate = Number(line.employee.user?.commissionRatePercent ?? 0);
      await syncCommissionPayout(
        item.id,
        line.userId,
        ctx.month,
        line.commission,
        rate > 0 ? r3((line.commission * 100) / rate) : 0,
        rate,
        actorId,
      );
    }
    await refreshPayrollTotals(created.id);
    return db.payrollRun.findUniqueOrThrow({
      where: { id: created.id },
      include: runInclude,
    });
  });
  return mapRun(run);
}

/** Recomputes a run that has not been submitted, after attendance, leave or salary changes. Manual bonus and deductions are kept. */
export async function recalculatePayrollRun(
  runId: string,
  actorId: string,
): Promise<PayrollRun> {
  const run = await db.payrollRun.findUniqueOrThrow({
    where: { id: runId },
    include: { items: { include: { lines: true } } },
  });
  if (!["draft", "calculated"].includes(run.status))
    throw new Error(
      formatMessage(serverTemplates.payrollIs0ItCanOnlyBe, { 0: run.status }),
    );
  const policy = await getHrPolicy();
  // The window follows the current policy, so a policy change takes effect on recalculation.
  const window = payrollWindow(policy, run.year, run.month);
  const employees = await eligibleEmployees(window);
  const ctx = await buildContext(run.year, run.month, window, employees);
  const recurring = await recurringPayFor(
    employees.map((e) => e.id),
    ctx.month,
  );
  await runAtomicMutation(async () => {
    await db.payrollRun.update({
      where: { id: runId },
      data: {
        attendanceStart: window.attendanceStart,
        attendanceEnd: window.attendanceEnd,
        payDate: window.payDate,
        periodStart: window.salaryStart,
        periodEnd: window.salaryEnd,
      },
    });
    const keep = new Set<string>();
    for (const employee of employees) {
      const existing = run.items.find((i) => i.employeeId === employee.id);
      // Manual lines are kept; recurring ones are taken afresh from the employee's recurring pay.
      const manual = (existing?.lines ?? []).filter(
        (l) => l.source === "manual",
      );
      const fresh = recurring.get(employee.id) ?? [];
      const line = lineFor(employee, ctx, {
        ...lineTotals([...manual, ...fresh]),
        adjustmentNote: existing?.adjustmentNote ?? null,
      });
      const item = existing
        ? await db.payrollItem.update({
            where: { id: existing.id },
            data: line.data,
          })
        : await db.payrollItem.create({
            data: {
              payrollRunId: runId,
              employeeId: employee.id,
              paymentStatus: "pending",
              ...line.data,
            },
          });
      await db.payrollItemLine.deleteMany({
        where: { payrollItemId: item.id, source: "recurring" },
      });
      if (fresh.length)
        await db.payrollItemLine.createMany({
          data: fresh.map((l) => ({
            ...l,
            payrollItemId: item.id,
            displayOrder: manual.length + l.displayOrder,
          })),
        });
      keep.add(item.id);
      const rate = Number(employee.user?.commissionRatePercent ?? 0);
      await syncCommissionPayout(
        item.id,
        line.userId,
        ctx.month,
        line.commission,
        rate > 0 ? r3((line.commission * 100) / rate) : 0,
        rate,
        actorId,
      );
    }
    // Employees who left or were suspended since the run was created drop out of it.
    const dropped = run.items.filter((i) => !keep.has(i.id)).map((i) => i.id);
    if (dropped.length)
      await db.payrollItem.deleteMany({ where: { id: { in: dropped } } });
    await refreshPayrollTotals(runId);
  });
  return mapRun(
    await db.payrollRun.findUniqueOrThrow({
      where: { id: runId },
      include: runInclude,
    }),
  );
}

export interface PayLineInput {
  category: string;
  label: string;
  amount: number;
  note?: string;
}

/**
 * Sets the manual additions and deductions of one employee's month before submission. Additions and
 * deductions are separate lists of named lines; recurring lines stay as they are. The rest of the line is kept.
 */
export async function setPayrollItemLines(
  itemId: string,
  input: {
    additions: PayLineInput[];
    deductions: PayLineInput[];
    note?: string | null;
  },
  actorId: string,
) {
  const item = await db.payrollItem.findUniqueOrThrow({
    where: { id: itemId },
    include: {
      payrollRun: {
        select: { id: true, status: true, year: true, month: true },
      },
      lines: true,
    },
  });
  if (!["draft", "calculated"].includes(item.payrollRun.status))
    throw new Error(
      formatMessage(serverTemplates.payrollIs0LinesCanOnlyBe, { 0: item.payrollRun.status }),
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
      const amount = r3(Number(l.amount));
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
  const recurring = item.lines.filter((l) => l.source === "recurring");
  const { bonus, otherDeductions } = lineTotals([...drafts, ...recurring]);
  const fixedPay = r3(
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
  await db.payrollItemLine.deleteMany({
    where: { payrollItemId: itemId, source: "manual" },
  });
  if (drafts.length)
    await db.payrollItemLine.createMany({
      data: drafts.map((d) => ({ ...d, payrollItemId: itemId })),
    });
  const updated = await db.payrollItem.update({
    where: { id: itemId },
    data: {
      bonus,
      otherDeductions,
      grossSalary: totals.gross,
      netSalary: totals.net,
      adjustmentNote: note,
      editedById: actorId,
      editedAt: new Date(),
    },
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
  const run = await db.payrollRun.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!run) throw new Error(serverMessages.payrollRunNotFound);
  if (run.status !== "calculated" && run.status !== "draft")
    throw new Error(formatMessage(serverTemplates.payrollRunCannotBeSubmittedStatusIs, { 0: run.status }));
  await db.payrollRun.update({ where: { id }, data: { status: "submitted" } });
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
    await db.$queryRaw`SELECT id FROM "PayrollRun" WHERE id = ${runId} FOR UPDATE`;
    const run = await db.payrollRun.findUniqueOrThrow({
      where: { id: runId },
      include: { items: true },
    });
    if (run.status !== "approved")
      throw new Error(
        formatMessage(serverTemplates.salariesCanBePaidOnceThePayroll, { 0: run.status }),
      );
    const targets = run.items.filter(
      (i) => i.paymentStatus !== "paid" && (!itemIds || itemIds.includes(i.id)),
    );
    if (itemIds && targets.length !== itemIds.length)
      throw new Error(serverMessages.thisSalaryIsAlreadyPaid);
    for (const item of targets) {
      await db.payrollItem.update({
        where: { id: item.id },
        data: {
          paymentStatus: "paid",
          paidAt,
          paidById: actorId,
          paymentMethod: input.method,
          paymentReference: input.reference?.trim().slice(0, 120) || null,
        },
      });
      await db.payslip.upsert({
        where: { payrollItemId: item.id },
        update: {},
        create: {
          payrollItemId: item.id,
          employeeId: item.employeeId,
          month: run.month,
          year: run.year,
          issuedAt: new Date(),
        },
      });
    }
    const remaining = await db.payrollItem.count({
      where: { payrollRunId: runId, paymentStatus: { not: "paid" } },
    });
    if (remaining === 0)
      await db.payrollRun.update({
        where: { id: runId },
        data: { status: "paid", paidAt },
      });
    return db.payrollRun.findUniqueOrThrow({
      where: { id: runId },
      include: runInclude,
    });
  });
}

/** Records one employee's salary payment; the run becomes paid when every salary in it is paid. */
export async function payPayrollItem(
  itemId: string,
  input: ItemPaymentInput,
  actorId: string,
) {
  await assertActorNotOnLeave(actorId);
  const item = await db.payrollItem.findUniqueOrThrow({
    where: { id: itemId },
    select: { payrollRunId: true },
  });
  return mapRun(await payItems(item.payrollRunId, [itemId], input, actorId));
}

/** Pays every salary still unpaid in an approved run. */
export async function markPayrollAsPaid(
  id: string,
  actorId: string,
  input: ItemPaymentInput = { method: "bank_transfer" },
): Promise<PayrollRun> {
  await assertActorNotOnLeave(actorId);
  return mapRun(await payItems(id, null, input, actorId));
}

export async function listPayrollRuns(): Promise<PayrollRun[]> {
  const runs = await db.payrollRun.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: runInclude,
  });
  return runs.map(mapRun);
}

/** Everything the individual salary page shows: the line, its period, and the attendance and leave behind it. */
export async function getPayrollItemDetail(itemId: string) {
  const item = await db.payrollItem.findUnique({
    where: { id: itemId },
    include: {
      payrollRun: true,
      payslip: { select: { id: true, issuedAt: true } },
      commissionPayout: {
        select: { basisAmount: true, ratePercent: true, amount: true },
      },
      lines: { orderBy: [{ kind: "asc" }, { displayOrder: "asc" }] },
      employee: {
        select: {
          id: true,
          employeeNumber: true,
          firstNameEn: true,
          lastNameEn: true,
          firstNameAr: true,
          lastNameAr: true,
          jobTitleEn: true,
          jobTitleAr: true,
          hireDate: true,
          userId: true,
          department: { select: { nameEn: true, nameAr: true } },
        },
      },
    },
  });
  if (!item) return null;
  const run = item.payrollRun;
  const start = run.attendanceStart ?? run.periodStart;
  const end = run.attendanceEnd ?? run.periodEnd;
  const [attendance, leaves, editedBy, paidBy, siblings] = await Promise.all([
    db.attendanceEntry.findMany({
      where: { employeeId: item.employeeId, date: { gte: start, lte: end } },
      orderBy: { date: "asc" },
      include: { shiftType: { select: { nameEn: true, nameAr: true } } },
    }),
    db.leaveRequest.findMany({
      where: {
        employeeId: item.employeeId,
        status: "approved",
        startDate: { lte: end },
        endDate: { gte: start },
      },
      orderBy: { startDate: "asc" },
      include: {
        leaveType: { select: { code: true, nameEn: true, nameAr: true } },
      },
    }),
    item.editedById
      ? db.user.findUnique({
          where: { id: item.editedById },
          select: { fullName: true },
        })
      : null,
    item.paidById
      ? db.user.findUnique({
          where: { id: item.paidById },
          select: { fullName: true },
        })
      : null,
    db.payrollItem.findMany({
      where: { payrollRunId: run.id },
      select: {
        id: true,
        employee: { select: { firstNameEn: true, lastNameEn: true } },
      },
      orderBy: [
        { employee: { firstNameEn: "asc" } },
        { employee: { lastNameEn: "asc" } },
      ],
    }),
  ]);
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
