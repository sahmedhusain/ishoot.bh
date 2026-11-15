import { roundMoney, validMoneyAmount } from "../finance/money";
import { companyCurrency as getAccountingCurrency, assertCompanyCurrency } from "../finance/company-currency";
import {
  serverTemplates,
  formatMessage,
  serverMessages,
} from "@platform/locales";

import { runAtomicMutation } from "../api/atomic";
import {
  deleteTableRow,
  listTableRows,
  upsertTableRow,
} from "../api/tables";
import { ROUTES } from "../constants/routes";
import {
  calculateContributions,
  parsePayrollSettings,
} from "../payroll-calculation";
import {
  computeEmployeePayroll,
  daysInMonth,
  dayKey,
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

const roundStoredAmount = (value: number) => Math.round(value * 1_000_000) / 1_000_000;
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

export interface SettlementRules {
  gratuity: GratuityRules;
  leaveEncashmentBase: "basic" | "fixed";
}

export async function getSettlementRules(): Promise<SettlementRules> {
  const rows = await listTableRows<any>("system", "hr_policy");
  const row = rows.find((r) => r.id === "default") ?? rows[0];
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
  const rows = await listTableRows<any>("system", "hr_policy");
  const existing = rows.find((r) => r.id === "default");
  await upsertTableRow("system", "hr_policy", {
    ...(existing ?? { id: "default" }),
    gratuityRules: gratuity,
    leaveEncashmentBase: input.leaveEncashmentBase,
    updatedById: actorId,
  });
  return getSettlementRules();
}

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

export async function calculateSettlement(
  employeeId: string,
  lastWorkingDay: Date,
) {
  const accountingCurrency = await getAccountingCurrency();
  const r3 = (value: number) => roundMoney(value, accountingCurrency);
  const [employees, users, allRecords] = await Promise.all([
    listTableRows<any>("hr", "employee"),
    listTableRows<any>("identity", "user"),
    listTableRows<any>("system", "employment_record"),
  ]);
  const rawEmp = employees.find((e) => e.id === employeeId);
  if (!rawEmp) throw new Error(serverMessages.employeeNotFound);
  const empUser = rawEmp.userId
    ? users.find((u) => u.id === rawEmp.userId) ?? null
    : null;
  const empRecords = allRecords
    .filter(
      (r) =>
        r.employeeId === employeeId &&
        new Date(r.effectiveFrom) <= lastWorkingDay,
    )
    .map((r) => ({ ...r, effectiveFrom: new Date(r.effectiveFrom) }))
    .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime());
  const employee = {
    ...rawEmp,
    hireDate: new Date(rawEmp.hireDate),
    user: empUser
      ? { id: empUser.id, commissionRatePercent: empUser.commissionRatePercent }
      : null,
    employmentRecords: empRecords,
  };
  if (lastWorkingDay < employee.hireDate)
    throw new Error(serverMessages.theLastWorkingDayCannotBeBeforeThe);
  const record = employee.employmentRecords[0];
  if (!record) throw new Error(serverMessages.theEmployeeHasNoSalaryOnRecord);
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

  const [allItems, allRuns] = await Promise.all([
    listTableRows<any>("hr", "payroll_item"),
    listTableRows<any>("hr", "payroll_run"),
  ]);
  const runMap = new Map<string, any>(allRuns.map((r) => [r.id, r]));
  const lwdYear = lastWorkingDay.getUTCFullYear();
  const lwdMonth = lastWorkingDay.getUTCMonth() + 1;
  const items = allItems
    .filter((i) => i.employeeId === employeeId)
    .map((i) => ({ ...i, payrollRun: runMap.get(i.payrollRunId) }))
    .filter(
      (i) =>
        i.payrollRun &&
        (i.payrollRun.year < lwdYear ||
          (i.payrollRun.year === lwdYear && i.payrollRun.month <= lwdMonth)),
    );
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

  const [typeRows, allLeaveRows] = await Promise.all([
    listTableRows<any>("hr", "leave_type"),
    listTableRows<any>("hr", "leave_request"),
  ]);
  const leaveRows = unpaidMonths.length
    ? allLeaveRows
        .filter((l) => {
          if (l.employeeId !== employeeId || l.status !== "approved")
            return false;
          const s = new Date(l.startDate);
          return (
            s >= utcDay(monthStart(unpaidMonths[0]).getUTCFullYear(), 0, 1) &&
            s <= lastWorkingDay
          );
        })
        .map((l) => ({
          ...l,
          startDate: new Date(l.startDate),
          endDate: new Date(l.endDate),
        }))
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
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
        amount: partMonthPay(fixedPay, after, end, accountingCurrency),
        details: { from: dayKey(after), to: dayKey(end) },
      });
    }
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
      const legacy = calculateContributions(fixedPay, settings, month, accountingCurrency);
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

  const allRecurring = await listTableRows<any>("hr", "employee_recurring_pay");
  const recurring = allRecurring.filter(
    (r) => r.employeeId === employeeId && r.isActive,
  );
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
      const allPayouts = await listTableRows<any>("finance", "commission_payout");
      const paid = allPayouts.find(
        (p) => p.userId === employee.user!.id && p.periodMonth === month,
      );
      const paidAmount = Number(paid?.amount ?? 0);
      const basis = r3(earned?.net ?? 0);
      const amount = r3(commissionAmount(basis, rate, accountingCurrency) - paidAmount);
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

  const annual = typeRows.find((t) => t.code === "annual" && t.isActive);
  if (annual) {
    const rulesForType = toLeaveTypeRules(annual);
    const year = lastWorkingDay.getUTCFullYear();
    const lastYear = year - 1;
    const allLeaveAdjustments = await listTableRows<any>("hr", "leave_adjustment");
    const sumLeaveDays = (from: Date, to: Date) =>
      allLeaveRows
        .filter(
          (l) =>
            l.employeeId === employeeId &&
            l.leaveTypeId === annual.id &&
            l.status === "approved" &&
            new Date(l.startDate) >= from &&
            new Date(l.startDate) <= to,
        )
        .reduce((acc, l) => acc + Number(l.days ?? 0), 0);
    const sumAdjDays = (y: number) =>
      allLeaveAdjustments
        .filter(
          (a) =>
            a.employeeId === employeeId &&
            a.leaveTypeId === annual.id &&
            a.year === y,
        )
        .reduce((acc, a) => acc + Number(a.days ?? 0), 0);
    const taken = { _sum: { days: sumLeaveDays(utcDay(year, 0, 1), lastWorkingDay) } };
    const adjustments = { _sum: { days: sumAdjDays(year) } };
    const takenLast = {
      _sum: { days: sumLeaveDays(utcDay(lastYear, 0, 1), utcDay(lastYear, 11, 31)) },
    };
    const adjLast = { _sum: { days: sumAdjDays(lastYear) } };
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

  if (employee.user) {
    const allClaims = await listTableRows<any>("finance", "expense_claim");
    const claims = allClaims.filter(
      (c) =>
        c.claimantId === employee.user!.id &&
        ["approved", "scheduled"].includes(c.status),
    );
    for (const claim of claims) {
      if (claim.currency !== accountingCurrency) {
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
    const pendingClaims = allClaims.filter(
      (c) => c.claimantId === employee.user!.id && c.status === "submitted",
    ).length;
    if (pendingClaims)
      warnings.push(`claims_awaiting_approval:${pendingClaims}`);
  }

  const profile = profileInForce(
    gosi.profiles.get(employeeId) ?? [],
    lastWorkingDay.getUTCFullYear(),
    lastWorkingDay.getUTCMonth() + 1,
  );
  const category =
    profile?.category ??
    gosi.rules.nationalityCategories?.[employee.nationality ?? ""] ?? gosi.rules.nationalityCategories?.["*"] ?? "exempt";
  const indemnity = leavingIndemnity({
    rules: rules.gratuity,
    currency: accountingCurrency,
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

  const [allAssets, allHandovers] = await Promise.all([
    listTableRows<any>("itsm", "asset"),
    listTableRows<any>("hr", "employee_handover"),
  ]);
  const assetsHeld = allAssets.filter(
    (a) => a.holderEmployeeId === employeeId,
  ).length;
  const openHandovers = allHandovers.filter(
    (h) =>
      h.employeeId === employeeId &&
      h.kind === "exit" &&
      ["open", "pending_approval"].includes(h.status),
  ).length;
  const pendingLeave = allLeaveRows.filter(
    (l) => l.employeeId === employeeId && l.status === "pending",
  ).length;
  if (assetsHeld) warnings.push(`assets_held:${assetsHeld}`);
  if (openHandovers) warnings.push("exit_handover_open");
  if (pendingLeave) warnings.push(`leave_pending:${pendingLeave}`);

  return {
    lines: lines
      .filter((l) => l.amount > 0)
      .map((l) => ({ ...l, amount: r3(l.amount) })),
    employerContributions: r3(employerContributions),
    calculation: {
      currency: accountingCurrency,
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
    roundStoredAmount(
      lines
        .filter((l) => l.kind === kind)
        .reduce((total, l) => total + Number(l.amount), 0),
    );
  const additions = sum("addition");
  const deductions = sum("deduction");
  return {
    totalAdditions: additions,
    totalDeductions: deductions,
    netAmount: roundStoredAmount(additions - deductions),
  };
}

async function writeAutoLines(
  settlementId: string,
  employeeId: string,
  lastWorkingDay: Date,
) {
  const result = await calculateSettlement(employeeId, lastWorkingDay);
  const existingLines = await listTableRows<any>("system", "final_settlement_line");
  await Promise.all(
    existingLines
      .filter((l) => l.settlementId === settlementId && l.source === "auto")
      .map((l) => deleteTableRow("system", "final_settlement_line", l.id)),
  );
  if (result.lines.length)
    await Promise.all(
      result.lines.map((l, i) =>
        upsertTableRow("system", "final_settlement_line", {
          id: crypto.randomUUID(),
          settlementId,
          kind: l.kind,
          category: l.category,
          labelEn: l.labelEn,
          labelAr: l.labelAr,
          amount: l.amount,
          source: "auto",
          details: l.details ?? null,
          displayOrder: i,
        }),
      ),
    );
  const all = (await listTableRows<any>("system", "final_settlement_line")).filter(
    (l) => l.settlementId === settlementId,
  );
  const settlements = await listTableRows<any>("system", "final_settlement");
  const current = settlements.find((s) => s.id === settlementId);
  if (current) {
    await upsertTableRow("system", "final_settlement", {
      ...current,
      ...totalsOf(all),
      employerContributions: result.employerContributions,
      calculation: result.calculation,
      calculatedAt: new Date().toISOString(),
    });
  }
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
    const settlements = await listTableRows<any>("system", "final_settlement");
    const open = settlements.find(
      (s) =>
        s.employeeId === input.employee_id &&
        ["draft", "submitted", "approved"].includes(s.status),
    );
    if (open) throw new Error(serverMessages.thisEmployeeAlreadyHasASettlement);
    const created = await upsertTableRow<any>("system", "final_settlement", {
      id: crypto.randomUUID(),
      reference: await getNextSequenceNumber(
        "FST",
        lastWorkingDay.getUTCFullYear(),
      ),
      employeeId: input.employee_id,
      currency: await assertCompanyCurrency(),
      handoverId: input.handover_id || null,
      reason: input.reason,
      status: "draft",
      lastWorkingDay: lastWorkingDay.toISOString(),
      notes: input.notes?.trim().slice(0, 2000) || null,
      createdById: actorId,
      totalAdditions: 0,
      totalDeductions: 0,
      netAmount: 0,
    });
    await writeAutoLines(created.id, input.employee_id, lastWorkingDay);
    const updated = (await listTableRows<any>("system", "final_settlement")).find(
      (s) => s.id === created.id,
    );
    if (!updated) throw new Error(serverMessages.settlementNotFound);
    return updated;
  });
}

async function editable(id: string) {
  const settlements = await listTableRows<any>("system", "final_settlement");
  const settlement = settlements.find((s) => s.id === id);
  if (!settlement) throw new Error(serverMessages.settlementNotFound);
  await assertCompanyCurrency(settlement.currency);
  if (!["draft", "rejected"].includes(settlement.status))
    throw new Error(
      formatMessage(serverTemplates.theSettlementIsXItCanOnlyBeChanged, {
        0: settlement.status,
      }),
    );
  return settlement;
}

export async function recalculateFinalSettlement(
  id: string,
  input?: { last_working_day?: string; reason?: string; notes?: string | null },
) {
  return runAtomicMutation(async () => {
    const settlement = await editable(id);
    const lastWorkingDay = input?.last_working_day
      ? parseDay(input.last_working_day, "Choose the last working day")
      : new Date(settlement.lastWorkingDay);
    if (
      input?.reason &&
      !(SETTLEMENT_REASONS as readonly string[]).includes(input.reason)
    )
      throw new Error(serverMessages.chooseWhyTheEmployeeIsLeaving);
    await upsertTableRow("system", "final_settlement", {
      ...settlement,
      lastWorkingDay: lastWorkingDay.toISOString(),
      status: "draft",
      ...(input?.reason ? { reason: input.reason } : {}),
      ...(input?.notes !== undefined
        ? { notes: input.notes?.trim().slice(0, 2000) || null }
        : {}),
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

export async function setFinalSettlementManualLines(
  id: string,
  lines: SettlementManualLine[],
) {
  const currency = await getAccountingCurrency();
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
    const amount = Number(l.amount);
    if (!validMoneyAmount(amount, currency)) throw new Error(serverMessages.paymentCurrencyPrecisionInvalid);
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
    const settlement = await editable(id);
    const existingLines = await listTableRows<any>("system", "final_settlement_line");
    await Promise.all(
      existingLines
        .filter((l) => l.settlementId === id && l.source === "manual")
        .map((l) => deleteTableRow("system", "final_settlement_line", l.id)),
    );
    if (drafts.length)
      await Promise.all(
        drafts.map((d) =>
          upsertTableRow("system", "final_settlement_line", {
            id: crypto.randomUUID(),
            ...d,
            details: d.details ?? null,
          }),
        ),
      );
    const all = (await listTableRows<any>("system", "final_settlement_line")).filter(
      (l) => l.settlementId === id,
    );
    await upsertTableRow("system", "final_settlement", {
      ...settlement,
      ...totalsOf(all),
    });
  });
}

export async function submitFinalSettlement(id: string, actorId: string) {
  return runAtomicMutation(async () => {
    const settlement = await editable(id);
    await upsertTableRow("system", "final_settlement", {
      ...settlement,
      status: "submitted",
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
    const settlements = await listTableRows<any>("system", "final_settlement");
    const settlement = settlements.find((s) => s.id === id);
    if (!settlement) throw new Error(serverMessages.settlementNotFound);
    if (
      !["draft", "submitted", "rejected", "approved"].includes(
        settlement.status,
      )
    )
      throw new Error(serverMessages.onlyAnUnpaidSettlementCanBeCancelled);
    await cancelPendingApprovals("final_settlement", id);
    await upsertTableRow("system", "final_settlement", {
      ...settlement,
      status: "cancelled",
    });
  });
}

export async function signFinalSettlementAsEmployee(
  id: string,
  input: { signature: string; signer_name: string },
) {
  validateSignatureImage(input.signature);
  const signerName = input.signer_name?.trim().slice(0, 120);
  if (!signerName || signerName.length < 2)
    throw new Error(serverMessages.enterYourFullName);
  const settlements = await listTableRows<any>("system", "final_settlement");
  const settlement = settlements.find((s) => s.id === id);
  if (!settlement) throw new Error(serverMessages.settlementNotFound);
  if (!["approved", "paid"].includes(settlement.status))
    throw new Error(serverMessages.theEmployeeSignsOnceTheSettlement);
  return upsertTableRow("system", "final_settlement", {
    ...settlement,
    employeeSignature: input.signature,
    employeeSignerName: signerName,
    employeeSignedAt: new Date().toISOString(),
  });
}

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
      new Date().toISOString().slice(0, 10)
  )
    throw new Error(serverMessages.chooseAPaymentDateThatIsNot);
  return runAtomicMutation(async () => {
    const [
      settlements,
      allLines,
      allItems,
      allRuns,
      allPayouts,
      allClaims,
      allCategories,
      allRecurring,
      allSupports,
      allGosi,
      allEmployees,
    ] = await Promise.all([
      listTableRows<any>("system", "final_settlement"),
      listTableRows<any>("system", "final_settlement_line"),
      listTableRows<any>("hr", "payroll_item"),
      listTableRows<any>("hr", "payroll_run"),
      listTableRows<any>("finance", "commission_payout"),
      listTableRows<any>("finance", "expense_claim"),
      listTableRows<any>("finance", "expense_category"),
      listTableRows<any>("hr", "employee_recurring_pay"),
      listTableRows<any>("hr", "employee_support"),
      listTableRows<any>("hr", "employee_gosi_record"),
      listTableRows<any>("hr", "employee"),
    ]);
    const rawSettlement = settlements.find((s) => s.id === id);
    if (!rawSettlement) throw new Error(serverMessages.settlementNotFound);
    const settlement = {
      ...rawSettlement,
      lastWorkingDay: new Date(rawSettlement.lastWorkingDay),
      lines: allLines.filter((l) => l.settlementId === id),
    };
    if (settlement.status !== "approved")
      throw new Error(
        formatMessage(serverTemplates.theSettlementCanBePaidOnceItIsApproved, {
          0: settlement.status,
        }),
      );
    const detail = (line: any, key: string) =>
      (line.details as Record<string, unknown> | null)?.[key] as
        string | undefined;
    const reference =
      input.reference?.trim().slice(0, 120) || settlement.reference;
    const paidAtIso = paidAt.toISOString();
    for (const line of settlement.lines) {
      const payrollItemId = detail(line, "payrollItemId");
      if (payrollItemId) {
        const rawItem = allItems.find((i) => i.id === payrollItemId);
        const payrollRun = rawItem
          ? allRuns.find((r) => r.id === rawItem.payrollRunId)
          : null;
        if (
          !rawItem ||
          !payrollRun ||
          rawItem.paymentStatus === "paid" ||
          payrollRun.status !== "approved" ||
          Number(rawItem.netSalary) !== Number(line.amount)
        )
          throw new Error(serverMessages.settlementPaymentChanged);
        await upsertTableRow("hr", "payroll_item", {
          ...rawItem,
          paymentStatus: "paid",
          paidAt: paidAtIso,
          paidById: actorId,
          paymentMethod: input.method,
          paymentReference: reference,
        });
      }
      if (line.category === "commission" && detail(line, "userId")) {
        const userId = detail(line, "userId")!;
        const periodMonth = detail(line, "month")!;
        const details = line.details as Record<string, number | string>;
        const current = allPayouts.find(
          (p) => p.userId === userId && p.periodMonth === periodMonth,
        );
        if (Number(current?.amount ?? 0) !== Number(details.paidAmount ?? 0))
          throw new Error(serverMessages.settlementPaymentChanged);
        if (current) {
          await upsertTableRow("finance", "commission_payout", {
            ...current,
            amount: Number(current.amount ?? 0) + Number(line.amount),
            recordedById: actorId,
          });
        } else {
          await upsertTableRow("finance", "commission_payout", {
            id: crypto.randomUUID(),
            userId,
            currency: settlement.currency,
            periodMonth,
            amount: line.amount,
            basisAmount: Number(details.basis),
            ratePercent: Number(details.ratePercent),
            recordedById: actorId,
          });
        }
      }
      const claimId = detail(line, "claimId");
      if (claimId) {
        const claim = allClaims.find((c) => c.id === claimId);
        if (
          !claim ||
          !["approved", "scheduled"].includes(claim.status) ||
          Number(claim.amount) !== Number(line.amount)
        )
          throw new Error(serverMessages.settlementPaymentChanged);
        {
          const fallbackCategory = allCategories
            .filter((c) => c.isActive && c.kind === "operating")
            .sort((a, b) => Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0))[0];
          const categoryId = claim.categoryId ?? fallbackCategory?.id ?? null;
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
    await Promise.all([
      ...allRecurring
        .filter((r) => r.employeeId === settlement.employeeId && r.isActive)
        .map((r) =>
          upsertTableRow("hr", "employee_recurring_pay", {
            ...r,
            isActive: false,
          }),
        ),
      ...allSupports
        .filter(
          (s) =>
            s.employeeId === settlement.employeeId &&
            ["applied", "approved", "partially_approved", "suspended"].includes(
              s.status,
            ),
        )
        .map((s) =>
          upsertTableRow("hr", "employee_support", {
            ...s,
            status: "ended",
            endMonth: lastMonth,
          }),
        ),
      ...allGosi
        .filter(
          (g) =>
            g.employeeId === settlement.employeeId &&
            new Date(g.effectiveFrom) <= settlement.lastWorkingDay &&
            (!g.effectiveTo ||
              new Date(g.effectiveTo) > settlement.lastWorkingDay),
        )
        .map((g) =>
          upsertTableRow("hr", "employee_gosi_record", {
            ...g,
            effectiveTo: settlement.lastWorkingDay.toISOString(),
          }),
        ),
    ]);
    const emp = allEmployees.find((e) => e.id === settlement.employeeId);
    if (emp) {
      await upsertTableRow("hr", "employee", {
        ...emp,
        status: "terminated",
      });
    }
    return upsertTableRow("system", "final_settlement", {
      ...rawSettlement,
      status: "paid",
      paidAt: paidAtIso,
      paidById: actorId,
      paymentMethod: input.method,
      paymentReference: input.reference?.trim().slice(0, 120) || null,
    });
  });
}

registerApprovalFinalizer("final_settlement", {
  async approve(id, decider) {
    const settlements = await listTableRows<any>("system", "final_settlement");
    const settlement = settlements.find((s) => s.id === id);
    if (!settlement) throw new Error(serverMessages.settlementNotFound);
    if (settlement.status !== "submitted")
      throw new Error(serverMessages.thisSettlementIsNotWaitingForApproval);
    await upsertTableRow("system", "final_settlement", {
      ...settlement,
      status: "approved",
      approvedAt: new Date().toISOString(),
    });
    await upsertTableRow("system", "activity_log", {
      id: crypto.randomUUID(),
      userId: decider,
      action: "approve",
      entityType: "final_settlement",
      entityId: id,
      details: { reference: settlement.reference },
    });
  },
  async reject(id) {
    const settlements = await listTableRows<any>("system", "final_settlement");
    const settlement = settlements.find((s) => s.id === id);
    if (!settlement) throw new Error(serverMessages.settlementNotFound);
    if (settlement.status !== "submitted")
      throw new Error(serverMessages.thisSettlementIsNotWaitingForApproval);
    await upsertTableRow("system", "final_settlement", {
      ...settlement,
      status: "rejected",
    });
  },
});

export async function listFinalSettlements(
  filters: { status?: string; q?: string } = {},
) {
  const q = filters.q?.trim().slice(0, 80).toLowerCase();
  const [settlements, employees] = await Promise.all([
    listTableRows<any>("system", "final_settlement"),
    listTableRows<any>("hr", "employee"),
  ]);
  const empMap = new Map<string, any>(employees.map((e) => [e.id, e]));
  const rows = settlements
    .filter((s) => {
      if (filters.status && filters.status !== "all" && s.status !== filters.status)
        return false;
      if (q) {
        const emp = empMap.get(s.employeeId);
        const matchesRef = String(s.reference ?? "").toLowerCase().includes(q);
        const matchesEmp =
          emp &&
          (String(emp.firstNameEn ?? "").toLowerCase().includes(q) ||
            String(emp.lastNameEn ?? "").toLowerCase().includes(q) ||
            String(emp.employeeNumber ?? "").toLowerCase().includes(q));
        if (!matchesRef && !matchesEmp) return false;
      }
      return true;
    })
    .sort((a, b) =>
      String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")),
    )
    .slice(0, 200);
  return rows.map((s) => {
    const emp = empMap.get(s.employeeId) ?? {};
    return {
      id: s.id,
      reference: s.reference,
      status: s.status,
      reason: s.reason,
      lastWorkingDay: dayKey(new Date(s.lastWorkingDay)),
      netAmount: Number(s.netAmount ?? 0),
      currency: s.currency,
      employee: {
        id: emp.id ?? s.employeeId,
        number: emp.employeeNumber ?? "",
        nameEn: `${emp.firstNameEn ?? ""} ${emp.lastNameEn ?? ""}`.trim(),
        nameAr: `${emp.firstNameAr ?? ""} ${emp.lastNameAr ?? ""}`.trim(),
      },
      createdAt: String(s.createdAt ?? new Date().toISOString()),
    };
  });
}

export async function getFinalSettlement(id: string) {
  const [
    settlements,
    allLines,
    employees,
    departments,
    users,
    approvals,
    decisions,
  ] = await Promise.all([
    listTableRows<any>("system", "final_settlement"),
    listTableRows<any>("system", "final_settlement_line"),
    listTableRows<any>("hr", "employee"),
    listTableRows<any>("hr", "department"),
    listTableRows<any>("identity", "user"),
    listTableRows<any>("workflow", "approval_request"),
    listTableRows<any>("workflow", "approval_decision"),
  ]);
  const rawS = settlements.find((row) => row.id === id);
  if (!rawS) return null;
  const emp = employees.find((e) => e.id === rawS.employeeId) ?? {};
  const dept = emp.departmentId
    ? departments.find((d) => d.id === emp.departmentId) ?? null
    : null;
  const lines = allLines
    .filter((l) => l.settlementId === id)
    .sort((a, b) => Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0));
  const createdBy = users.find((u) => u.id === rawS.createdById) ?? null;
  const paidBy = rawS.paidById
    ? users.find((u) => u.id === rawS.paidById) ?? null
    : null;
  const approvalRaw = approvals
    .filter((a) => a.targetType === "final_settlement" && a.targetId === id)
    .sort((a, b) => Number(b.revision ?? 0) - Number(a.revision ?? 0))[0];
  const approval = approvalRaw
    ? {
        ...approvalRaw,
        decisions: decisions
          .filter((d) => d.approvalRequestId === approvalRaw.id)
          .sort((a, b) =>
            String(a.decidedAt ?? "").localeCompare(String(b.decidedAt ?? "")),
          )
          .map((d) => {
            const deciderUser = users.find((u) => u.id === d.decidedById);
            const deciderEmp = deciderUser
              ? employees.find((e) => e.userId === deciderUser.id) ?? null
              : null;
            return {
              ...d,
              decidedAt: new Date(d.decidedAt),
              decidedBy: {
                fullName: deciderUser?.fullName ?? "",
                signatureUrl: deciderUser?.signatureUrl ?? null,
                employee: deciderEmp,
              },
            };
          }),
      }
    : null;
  const s = {
    ...rawS,
    lines,
    employee: {
      ...emp,
      department: dept ? { nameEn: dept.nameEn, nameAr: dept.nameAr } : null,
    },
  };
  return {
    id: s.id,
    reference: s.reference,
    status: s.status,
    reason: s.reason,
    lastWorkingDay: dayKey(new Date(s.lastWorkingDay)),
    currency: s.currency,
    totalAdditions: Number(s.totalAdditions ?? 0),
    totalDeductions: Number(s.totalDeductions ?? 0),
    netAmount: Number(s.netAmount ?? 0),
    employerContributions: Number(s.employerContributions ?? 0),
    calculation: s.calculation as Record<string, unknown>,
    notes: s.notes,
    handoverId: s.handoverId,
    createdBy: createdBy?.fullName ?? "",
    createdAt: String(s.createdAt ?? new Date().toISOString()),
    calculatedAt: s.calculatedAt ? String(s.calculatedAt) : null,
    approvedAt: s.approvedAt ? String(s.approvedAt) : null,
    paidAt: s.paidAt ? String(s.paidAt) : null,
    paidBy: paidBy?.fullName ?? null,
    paymentMethod: s.paymentMethod,
    paymentReference: s.paymentReference,
    employeeSignature: s.employeeSignature,
    employeeSignerName: s.employeeSignerName,
    employeeSignedAt: s.employeeSignedAt ? String(s.employeeSignedAt) : null,
    lines: s.lines.map((l: any) => ({
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
      hireDate: dayKey(new Date(s.employee.hireDate)),
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

export async function previewSettlement(
  employeeId: string,
  lastWorkingDay: string,
) {
  return calculateSettlement(
    employeeId,
    parseDay(lastWorkingDay, "Choose the last working day"),
  );
}
