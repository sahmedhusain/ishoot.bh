import { db } from "../db";
import { Prisma } from "@prisma/client";
import { DEFAULT_HR_POLICY, type HrPolicyRules, type LeaveTypeRules } from "../hr/payroll-engine";

// ---------- Policy ----------

export async function getHrPolicy(): Promise<HrPolicyRules> {
  const row = await db.hrPolicy.findUnique({ where: { id: "default" } });
  if (!row) return DEFAULT_HR_POLICY;
  return {
    salaryTiming: row.salaryTiming as HrPolicyRules["salaryTiming"],
    payDay: row.payDay,
    attendanceCutoffDay: row.attendanceCutoffDay,
    weekendDays: row.weekendDays,
    workdayHours: Number(row.workdayHours),
    workdayStart: row.workdayStart,
    dailyRateBasis: row.dailyRateBasis as HrPolicyRules["dailyRateBasis"],
    deductionBase: row.deductionBase as HrPolicyRules["deductionBase"],
    overtimeBase: row.overtimeBase as HrPolicyRules["overtimeBase"],
    overtimeRate: Number(row.overtimeRate),
    overtimeNightRate: Number(row.overtimeNightRate),
    overtimeRestDayRate: Number(row.overtimeRestDayRate),
    overtimeHolidayRate: Number(row.overtimeHolidayRate),
    lateGraceMinutes: row.lateGraceMinutes,
    deductLateness: row.deductLateness,
    unmarkedDays: row.unmarkedDays as HrPolicyRules["unmarkedDays"],
    prorateJoiners: row.prorateJoiners,
    commissionInPayroll: row.commissionInPayroll,
  };
}

