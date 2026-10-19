import { serverTemplates, formatMessage, serverMessages } from "@ishoot/locales";

import type { Prisma } from "@prisma/client";
import { db, runAtomicMutation } from "../db";
import { ROUTES } from "../constants/routes";
import {
  calculateContributions,
  parsePayrollSettings,
} from "../payroll-calculation";
import {
  computeEmployeePayroll,
  daysInMonth,
  dayKey,
  r3,
  utcDay,
  type DayPortion,
  type LeaveInWindow,
} from "../hr/payroll-engine";
import {
  accruedLeaveToDate,
  leavingIndemnity,
  parseGratuityRules,
  partMonthPay,
  validateGratuityRules,
  type GratuityRules,
} from "../hr/final-settlement";
import {
  cancelPendingApprovals,
  registerApprovalFinalizer,
  submitForApproval,
} from "../services/approval-engine";
import { attendanceForPayroll } from "./attendance";
import { getHrPolicy, holidaySet, toLeaveTypeRules } from "./hr-settings";
import { commissionAmount, commissionsForRange } from "./sales-attribution";
import { payExpenseClaim } from "./expense-claims";
import { getNextSequenceNumber } from "./sequence";
import { loadGosiContext, schemeContributions } from "./social-insurance";
import { validateSignatureImage } from "../services/signature-image";
import { profileInForce } from "../hr/social-insurance";

import {
  SETTLEMENT_LINE_CATEGORIES,
  SETTLEMENT_PAYMENT_METHODS,
  SETTLEMENT_REASONS,
} from "../constants/settlements";
export {
  SETTLEMENT_LINE_CATEGORIES,
  SETTLEMENT_PAYMENT_METHODS,
  SETTLEMENT_REASONS,
  SETTLEMENT_STATUSES,
} from "../constants/settlements";

