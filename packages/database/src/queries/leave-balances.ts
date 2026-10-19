import { serverMessages } from "@platform/locales";
import { db } from "../db";
import { leaveEntitlement, monthsOfService, utcDay } from "../hr/payroll-engine";
import { listLeaveTypeRules, type LeaveTypeView } from "./hr-settings";

export interface LeaveBalance {
  leaveTypeId: string;
  code: string;
  nameEn: string;
  nameAr: string;
  payPercent: number;
  hasPayBands: boolean;
  /** Null for types without a balance (e.g. unpaid leave). */
  entitled: number | null;
  carriedOver: number;
  adjustments: number;
  used: number;
  pending: number;
  available: number | null;
  eligible: boolean;
  eligibleFrom: string | null;
}

const r2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

interface Ledger {
  hireDate: Date;
  leaves: Array<{ leaveTypeId: string; status: string; startDate: Date; days: number }>;
  adjustments: Array<{ leaveTypeId: string; year: number; days: number }>;
}

async function loadLedger(employeeId: string): Promise<Ledger> {
  const [employee, leaves, adjustments] = await Promise.all([
    db.employee.findUniqueOrThrow({ where: { id: employeeId }, select: { hireDate: true } }),
    db.leaveRequest.findMany({ where: { employeeId, status: { in: ["approved", "pending"] } }, select: { leaveTypeId: true, status: true, startDate: true, days: true } }),
    db.leaveAdjustment.findMany({ where: { employeeId }, select: { leaveTypeId: true, year: true, days: true } }),
  ]);
  return {
    hireDate: employee.hireDate,
    leaves: leaves.map((l) => ({ ...l, days: Number(l.days) })),
    adjustments: adjustments.map((a) => ({ ...a, days: Number(a.days) })),
  };
}

function usedIn(ledger: Ledger, typeId: string, year: number, status: "approved" | "pending") {
  return ledger.leaves
    .filter((l) => l.leaveTypeId === typeId && l.status === status && l.startDate.getUTCFullYear() === year)
    .reduce((sum, l) => sum + l.days, 0);
}

function adjustmentsIn(ledger: Ledger, typeId: string, year: number) {
  return ledger.adjustments.filter((a) => a.leaveTypeId === typeId && a.year === year).reduce((sum, a) => sum + a.days, 0);
}

/** Unused days at the end of `year`, before the carry-over cap. */
function closing(ledger: Ledger, type: LeaveTypeView, year: number): number {
  if (year < ledger.hireDate.getUTCFullYear()) return 0;
  const entitled = leaveEntitlement(type, ledger.hireDate, year, utcDay(year, 11, 31)) ?? 0;
  return entitled + carry(ledger, type, year) + adjustmentsIn(ledger, type.id, year) - usedIn(ledger, type.id, year, "approved");
}

function carry(ledger: Ledger, type: LeaveTypeView, year: number): number {
  if (type.accrual === "none" || type.maxCarryOverDays <= 0) return 0;
  return Math.min(type.maxCarryOverDays, Math.max(0, closing(ledger, type, year - 1)));
}

function balanceFor(ledger: Ledger, type: LeaveTypeView, year: number, asOf: Date): LeaveBalance {
  const entitled = leaveEntitlement(type, ledger.hireDate, year, asOf);
  const carriedOver = r2(carry(ledger, type, year));
  const adjustments = r2(adjustmentsIn(ledger, type.id, year));
  const used = r2(usedIn(ledger, type.id, year, "approved"));
  const pending = r2(usedIn(ledger, type.id, year, "pending"));
  const service = monthsOfService(ledger.hireDate, asOf);
  const eligibleFromDate = new Date(Date.UTC(ledger.hireDate.getUTCFullYear(), ledger.hireDate.getUTCMonth() + type.eligibleAfterMonths, ledger.hireDate.getUTCDate()));
  return {
    leaveTypeId: type.id,
    code: type.code,
    nameEn: type.nameEn,
    nameAr: type.nameAr,
    payPercent: type.payPercent,
    hasPayBands: !!type.payTiers?.length,
    entitled,
    carriedOver,
    adjustments,
    used,
    pending,
    available: entitled == null ? null : r2(entitled + carriedOver + adjustments - used - pending),
    eligible: service >= type.eligibleAfterMonths,
    eligibleFrom: type.eligibleAfterMonths > 0 ? eligibleFromDate.toISOString().slice(0, 10) : null,
  };
}

/** Balances for every active leave type in `year`, as of `asOf` (default: today, or year end for past years). */
export async function getLeaveBalances(employeeId: string, year?: number, asOf?: Date): Promise<LeaveBalance[]> {
  const now = new Date();
  const y = year ?? now.getUTCFullYear();
  const at = asOf ?? (y < now.getUTCFullYear() ? utcDay(y, 11, 31) : y > now.getUTCFullYear() ? utcDay(y, 11, 31) : now);
  const [ledger, types] = await Promise.all([loadLedger(employeeId), listLeaveTypeRules({ activeOnly: true })]);
  return types.map((type) => balanceFor(ledger, type, y, at));
}

export async function getLeaveBalance(employeeId: string, leaveTypeId: string, year: number, asOf?: Date): Promise<LeaveBalance> {
  const balance = (await getLeaveBalances(employeeId, year, asOf ?? (year === new Date().getUTCFullYear() ? new Date() : utcDay(year, 11, 31))))
    .find((b) => b.leaveTypeId === leaveTypeId);
  if (!balance) throw new Error(serverMessages.thisLeaveTypeIsNotAvailable);
  return balance;
}

/** Days of a type already taken (approved) in the year before `before`, used for pay bands. */
export async function leaveTakenBefore(employeeId: string, leaveTypeId: string, before: Date): Promise<number> {
  const rows = await db.leaveRequest.findMany({
    where: { employeeId, leaveTypeId, status: "approved", startDate: { gte: utcDay(before.getUTCFullYear(), 0, 1), lt: before } },
    select: { days: true },
  });
  return rows.reduce((sum, r) => sum + Number(r.days), 0);
}

/** Keeps Employee.leaveBalanceDays (shown in lists) equal to this year's available annual leave. */
export async function refreshLeaveBalanceCache(employeeId: string) {
  const annual = (await getLeaveBalances(employeeId)).find((b) => b.code === "annual");
  if (annual?.available == null) return;
  await db.employee.update({ where: { id: employeeId }, data: { leaveBalanceDays: Math.max(-999, Math.min(999, annual.available)) } });
}

export async function addLeaveAdjustment(input: { employeeId: string; leaveTypeId: string; year: number; days: number; reason: string }, actorId: string) {
  if (!Number.isInteger(input.year) || input.year < 2000 || input.year > 2200) throw new Error(serverMessages.chooseAYear);
  if (!Number.isFinite(input.days) || input.days === 0 || Math.abs(input.days) > 366) throw new Error(serverMessages.enterTheDaysToAddOrA);
  if (Math.round(input.days * 2) !== input.days * 2) throw new Error(serverMessages.useWholeOrHalfDays);
  const reason = input.reason.trim();
  if (!reason || reason.length > 300) throw new Error(serverMessages.giveAReasonForTheAdjustment);
  const type = await db.leaveType.findUniqueOrThrow({ where: { id: input.leaveTypeId }, select: { accrual: true } });
  if (type.accrual === "none") throw new Error(serverMessages.thisLeaveTypeHasNoBalanceTo);
  const adjustment = await db.leaveAdjustment.create({ data: { ...input, reason, createdById: actorId } });
  await refreshLeaveBalanceCache(input.employeeId);
  return adjustment;
}