export function validateHrPolicy(input: HrPolicyRules): HrPolicyRules {
  const int = (value: number, min: number, max: number, label: string) => {
    if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${label} must be between ${min} and ${max}`);
    return value;
  };
  const rate = (value: number, label: string) => {
    if (!Number.isFinite(value) || value < 1 || value > 5) throw new Error(`${label} must be between 1 and 5`);
    return Math.round(value * 100) / 100;
  };
  if (!["arrears", "current"].includes(input.salaryTiming)) throw new Error("Choose when salaries are paid");
  if (!["30", "calendar_days", "working_days"].includes(input.dailyRateBasis)) throw new Error("Choose how the daily rate is worked out");
  if (!["basic", "fixed"].includes(input.deductionBase) || !["basic", "fixed"].includes(input.overtimeBase)) throw new Error("Choose the pay used for deductions and overtime");
  if (!["present", "absent"].includes(input.unmarkedDays)) throw new Error("Choose how unmarked days count");
  const weekendDays = Array.from(new Set(input.weekendDays)).sort();
  if (weekendDays.length > 3 || weekendDays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) throw new Error("Choose up to three weekend days");
  if (!(input.workdayHours >= 1 && input.workdayHours <= 16)) throw new Error("Working hours must be between 1 and 16");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.workdayStart ?? "")) throw new Error("The working day start must be HH:MM");
  return {
    ...input,
    payDay: int(input.payDay, 1, 31, "Pay day"),
    attendanceCutoffDay: input.salaryTiming === "current" && input.attendanceCutoffDay != null ? int(input.attendanceCutoffDay, 1, 28, "Attendance cut-off") : null,
    weekendDays,
    workdayHours: Math.round(input.workdayHours * 100) / 100,
    lateGraceMinutes: int(input.lateGraceMinutes, 0, 240, "Grace minutes"),
    overtimeRate: rate(input.overtimeRate, "Overtime rate"),
    overtimeNightRate: rate(input.overtimeNightRate, "Night overtime rate"),
    overtimeRestDayRate: rate(input.overtimeRestDayRate, "Rest-day overtime rate"),
    overtimeHolidayRate: rate(input.overtimeHolidayRate, "Holiday overtime rate"),
  };
}

export async function updateHrPolicy(input: HrPolicyRules, actorId: string): Promise<HrPolicyRules> {
  const data = validateHrPolicy(input);
  await db.hrPolicy.upsert({
    where: { id: "default" },
    update: { ...data, updatedById: actorId },
    create: { id: "default", ...data, updatedById: actorId },
  });
  return getHrPolicy();
}

// ---------- Public holidays ----------

export async function listPublicHolidays(year?: number) {
  const rows = await db.publicHoliday.findMany({
    where: year ? { date: { gte: new Date(Date.UTC(year, 0, 1)), lte: new Date(Date.UTC(year, 11, 31)) } } : undefined,
    orderBy: { date: "asc" },
  });
  return rows.map((h) => ({ id: h.id, date: h.date.toISOString().slice(0, 10), nameEn: h.nameEn, nameAr: h.nameAr }));
}

export async function holidaySet(start: Date, end: Date): Promise<Set<string>> {
  const rows = await db.publicHoliday.findMany({ where: { date: { gte: start, lte: end } }, select: { date: true } });
  return new Set(rows.map((h) => h.date.toISOString().slice(0, 10)));
}

export async function savePublicHoliday(input: { id?: string | null; date: string; nameEn: string; nameAr: string }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error("Choose a date");
  const nameEn = input.nameEn.trim();
  const nameAr = input.nameAr.trim() || nameEn;
  if (!nameEn || nameEn.length > 120 || nameAr.length > 120) throw new Error("Give the holiday a name");
  const data = { date: new Date(`${input.date}T00:00:00Z`), nameEn, nameAr };
  const clash = await db.publicHoliday.findUnique({ where: { date: data.date } });
  if (clash && clash.id !== input.id) throw new Error("There is already a holiday on that date");
  return input.id ? db.publicHoliday.update({ where: { id: input.id }, data }) : db.publicHoliday.create({ data });
}

export async function deletePublicHoliday(id: string) {
  await db.publicHoliday.delete({ where: { id } });
}

// ---------- Shift types ----------

export interface ShiftTypeView { id: string; code: string; nameEn: string; nameAr: string; allowanceMode: "fixed" | "percent"; allowanceValue: number; isActive: boolean }

export async function listShiftTypes(): Promise<ShiftTypeView[]> {
  const rows = await db.shiftType.findMany({ orderBy: { nameEn: "asc" } });
  return rows.map((s) => ({ ...s, allowanceMode: s.allowanceMode as "fixed" | "percent", allowanceValue: Number(s.allowanceValue) }));
}

export async function saveShiftType(input: Omit<ShiftTypeView, "id"> & { id?: string | null }) {
  const code = input.code.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").slice(0, 40);
  if (!code) throw new Error("Give the shift a code");
  if (!input.nameEn.trim()) throw new Error("Give the shift a name");
  if (!["fixed", "percent"].includes(input.allowanceMode)) throw new Error("Choose how the allowance is paid");
  if (!(input.allowanceValue >= 0) || (input.allowanceMode === "percent" && input.allowanceValue > 200) || input.allowanceValue > 100000)
    throw new Error("Enter a valid allowance");
  const data = { code, nameEn: input.nameEn.trim(), nameAr: input.nameAr.trim() || input.nameEn.trim(), allowanceMode: input.allowanceMode, allowanceValue: Math.round(input.allowanceValue * 1000) / 1000, isActive: input.isActive };
  return input.id ? db.shiftType.update({ where: { id: input.id }, data }) : db.shiftType.create({ data });
}

// ---------- Leave types ----------

export interface LeaveTypeView extends LeaveTypeRules {
  nameEn: string;
  nameAr: string;
  isPaid: boolean;
  requiresAttachment: boolean;
  /** Approved leave of this type opens a handover for HR. */
  requiresHandover?: boolean;
  isActive: boolean;
  sortOrder: number;
}

type LeaveTypeRow = Awaited<ReturnType<typeof db.leaveType.findFirstOrThrow>>;

export function toLeaveTypeRules(row: LeaveTypeRow): LeaveTypeView {
  return {
    id: row.id,
    code: row.code,
    nameEn: row.nameEn,
    nameAr: row.nameAr,
    isPaid: row.isPaid,
    payPercent: row.payPercent,
    payTiers: Array.isArray(row.payTiers) ? (row.payTiers as Array<{ upToDays: number; percent: number }>) : null,
    accrual: row.accrual as LeaveTypeRules["accrual"],
    daysAllowedPerYear: Number(row.daysAllowedPerYear),
    eligibleAfterMonths: row.eligibleAfterMonths,
    maxCarryOverDays: Number(row.maxCarryOverDays),
    maxDaysPerRequest: row.maxDaysPerRequest == null ? null : Number(row.maxDaysPerRequest),
    allowHalfDay: row.allowHalfDay,
    allowHours: row.allowHours,
    countCalendarDays: row.countCalendarDays,
    requiresAttachment: row.requiresAttachment,
    requiresHandover: row.requiresHandover,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  };
}

export async function listLeaveTypeRules(options: { activeOnly?: boolean } = {}): Promise<LeaveTypeView[]> {
  const rows = await db.leaveType.findMany({ where: options.activeOnly ? { isActive: true } : undefined, orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }] });
  return rows.map(toLeaveTypeRules);
}

export type LeaveTypeInput = Omit<LeaveTypeView, "id" | "isPaid"> & { id?: string | null };

export async function saveLeaveType(input: LeaveTypeInput) {
  const code = input.code.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").slice(0, 40);
  if (!code || !input.nameEn.trim()) throw new Error("Give the leave type a code and a name");
  if (!["annual", "monthly", "none"].includes(input.accrual)) throw new Error("Choose how the balance is earned");
  if (!Number.isInteger(input.payPercent) || input.payPercent < 0 || input.payPercent > 100) throw new Error("Pay must be 0–100%");
  if (!(input.daysAllowedPerYear >= 0 && input.daysAllowedPerYear <= 366)) throw new Error("Days per year must be 0–366");
  if (!Number.isInteger(input.eligibleAfterMonths) || input.eligibleAfterMonths < 0 || input.eligibleAfterMonths > 120) throw new Error("Eligibility must be 0–120 months");
  if (!(input.maxCarryOverDays >= 0 && input.maxCarryOverDays <= 366)) throw new Error("Carry-over must be 0–366 days");
  if (input.maxDaysPerRequest != null && !(input.maxDaysPerRequest > 0 && input.maxDaysPerRequest <= 366)) throw new Error("Maximum per request must be 1–366 days");
  let tiers: Array<{ upToDays: number; percent: number }> | null = null;
  if (input.payTiers?.length) {
    tiers = [...input.payTiers].sort((a, b) => a.upToDays - b.upToDays);
    let previous = 0;
    for (const tier of tiers) {
      if (!(tier.upToDays > previous) || !Number.isInteger(tier.percent) || tier.percent < 0 || tier.percent > 100)
        throw new Error("Pay bands need increasing day limits and a 0–100% pay each");
      previous = tier.upToDays;
    }
  }
  const data = {
    code,
    nameEn: input.nameEn.trim(),
    nameAr: input.nameAr.trim() || input.nameEn.trim(),
    payPercent: input.payPercent,
    isPaid: tiers ? tiers.some((t) => t.percent > 0) : input.payPercent > 0,
    payTiers: (tiers ?? undefined) as Prisma.InputJsonValue | undefined,
    accrual: input.accrual,
    daysAllowedPerYear: input.daysAllowedPerYear,
    eligibleAfterMonths: input.eligibleAfterMonths,
    maxCarryOverDays: input.maxCarryOverDays,
    maxDaysPerRequest: input.maxDaysPerRequest,
    allowHalfDay: input.allowHalfDay,
    allowHours: input.allowHours,
    countCalendarDays: input.countCalendarDays,
    requiresAttachment: input.requiresAttachment,
    requiresHandover: !!input.requiresHandover,
    isActive: input.isActive,
    sortOrder: input.sortOrder,
  };
  const clash = await db.leaveType.findUnique({ where: { code } });
  if (clash && clash.id !== input.id) throw new Error("Another leave type uses this code");
  if (input.id) {
    return db.leaveType.update({ where: { id: input.id }, data: { ...data, payTiers: tiers ? (tiers as Prisma.InputJsonValue) : Prisma.DbNull } });
  }
  return db.leaveType.create({ data });
}