const GCC = new Set(["SA", "KW", "AE", "QA", "OM"]);
const DAY = 86_400_000;
const monthKey = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, "0")}`;
const addMonth = (key: string, n: number) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return monthKey(d.getUTCFullYear(), d.getUTCMonth() + 1);
};
const monthStart = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return utcDay(y, m - 1, 1);
};
const monthEnd = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return utcDay(y, m, 0);
};

// ---------- Rules ----------

export interface SettlementRules {
  gratuity: GratuityRules;
  leaveEncashmentBase: "basic" | "fixed";
}

export async function getSettlementRules(): Promise<SettlementRules> {
  const row = await db.hrPolicy.findUnique({
    where: { id: "default" },
    select: { gratuityRules: true, leaveEncashmentBase: true },
  });
  return {
    gratuity: parseGratuityRules(row?.gratuityRules),
    leaveEncashmentBase:
      row?.leaveEncashmentBase === "basic" ? "basic" : "fixed",
  };
}

export async function updateSettlementRules(
  input: SettlementRules,
  actorId: string,
) {
  const gratuity = validateGratuityRules(input.gratuity);
  if (!["basic", "fixed"].includes(input.leaveEncashmentBase))
    throw new Error(serverMessages.chooseThePayUnusedLeaveIsPaidAt);
  await db.hrPolicy.upsert({
    where: { id: "default" },
    update: {
      gratuityRules: gratuity as unknown as Prisma.InputJsonValue,
      leaveEncashmentBase: input.leaveEncashmentBase,
      updatedById: actorId,
    },
    create: {
      id: "default",
      gratuityRules: gratuity as unknown as Prisma.InputJsonValue,
      leaveEncashmentBase: input.leaveEncashmentBase,
      updatedById: actorId,
    },
  });
  return getSettlementRules();
}

// ---------- Calculation ----------

interface LineDraft {
  kind: "addition" | "deduction";
  category: string;
  labelEn: string;
  labelAr: string;
  amount: number;
  details?: Record<string, unknown>;
}

const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTHS_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];
const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return { en: `${MONTHS_EN[m - 1]} ${y}`, ar: `${MONTHS_AR[m - 1]} ${y}` };
};

/**
 * Works out everything owed to and by the employee up to their last working day: salary for months payroll has not
 * covered (with absences, overtime and the days after leaving), approved salaries not yet paid, commission, unused
 * annual leave, approved expense claims, leaving indemnity, social insurance under the 1st-of-month rule, recurring
 * additions and deductions, and loans still to be repaid. Returns the lines, totals and what they were based on.
 */
export async function calculateSettlement(
  employeeId: string,
  lastWorkingDay: Date,
) {
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    include: {
      user: { select: { id: true, commissionRatePercent: true } },
      employmentRecords: {
        where: { effectiveFrom: { lte: lastWorkingDay } },
        orderBy: { effectiveFrom: "desc" },
      },
    },
  });
  if (!employee) throw new Error(serverMessages.employeeNotFound);
  if (lastWorkingDay < employee.hireDate)
    throw new Error(
      serverMessages.theLastWorkingDayCannotBeBeforeThe,
    );
  const record = employee.employmentRecords[0];
  if (!record)
    throw new Error(serverMessages.theEmployeeHasNoSalaryOnRecord);
  const pay = {
    basic: Number(record.basicSalary),
    housing: Number(record.housingAllowance),
    transport: Number(record.transportAllowance),
    other: Number(record.otherAllowances),
  };
  const fixedPay = r3(pay.basic + pay.housing + pay.transport + pay.other);
  const [policy, rules, gosi] = await Promise.all([
    getHrPolicy(),
    getSettlementRules(),
    loadGosiContext([employeeId]),
  ]);
  const lines: LineDraft[] = [];
  const warnings: string[] = [];
  let employerContributions = 0;
  const lastMonth = monthKey(
    lastWorkingDay.getUTCFullYear(),
    lastWorkingDay.getUTCMonth() + 1,
  );

  // 1. Approved salaries not yet paid.
  const items = await db.payrollItem.findMany({
    where: {
      employeeId,
      payrollRun: {
        OR: [
          { year: { lt: lastWorkingDay.getUTCFullYear() } },
          {
            year: lastWorkingDay.getUTCFullYear(),
            month: { lte: lastWorkingDay.getUTCMonth() + 1 },
          },
        ],
      },
    },
    select: {
      id: true,
      netSalary: true,
      paymentStatus: true,
      payrollRun: { select: { year: true, month: true, status: true } },
    },
  });
  const covered = new Set(
    items
      .filter((i) =>
        ["submitted", "approved", "paid", "closed"].includes(
          i.payrollRun.status,
        ),
      )
      .map((i) => monthKey(i.payrollRun.year, i.payrollRun.month)),
  );
  for (const item of items.filter(
    (i) => i.paymentStatus !== "paid" && i.payrollRun.status === "approved",
  )) {
    const label = monthLabel(
      monthKey(item.payrollRun.year, item.payrollRun.month),
    );
    lines.push({
      kind: "addition",
      category: "unpaid_salary",
      labelEn: `Approved salary not yet paid: ${label.en}`,
      labelAr: `راتب معتمد لم يُصرف: ${label.ar}`,
      amount: Number(item.netSalary),
      details: { payrollItemId: item.id },
    });
  }
  if (items.some((i) => i.payrollRun.status === "submitted"))
    warnings.push("payroll_awaiting_approval");

  // 2. Months payroll has not covered, up to the last working day.
  // Include gaps within recorded payroll history as well as months since its last period.
  // Older service may predate payroll adoption; review it rather than assuming it was never paid.
  const hireMonth = monthKey(
    employee.hireDate.getUTCFullYear(),
    employee.hireDate.getUTCMonth() + 1,
  );
  const firstRecorded = items
    .map((i) => monthKey(i.payrollRun.year, i.payrollRun.month))
    .sort()[0];
  const first =
    firstRecorded && firstRecorded > hireMonth ? firstRecorded : hireMonth;
  if (first > hireMonth) warnings.push("before_payroll_history");
  const unpaidMonths: string[] = [];
  for (let m = lastMonth; m >= first; m = addMonth(m, -1))
    if (!covered.has(m)) unpaidMonths.unshift(m);

  const typeRows = await db.leaveType.findMany();
  const leaveRows = unpaidMonths.length
    ? await db.leaveRequest.findMany({
        where: {
          employeeId,
          status: "approved",
          startDate: {
            gte: utcDay(monthStart(unpaidMonths[0]).getUTCFullYear(), 0, 1),
            lte: lastWorkingDay,
          },
        },
        orderBy: { startDate: "asc" },
      })
    : [];
  for (const month of unpaidMonths) {
    const start = monthStart(month);
    const end = monthEnd(month);
    const monthRecord =
      employee.employmentRecords.find((r) => r.effectiveFrom <= end) ?? record;
    const pay = {
      basic: Number(monthRecord.basicSalary),
      housing: Number(monthRecord.housingAllowance),
      transport: Number(monthRecord.transportAllowance),
      other: Number(monthRecord.otherAllowances),
    };
    const fixedPay = r3(pay.basic + pay.housing + pay.transport + pay.other);
    const settings = parsePayrollSettings(monthRecord.payrollSettings);
    const label = monthLabel(month);
    const isLast = month === lastMonth;
    const attendanceEnd = isLast ? lastWorkingDay : end;
    const attendanceStart =
      employee.hireDate > start ? employee.hireDate : start;
    const [holidays, attendance] = await Promise.all([
      holidaySet(start, end),
      attendanceForPayroll([employeeId], attendanceStart, attendanceEnd),
    ]);
    const taken = new Map<string, number>();
    const leaves: LeaveInWindow[] = [];
    for (const row of leaveRows) {
      const k = `${row.leaveTypeId}:${row.startDate.getUTCFullYear()}`;
      const before = taken.get(k) ?? 0;
      taken.set(k, before + Number(row.days));
      if (row.endDate < attendanceStart || row.startDate > attendanceEnd)
        continue;
      const type = typeRows.find((t) => t.id === row.leaveTypeId)!;
      const rules = toLeaveTypeRules(type);
      leaves.push({
        typeCode: rules.code,
        type: rules,
        start: row.startDate,
        end: row.endDate,
        portion: row.dayPortion as DayPortion,
        hourFraction: row.dayPortion === "hours" ? Number(row.days) : null,
        takenBefore: before,
      });
    }
    const breakdown = computeEmployeePayroll({
      hireDate: employee.hireDate,
      pay,
      window: {
        salaryStart: start,
        salaryEnd: end,
        attendanceStart,
        attendanceEnd,
        payDate: lastWorkingDay,
      },
      policy,
      holidays,
      attendance: attendance.map(({ employeeId: _e, ...a }) => a),
      leaves,
    });
    lines.push({
      kind: "addition",
      category: "salary",
      labelEn: `Salary: ${label.en}`,
      labelAr: `الراتب: ${label.ar}`,
      amount: fixedPay,
      details: { month, pay },
    });
    if (breakdown.overtimePay > 0)
      lines.push({
        kind: "addition",
        category: "overtime",
        labelEn: `Overtime: ${label.en}`,
        labelAr: `العمل الإضافي: ${label.ar}`,
        amount: breakdown.overtimePay,
        details: { month, overtime: breakdown.summary.overtime },
      });
    if (breakdown.shiftAllowance > 0)
      lines.push({
        kind: "addition",
        category: "allowance",
        labelEn: `Shift allowance: ${label.en}`,
        labelAr: `بدل المناوبات: ${label.ar}`,
        amount: breakdown.shiftAllowance,
        details: { month },
      });
    const absence = r3(
      breakdown.absenceDeduction +
        breakdown.leaveDeduction +
        breakdown.latenessDeduction,
    );
    if (absence > 0)
      lines.push({
        kind: "deduction",
        category: "absence",
        labelEn: `Absence, unpaid leave and days before joining: ${label.en}`,
        labelAr: `الغياب والإجازات غير المدفوعة وأيام ما قبل الالتحاق: ${label.ar}`,
        amount: absence,
        details: { month, summary: breakdown.summary },
      });
    if (isLast && lastWorkingDay < end) {
      const after = new Date(lastWorkingDay.getTime() + DAY);
      lines.push({
        kind: "deduction",
        category: "not_employed",
        labelEn: `Days after the last working day: ${label.en}`,
        labelAr: `الأيام بعد آخر يوم عمل: ${label.ar}`,
        amount: partMonthPay(fixedPay, after, end),
        details: { from: dayKey(after), to: dayKey(end) },
      });
    }
    // Social insurance for the month: in full if employed on its 1st, nothing for a month joined after the 1st.
    const [year, monthNumber] = month.split("-").map(Number);
    const scheme = schemeContributions(gosi, employeeId, {
      pay,
      hireDate: employee.hireDate,
      exitDate: lastWorkingDay,
      year,
      month: monthNumber,
    });
    let employeeShare = 0;
    if (scheme) {
      employeeShare = scheme.employee;
      employerContributions += scheme.employer;
    } else if (settings && employee.hireDate <= start) {
      const legacy = calculateContributions(fixedPay, settings, month);
      employeeShare = legacy.employee;
      employerContributions += legacy.employer;
    }
    if (employeeShare > 0)
      lines.push({
        kind: "deduction",
        category: "social_insurance",
        labelEn: `Social insurance (employee share): ${label.en}`,
        labelAr: `التأمين الاجتماعي (حصة الموظف): ${label.ar}`,
        amount: employeeShare,
        details: { month, lines: scheme?.lines ?? null },
      });
  }

  // 3. Recurring additions and deductions for those months; loans and advances still to be repaid after leaving.
  const recurring = await db.employeeRecurringPay.findMany({
    where: { employeeId, isActive: true },
  });
  for (const r of recurring) {
    const months = unpaidMonths.filter(
      (m) => m >= r.startMonth && (!r.endMonth || m <= r.endMonth),
    );
    const amount = Number(r.amount);
    if (months.length)
      lines.push({
        kind: r.kind === "addition" ? "addition" : "deduction",
        category:
          r.kind === "addition"
            ? "allowance"
            : r.category === "loan_repayment"
              ? "loan"
              : r.category === "advance_recovery"
                ? "advance"
                : r.category === "damage"
                  ? "damage"
                  : "other",
        labelEn: `${r.label} (${months.length} month${months.length > 1 ? "s" : ""})`,
        labelAr: `${r.label} (${months.length} شهر)`,
        amount: r3(amount * months.length),
        details: { recurringId: r.id, months },
      });
    if (
      r.kind === "deduction" &&
      ["loan_repayment", "advance_recovery", "damage"].includes(r.category)
    ) {
      if (!r.endMonth) {
        warnings.push(`open_ended_recovery:${r.label}`);
        continue;
      }
      const remaining: string[] = [];
      for (
        let m = addMonth(lastMonth, 1);
        m <= r.endMonth && remaining.length < 240;
        m = addMonth(m, 1)
      )
        if (m >= r.startMonth) remaining.push(m);
      if (remaining.length)
        lines.push({
          kind: "deduction",
          category:
            r.category === "loan_repayment"
              ? "loan"
              : r.category === "advance_recovery"
                ? "advance"
                : "damage",
          labelEn: `Balance still owed: ${r.label} (${remaining.length} instalment${remaining.length > 1 ? "s" : ""})`,
          labelAr: `الرصيد المتبقي: ${r.label} (${remaining.length} قسط)`,
          amount: r3(amount * remaining.length),
          details: { recurringId: r.id, months: remaining },
        });
    }
  }

  // 4. Commission collected since the last payroll window, less any already paid for those months.
  const rate = Number(employee.user?.commissionRatePercent ?? 0);
  if (employee.user && rate > 0 && unpaidMonths.length) {
    for (const month of unpaidMonths) {
      const from = monthStart(month);
      const to =
        month === lastMonth
          ? new Date(lastWorkingDay.getTime() + DAY)
          : monthStart(addMonth(month, 1));
      const earned = (
        await commissionsForRange({ gte: from, lt: to }, [employee.user.id])
      ).get(employee.user.id);
      const paid = await db.commissionPayout.findUnique({
        where: {
          userId_periodMonth: { userId: employee.user.id, periodMonth: month },
        },
      });
      const paidAmount = Number(paid?.amount ?? 0);
      const basis = r3(earned?.net ?? 0);
      const amount = r3(commissionAmount(basis, rate) - paidAmount);
      if (amount > 0)
        lines.push({
          kind: "addition",
          category: "commission",
          labelEn: `Unpaid sales commission: ${monthLabel(month).en}`,
          labelAr: `عمولة مبيعات لم تصرف: ${monthLabel(month).ar}`,
          amount,
          details: {
            userId: employee.user.id,
            month,
            basis,
            ratePercent: rate,
            paidAmount,
          },
        });
    }
  }

  // 5. Unused annual leave (or leave taken ahead of what was earned).
  const annual = typeRows.find((t) => t.code === "annual" && t.isActive);
  if (annual) {
    const rulesForType = toLeaveTypeRules(annual);
    const year = lastWorkingDay.getUTCFullYear();
    const [taken, adjustments] = await Promise.all([
      db.leaveRequest.aggregate({
        where: {
          employeeId,
          leaveTypeId: annual.id,
          status: "approved",
          startDate: { gte: utcDay(year, 0, 1), lte: lastWorkingDay },
        },
        _sum: { days: true },
      }),
      db.leaveAdjustment.aggregate({
        where: { employeeId, leaveTypeId: annual.id, year },
        _sum: { days: true },
      }),
    ]);
    // Carried over from last year: last year's closing balance up to the carry-over cap.
    const lastYear = year - 1;
    const [takenLast, adjLast] = await Promise.all([
      db.leaveRequest.aggregate({
        where: {
          employeeId,
          leaveTypeId: annual.id,
          status: "approved",
          startDate: {
            gte: utcDay(lastYear, 0, 1),
            lte: utcDay(lastYear, 11, 31),
          },
        },
        _sum: { days: true },
      }),
      db.leaveAdjustment.aggregate({
        where: { employeeId, leaveTypeId: annual.id, year: lastYear },
        _sum: { days: true },
      }),
    ]);
    const lastYearEntitled =
      employee.hireDate <= utcDay(lastYear, 11, 31)
        ? accruedLeaveToDate({
            daysPerYear: rulesForType.daysAllowedPerYear,
            accrual: rulesForType.accrual,
            hireDate: employee.hireDate,
            lastWorkingDay: utcDay(lastYear, 11, 31),
          })
        : 0;
    const carried = Math.min(
      rulesForType.maxCarryOverDays,
      Math.max(
        0,
        lastYearEntitled +
          Number(adjLast._sum.days ?? 0) -
          Number(takenLast._sum.days ?? 0),
      ),
    );
    const accrued = accruedLeaveToDate({
      daysPerYear: rulesForType.daysAllowedPerYear,
      accrual: rulesForType.accrual,
      hireDate: employee.hireDate,
      lastWorkingDay,
    });
    const balance =
      Math.round(
        (accrued +
          carried +
          Number(adjustments._sum.days ?? 0) -
          Number(taken._sum.days ?? 0)) *
          100,
      ) / 100;
    const base = rules.leaveEncashmentBase === "basic" ? pay.basic : fixedPay;
    const divisor =
      policy.dailyRateBasis === "30"
        ? 30
        : daysInMonth(
            lastWorkingDay.getUTCFullYear(),
            lastWorkingDay.getUTCMonth() + 1,
          );
    const dailyRate = base / divisor;
    const details = {
      accrued,
      carriedOver: Math.round(carried * 100) / 100,
      adjustments: Number(adjustments._sum.days ?? 0),
      taken: Number(taken._sum.days ?? 0),
      balance,
      dailyRate: r3(dailyRate),
      base: rules.leaveEncashmentBase,
    };
    if (balance > 0)
      lines.push({
        kind: "addition",
        category: "leave_encashment",
        labelEn: `Unused annual leave (${balance} days)`,
        labelAr: `رصيد الإجازة السنوية غير المستخدم (${balance} يوم)`,
        amount: r3(balance * dailyRate),
        details,
      });
    else if (balance < 0)
      lines.push({
        kind: "deduction",
        category: "leave_advance",
        labelEn: `Annual leave taken ahead of entitlement (${Math.abs(balance)} days)`,
        labelAr: `إجازة سنوية مأخوذة قبل استحقاقها (${Math.abs(balance)} يوم)`,
        amount: r3(-balance * dailyRate),
        details,
      });
  }

  // 6. Approved expense claims still to be reimbursed.
  if (employee.user) {
    const claims = await db.expenseClaim.findMany({
      where: {
        claimantId: employee.user.id,
        status: { in: ["approved", "scheduled"] },
      },
    });
    for (const claim of claims) {
      if (claim.currency !== "BHD") {
        warnings.push(`foreign_currency_claim:${claim.claimNumber}`);
        continue;
      }
      lines.push({
        kind: "addition",
        category: "reimbursement",
        labelEn: `Expense claim ${claim.claimNumber}`,
        labelAr: `مطالبة المصروف ${claim.claimNumber}`,
        amount: Number(claim.amount),
        details: { claimId: claim.id },
      });
    }
    const pendingClaims = await db.expenseClaim.count({
      where: { claimantId: employee.user.id, status: "submitted" },
    });
    if (pendingClaims)
      warnings.push(`claims_awaiting_approval:${pendingClaims}`);
  }

  // 7. Leaving indemnity for staff outside the SIO end-of-service scheme.
  const profile = profileInForce(
    gosi.profiles.get(employeeId) ?? [],
    lastWorkingDay.getUTCFullYear(),
    lastWorkingDay.getUTCMonth() + 1,
  );
  const category =
    profile?.category ??
    (employee.nationality === "BH"
      ? "bahraini"
      : employee.nationality && GCC.has(employee.nationality)
        ? "gcc"
        : "expat");
  const indemnity = leavingIndemnity({
    rules: rules.gratuity,
    category,
    hireDate: employee.hireDate,
    lastWorkingDay,
    monthlyWage: rules.gratuity.wageBasis === "basic" ? pay.basic : fixedPay,
  });
  if (indemnity.amount > 0)
    lines.push({
      kind: "addition",
      category: "indemnity",
      labelEn: `Leaving indemnity (${indemnity.years} years)`,
      labelAr: `مكافأة نهاية الخدمة (${indemnity.years} سنة)`,
      amount: indemnity.amount,
      details: { ...indemnity, category, rules: rules.gratuity },
    });

  // Things to settle by hand before paying.
  const [assetsHeld, openHandovers, pendingLeave] = await Promise.all([
    db.asset.count({ where: { holderEmployeeId: employeeId } }),
    db.employeeHandover.count({
      where: {
        employeeId,
        kind: "exit",
        status: { in: ["open", "pending_approval"] },
      },
    }),
    db.leaveRequest.count({ where: { employeeId, status: "pending" } }),
  ]);
  if (assetsHeld) warnings.push(`assets_held:${assetsHeld}`);
  if (openHandovers) warnings.push("exit_handover_open");
  if (pendingLeave) warnings.push(`leave_pending:${pendingLeave}`);

  return {
    lines: lines
      .filter((l) => l.amount > 0)
      .map((l) => ({ ...l, amount: r3(l.amount) })),
    employerContributions: r3(employerContributions),
    calculation: {
      lastWorkingDay: dayKey(lastWorkingDay),
      hireDate: dayKey(employee.hireDate),
      category,
      pay,
      fixedPay,
      unpaidMonths,
      gosiRegistered: !!profile,
      firstOfMonthRule: gosi.rules.firstOfMonthRule,
      indemnity,
      warnings,
      calculatedAt: new Date().toISOString(),
    },
  };
}

function totalsOf(lines: Array<{ kind: string; amount: unknown }>) {
  const sum = (kind: string) =>
    r3(
      lines
        .filter((l) => l.kind === kind)
        .reduce((total, l) => total + Number(l.amount), 0),
    );
  const additions = sum("addition");
  const deductions = sum("deduction");
  return {
    totalAdditions: additions,
    totalDeductions: deductions,
    netAmount: r3(additions - deductions),
  };
}

async function writeAutoLines(
  settlementId: string,
  employeeId: string,
  lastWorkingDay: Date,
) {
  const result = await calculateSettlement(employeeId, lastWorkingDay);
  await db.finalSettlementLine.deleteMany({
    where: { settlementId, source: "auto" },
  });
  if (result.lines.length)
    await db.finalSettlementLine.createMany({
      data: result.lines.map((l, i) => ({
        settlementId,
        kind: l.kind,
        category: l.category,
        labelEn: l.labelEn,
        labelAr: l.labelAr,
        amount: l.amount,
        source: "auto",
        details: (l.details ?? null) as Prisma.InputJsonValue,
        displayOrder: i,
      })),
    });
  const all = await db.finalSettlementLine.findMany({
    where: { settlementId },
  });
  await db.finalSettlement.update({
    where: { id: settlementId },
    data: {
      ...totalsOf(all),
      employerContributions: result.employerContributions,
      calculation: result.calculation as unknown as Prisma.InputJsonValue,
      calculatedAt: new Date(),
    },
  });
}

const parseDay = (value: string, message: string) => {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value ?? "") ||
    !Number.isFinite(Date.parse(value))
  )
    throw new Error(message);
  const date = new Date(`${value}T00:00:00Z`);
  if (date.toISOString().slice(0, 10) !== value) throw new Error(message);
  return date;
};

export interface FinalSettlementInput {
  employee_id: string;
  reason: string;
  last_working_day: string;
  handover_id?: string | null;
  notes?: string | null;
}

/** Opens a settlement for a leaving employee and works out every line. One open settlement per employee. */
export async function createFinalSettlement(
  input: FinalSettlementInput,
  actorId: string,
) {
  if (!(SETTLEMENT_REASONS as readonly string[]).includes(input.reason))
    throw new Error(serverMessages.chooseWhyTheEmployeeIsLeaving);
  const lastWorkingDay = parseDay(
    input.last_working_day,
    "Choose the last working day",
  );
  return runAtomicMutation(async () => {
    const open = await db.finalSettlement.findFirst({
      where: {
        employeeId: input.employee_id,
        status: { in: ["draft", "submitted", "approved"] },
      },
      select: { id: true },
    });
    if (open)
      throw new Error(serverMessages.thisEmployeeAlreadyHasASettlement);
    const created = await db.finalSettlement.create({
      data: {
        reference: await getNextSequenceNumber(
          "FST",
          lastWorkingDay.getUTCFullYear(),
        ),
        employeeId: input.employee_id,
        handoverId: input.handover_id || null,
        reason: input.reason,
        lastWorkingDay,
        notes: input.notes?.trim().slice(0, 2000) || null,
        createdById: actorId,
      },
    });
    await writeAutoLines(created.id, input.employee_id, lastWorkingDay);
    return db.finalSettlement.findUniqueOrThrow({ where: { id: created.id } });
  });
}

async function editable(id: string) {
  const settlement = await db.finalSettlement.findUnique({ where: { id } });
  if (!settlement) throw new Error(serverMessages.settlementNotFound);
  if (!["draft", "rejected"].includes(settlement.status))
    throw new Error(
      formatMessage(serverTemplates.theSettlementIsXItCanOnlyBeChanged, { 0: settlement.status }),
    );
  return settlement;
}

/** Works the figures out again (after attendance, leave, claims or pay change). Manual lines are kept. */
export async function recalculateFinalSettlement(
  id: string,
  input?: { last_working_day?: string; reason?: string; notes?: string | null },
) {
  return runAtomicMutation(async () => {
    const settlement = await editable(id);
    const lastWorkingDay = input?.last_working_day
      ? parseDay(input.last_working_day, "Choose the last working day")
      : settlement.lastWorkingDay;
    if (
      input?.reason &&
      !(SETTLEMENT_REASONS as readonly string[]).includes(input.reason)
    )
      throw new Error(serverMessages.chooseWhyTheEmployeeIsLeaving);
    await db.finalSettlement.update({
      where: { id },
      data: {
        lastWorkingDay,
        status: "draft",
        ...(input?.reason ? { reason: input.reason } : {}),
        ...(input?.notes !== undefined
          ? { notes: input.notes?.trim().slice(0, 2000) || null }
          : {}),
      },
    });
    await writeAutoLines(id, settlement.employeeId, lastWorkingDay);
  });
}

export interface SettlementManualLine {
  kind: "addition" | "deduction";
  category: string;
  label_en: string;
  label_ar: string;
  amount: number;
  note?: string | null;
}

/** Replaces the hand-entered lines (notice pay, penalties, unreturned equipment…); calculated lines stay. */
export async function setFinalSettlementManualLines(
  id: string,
  lines: SettlementManualLine[],
) {
  if (lines.length > 40)
    throw new Error(serverMessages.aSettlementCanHaveAtMost40);
  const drafts = lines.map((l, i) => {
    if (
      !["addition", "deduction"].includes(l.kind) ||
      !(SETTLEMENT_LINE_CATEGORIES[l.kind] as readonly string[]).includes(
        l.category,
      )
    )
      throw new Error(serverMessages.chooseACategoryForEveryLine);
    const labelEn = l.label_en?.trim().slice(0, 160);
    const labelAr = l.label_ar?.trim().slice(0, 160) || labelEn;
    if (!labelEn)
      throw new Error(serverMessages.everyAdditionAndDeductionNeedsA);
    const amount = r3(Number(l.amount));
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000)
      throw new Error(serverMessages.everyLineNeedsAnAmountAbove);
    return {
      settlementId: id,
      kind: l.kind,
      category: l.category,
      labelEn,
      labelAr: labelAr!,
      amount,
      source: "manual",
      details: l.note?.trim()
        ? { note: l.note.trim().slice(0, 300) }
        : undefined,
      displayOrder: 1000 + i,
    };
  });
  return runAtomicMutation(async () => {
    await editable(id);
    await db.finalSettlementLine.deleteMany({
      where: { settlementId: id, source: "manual" },
    });
    if (drafts.length)
      await db.finalSettlementLine.createMany({
        data: drafts.map((d) => ({
          ...d,
          details: (d.details ?? null) as Prisma.InputJsonValue,
        })),
      });
    const all = await db.finalSettlementLine.findMany({
      where: { settlementId: id },
    });
    await db.finalSettlement.update({ where: { id }, data: totalsOf(all) });
  });
}

export async function submitFinalSettlement(id: string, actorId: string) {
  return runAtomicMutation(async () => {
    const settlement = await editable(id);
    await db.finalSettlement.update({
      where: { id },
      data: { status: "submitted" },
    });
    return submitForApproval({
      targetType: "final_settlement",
      targetId: id,
      requesterId: actorId,
      policySnapshot: {
        reference: settlement.reference,
        netAmount: Number(settlement.netAmount),
      },
      diffPayload: {
        netAmount: Number(settlement.netAmount),
        totalAdditions: Number(settlement.totalAdditions),
        totalDeductions: Number(settlement.totalDeductions),
      },
    });
  });
}

export async function cancelFinalSettlement(id: string) {
  return runAtomicMutation(async () => {
    const settlement = await db.finalSettlement.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!settlement) throw new Error(serverMessages.settlementNotFound);
    if (
      !["draft", "submitted", "rejected", "approved"].includes(
        settlement.status,
      )
    )
      throw new Error(serverMessages.onlyAnUnpaidSettlementCanBeCancelled);
    await cancelPendingApprovals("final_settlement", id);
    await db.finalSettlement.update({
      where: { id },
      data: { status: "cancelled" },
    });
  });
}

/** The employee's acknowledgement, signed on the spot on the HR device (or with their saved signature where allowed). */
export async function signFinalSettlementAsEmployee(
  id: string,
  input: { signature: string; signer_name: string },
) {
  validateSignatureImage(input.signature);
  const signerName = input.signer_name?.trim().slice(0, 120);
  if (!signerName || signerName.length < 2)
    throw new Error(serverMessages.enterYourFullName);
  const settlement = await db.finalSettlement.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!settlement) throw new Error(serverMessages.settlementNotFound);
  if (!["approved", "paid"].includes(settlement.status))
    throw new Error(serverMessages.theEmployeeSignsOnceTheSettlement);
  return db.finalSettlement.update({
    where: { id },
    data: {
      employeeSignature: input.signature,
      employeeSignerName: signerName,
      employeeSignedAt: new Date(),
    },
  });
}

/**
 * Records payment. Everything the settlement paid out is closed with it: the salaries and claims it included,
 * recurring pay and loans, wage support and the GOSI registration end, and the employee is marked as left.
 */
export async function payFinalSettlement(
  id: string,
  input: { method: string; reference?: string | null; paid_on?: string | null },
  actorId: string,
) {
  if (!(SETTLEMENT_PAYMENT_METHODS as readonly string[]).includes(input.method))
    throw new Error(serverMessages.chooseHowTheSettlementWasPaid);
  const paidAt = input.paid_on
    ? parseDay(input.paid_on, "Choose a payment date that is not in the future")
    : new Date();
  if (
    input.paid_on &&
    input.paid_on >
      new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10)
  )
    throw new Error(serverMessages.chooseAPaymentDateThatIsNot);
  return runAtomicMutation(async () => {
    await db.$queryRaw`SELECT id FROM "FinalSettlement" WHERE id = ${id} FOR UPDATE`;
    const settlement = await db.finalSettlement.findUniqueOrThrow({
      where: { id },
      include: { lines: true },
    });
    if (settlement.status !== "approved")
      throw new Error(
        formatMessage(serverTemplates.theSettlementCanBePaidOnceItIsApproved, { 0: settlement.status }),
      );
    const detail = (line: (typeof settlement.lines)[number], key: string) =>
      (line.details as Record<string, unknown> | null)?.[key] as
        string | undefined;
    const reference =
      input.reference?.trim().slice(0, 120) || settlement.reference;
    for (const line of settlement.lines) {
      const payrollItemId = detail(line, "payrollItemId");
      if (payrollItemId) {
        await db.$queryRaw`SELECT id FROM "PayrollItem" WHERE id = ${payrollItemId} FOR UPDATE`;
        const item = await db.payrollItem.findUnique({
          where: { id: payrollItemId },
          include: { payrollRun: true },
        });
        if (
          !item ||
          item.paymentStatus === "paid" ||
          item.payrollRun.status !== "approved" ||
          Number(item.netSalary) !== Number(line.amount)
        )
          throw new Error(
            serverMessages.settlementPaymentChanged,
          );
        await db.payrollItem.updateMany({
          where: { id: payrollItemId, paymentStatus: { not: "paid" } },
          data: {
            paymentStatus: "paid",
            paidAt,
            paidById: actorId,
            paymentMethod: input.method,
            paymentReference: reference,
          },
        });
      }
      if (line.category === "commission" && detail(line, "userId")) {
        const userId = detail(line, "userId")!;
        const periodMonth = detail(line, "month")!;
        await db.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
        const details = line.details as Record<string, number | string>;
        const current = await db.commissionPayout.findUnique({
          where: { userId_periodMonth: { userId, periodMonth } },
        });
        if (Number(current?.amount ?? 0) !== Number(details.paidAmount ?? 0))
          throw new Error(
            serverMessages.settlementPaymentChanged,
          );
        await db.commissionPayout.upsert({
          where: { userId_periodMonth: { userId, periodMonth } },
          update: { amount: { increment: line.amount }, recordedById: actorId },
          create: {
            userId,
            periodMonth,
            amount: line.amount,
            basisAmount: Number(details.basis),
            ratePercent: Number(details.ratePercent),
            recordedById: actorId,
          },
        });
      }
      const claimId = detail(line, "claimId");
      if (claimId) {
        // Paid like any reimbursement, so the claim books its expense; a claim without a category uses the first operating one.
        await db.$queryRaw`SELECT id FROM "ExpenseClaim" WHERE id = ${claimId} FOR UPDATE`;
        const claim = await db.expenseClaim.findUnique({
          where: { id: claimId },
          select: { status: true, categoryId: true, amount: true },
        });
        if (
          !claim ||
          !["approved", "scheduled"].includes(claim.status) ||
          Number(claim.amount) !== Number(line.amount)
        )
          throw new Error(
            serverMessages.settlementPaymentChanged,
          );
        {
          const categoryId =
            claim.categoryId ??
            (
              await db.expenseCategory.findFirst({
                where: { isActive: true, kind: "operating" },
                orderBy: { displayOrder: "asc" },
                select: { id: true },
              })
            )?.id ??
            null;
          await payExpenseClaim(claimId, actorId, {
            method: input.method === "wps" ? "bank_transfer" : input.method,
            reference,
            categoryId,
          });
        }
      }
    }
    const lastMonth = monthKey(
      settlement.lastWorkingDay.getUTCFullYear(),
      settlement.lastWorkingDay.getUTCMonth() + 1,
    );
    await db.employeeRecurringPay.updateMany({
      where: { employeeId: settlement.employeeId, isActive: true },
      data: { isActive: false },
    });
    await db.employeeSupport.updateMany({
      where: {
        employeeId: settlement.employeeId,
        status: {
          in: ["applied", "approved", "partially_approved", "suspended"],
        },
      },
      data: { status: "ended", endMonth: lastMonth },
    });
    await db.employeeGosiRecord.updateMany({
      where: {
        employeeId: settlement.employeeId,
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gt: settlement.lastWorkingDay } },
        ],
        effectiveFrom: { lte: settlement.lastWorkingDay },
      },
      data: { effectiveTo: settlement.lastWorkingDay },
    });
    await db.employee.update({
      where: { id: settlement.employeeId },
      data: { status: "terminated" },
    });
    return db.finalSettlement.update({
      where: { id },
      data: {
        status: "paid",
        paidAt,
        paidById: actorId,
        paymentMethod: input.method,
        paymentReference: input.reference?.trim().slice(0, 120) || null,
      },
    });
  });
}

registerApprovalFinalizer("final_settlement", {
  async approve(id, decider) {
    const settlement = await db.finalSettlement.findUniqueOrThrow({
      where: { id },
      include: {
        employee: {
          select: { userId: true, firstNameEn: true, lastNameEn: true },
        },
      },
    });
    if (settlement.status !== "submitted")
      throw new Error(serverMessages.thisSettlementIsNotWaitingForApproval);
    // The company's signature on the settlement, drawn by the final approver when signing on the spot.
    await db.finalSettlement.update({
      where: { id },
      data: { status: "approved", approvedAt: new Date() },
    });
    await db.activityLog.create({
      data: {
        userId: decider,
        action: "approve",
        entityType: "final_settlement",
        entityId: id,
        details: { reference: settlement.reference },
      },
    });
  },
  async reject(id) {
    const settlement = await db.finalSettlement.findUniqueOrThrow({
      where: { id },
      select: { status: true },
    });
    if (settlement.status !== "submitted")
      throw new Error(serverMessages.thisSettlementIsNotWaitingForApproval);
    await db.finalSettlement.update({
      where: { id },
      data: { status: "rejected" },
    });
  },
});

// ---------- Reading ----------

export async function listFinalSettlements(
  filters: { status?: string; q?: string } = {},
) {
  const q = filters.q?.trim().slice(0, 80);
  const rows = await db.finalSettlement.findMany({
    where: {
      ...(filters.status && filters.status !== "all"
        ? { status: filters.status }
        : {}),
      ...(q
        ? {
            OR: [
              { reference: { contains: q, mode: "insensitive" } },
              {
                employee: {
                  OR: [
                    { firstNameEn: { contains: q, mode: "insensitive" } },
                    { lastNameEn: { contains: q, mode: "insensitive" } },
                    { employeeNumber: { contains: q, mode: "insensitive" } },
                  ],
                },
              },
            ],
          }
        : {}),
    },
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
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map((s) => ({
    id: s.id,
    reference: s.reference,
    status: s.status,
    reason: s.reason,
    lastWorkingDay: dayKey(s.lastWorkingDay),
    netAmount: Number(s.netAmount),
    currency: s.currency,
    employee: {
      id: s.employee.id,
      number: s.employee.employeeNumber,
      nameEn: `${s.employee.firstNameEn} ${s.employee.lastNameEn}`,
      nameAr: `${s.employee.firstNameAr} ${s.employee.lastNameAr}`,
    },
    createdAt: s.createdAt.toISOString(),
  }));
}

export async function getFinalSettlement(id: string) {
  const s = await db.finalSettlement.findUnique({
    where: { id },
    include: {
      lines: { orderBy: [{ displayOrder: "asc" }] },
      employee: {
        select: {
          id: true,
          userId: true,
          employeeNumber: true,
          firstNameEn: true,
          lastNameEn: true,
          firstNameAr: true,
          lastNameAr: true,
          jobTitleEn: true,
          jobTitleAr: true,
          hireDate: true,
          nationality: true,
          cprNumber: true,
          department: { select: { nameEn: true, nameAr: true } },
        },
      },
    },
  });
  if (!s) return null;
  const [createdBy, paidBy, approval] = await Promise.all([
    db.user.findUnique({
      where: { id: s.createdById },
      select: { fullName: true },
    }),
    s.paidById
      ? db.user.findUnique({
          where: { id: s.paidById },
          select: { fullName: true },
        })
      : null,
    db.approvalRequest.findFirst({
      where: { targetType: "final_settlement", targetId: id },
      orderBy: { revision: "desc" },
      include: {
        decisions: {
          orderBy: { decidedAt: "asc" },
          include: {
            decidedBy: {
              select: {
                fullName: true,
                signatureUrl: true,
                employee: {
                  select: {
                    firstNameEn: true,
                    lastNameEn: true,
                    firstNameAr: true,
                    lastNameAr: true,
                    jobTitleEn: true,
                    jobTitleAr: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);
  return {
    id: s.id,
    reference: s.reference,
    status: s.status,
    reason: s.reason,
    lastWorkingDay: dayKey(s.lastWorkingDay),
    currency: s.currency,
    totalAdditions: Number(s.totalAdditions),
    totalDeductions: Number(s.totalDeductions),
    netAmount: Number(s.netAmount),
    employerContributions: Number(s.employerContributions),
    calculation: s.calculation as Record<string, unknown>,
    notes: s.notes,
    handoverId: s.handoverId,
    createdBy: createdBy?.fullName ?? "",
    createdAt: s.createdAt.toISOString(),
    calculatedAt: s.calculatedAt?.toISOString() ?? null,
    approvedAt: s.approvedAt?.toISOString() ?? null,
    paidAt: s.paidAt?.toISOString() ?? null,
    paidBy: paidBy?.fullName ?? null,
    paymentMethod: s.paymentMethod,
    paymentReference: s.paymentReference,
    employeeSignature: s.employeeSignature,
    employeeSignerName: s.employeeSignerName,
    employeeSignedAt: s.employeeSignedAt?.toISOString() ?? null,
    lines: s.lines.map((l) => ({
      id: l.id,
      kind: l.kind as "addition" | "deduction",
      category: l.category,
      labelEn: l.labelEn,
      labelAr: l.labelAr,
      amount: Number(l.amount),
      source: l.source as "auto" | "manual",
      details: l.details as Record<string, unknown> | null,
    })),
    employee: {
      id: s.employee.id,
      userId: s.employee.userId,
      number: s.employee.employeeNumber,
      nameEn: `${s.employee.firstNameEn} ${s.employee.lastNameEn}`,
      nameAr: `${s.employee.firstNameAr} ${s.employee.lastNameAr}`,
      jobTitleEn: s.employee.jobTitleEn,
      jobTitleAr: s.employee.jobTitleAr,
      hireDate: dayKey(s.employee.hireDate),
      cprNumber: s.employee.cprNumber,
      departmentEn: s.employee.department?.nameEn ?? null,
      departmentAr: s.employee.department?.nameAr ?? null,
    },
    approval: approval
      ? {
          id: approval.id,
          status: approval.status,
          approverIds: approval.approverIds,
          decisions: approval.decisions.map((d) => ({
            decision: d.decision,
            step: d.step,
            name: d.decidedBy.fullName,
            nameEn: d.decidedBy.employee
              ? `${d.decidedBy.employee.firstNameEn} ${d.decidedBy.employee.lastNameEn}`
              : d.decidedBy.fullName,
            nameAr: d.decidedBy.employee
              ? `${d.decidedBy.employee.firstNameAr} ${d.decidedBy.employee.lastNameAr}`
              : d.decidedBy.fullName,
            titleEn: d.decidedBy.employee?.jobTitleEn ?? null,
            titleAr: d.decidedBy.employee?.jobTitleAr ?? null,
            signature: d.signatureData ?? d.decidedBy.signatureUrl ?? null,
            at: d.decidedAt.toISOString(),
            note: d.reason,
          })),
        }
      : null,
    url: ROUTES.hr.settlement(s.id),
  };
}
export type FinalSettlementDetail = NonNullable<
  Awaited<ReturnType<typeof getFinalSettlement>>
>;

/** Used by the HR settings screen to preview a settlement without saving it. */
export async function previewSettlement(
  employeeId: string,
  lastWorkingDay: string,
) {
  return calculateSettlement(
    employeeId,
    parseDay(lastWorkingDay, "Choose the last working day"),
  );
}
