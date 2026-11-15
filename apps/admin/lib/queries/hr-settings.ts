import { companyCurrency } from "../finance/company-currency";
import { isCountryCode } from "../constants/clients";
import {
  serverTemplates,
  formatMessage,
  serverMessages,
} from "@platform/locales";

import {
  listLeaveTypesApi,
  listShiftTypesApi,
  saveLeaveTypeApi,
  saveShiftTypeApi,
} from "../api/hr";
import {
  deleteSystemPublicHolidayApi,
  listSystemHrPoliciesApi,
  listSystemPublicHolidaysApi,
  saveSystemHrPolicyApi,
  saveSystemPublicHolidayApi,
} from "../api/system-workspace";
import {
  DEFAULT_HR_POLICY,
  type HrPolicyRules,
  type LeaveTypeRules,
} from "../hr/payroll-engine";

export async function getHrPolicy(): Promise<HrPolicyRules> {
  const rows = await listSystemHrPoliciesApi().catch(() => []);
  const row = rows.find((r) => r.id === "default") ?? rows[0];
  const currency = await companyCurrency();
  if (!row) return { ...DEFAULT_HR_POLICY, currency };
  return {
    ...DEFAULT_HR_POLICY,
    currency,
    visaExemptCountries: row.visa_exempt_countries ?? row.visaExemptCountries ?? DEFAULT_HR_POLICY.visaExemptCountries,
    salaryTiming: (row.salary_timing ?? row.salaryTiming ?? DEFAULT_HR_POLICY.salaryTiming) as HrPolicyRules["salaryTiming"],
    payDay: row.pay_day ?? row.payDay ?? DEFAULT_HR_POLICY.payDay,
    attendanceCutoffDay: row.attendance_cutoff_day ?? row.attendanceCutoffDay ?? DEFAULT_HR_POLICY.attendanceCutoffDay,
    weekendDays: row.weekend_days ?? row.weekendDays ?? DEFAULT_HR_POLICY.weekendDays,
    workdayHours: Number(row.workday_hours ?? row.workdayHours ?? DEFAULT_HR_POLICY.workdayHours),
    workdayStart: row.workday_start ?? row.workdayStart ?? DEFAULT_HR_POLICY.workdayStart,
    dailyRateBasis: (row.daily_rate_basis ?? row.dailyRateBasis ?? DEFAULT_HR_POLICY.dailyRateBasis) as HrPolicyRules["dailyRateBasis"],
    deductionBase: (row.deduction_base ?? row.deductionBase ?? DEFAULT_HR_POLICY.deductionBase) as HrPolicyRules["deductionBase"],
    overtimeBase: (row.overtime_base ?? row.overtimeBase ?? DEFAULT_HR_POLICY.overtimeBase) as HrPolicyRules["overtimeBase"],
    overtimeRate: Number(row.overtime_rate ?? row.overtimeRate ?? DEFAULT_HR_POLICY.overtimeRate),
    overtimeNightRate: Number(row.overtime_night_rate ?? row.overtimeNightRate ?? DEFAULT_HR_POLICY.overtimeNightRate),
    overtimeRestDayRate: Number(row.overtime_rest_day_rate ?? row.overtimeRestDayRate ?? DEFAULT_HR_POLICY.overtimeRestDayRate),
    overtimeHolidayRate: Number(row.overtimeHolidayRate),
    lateGraceMinutes: row.lateGraceMinutes,
    deductLateness: row.deductLateness,
    unmarkedDays: row.unmarkedDays as HrPolicyRules["unmarkedDays"],
    prorateJoiners: row.prorateJoiners,
    commissionInPayroll: row.commissionInPayroll,
  };
}

export function validateHrPolicy(input: HrPolicyRules): HrPolicyRules {
  if (input.visaExemptCountries !== undefined && (!Array.isArray(input.visaExemptCountries) || input.visaExemptCountries.some((country) => !isCountryCode(country)))) throw new Error(serverMessages.invalidInput);
  const int = (value: number, min: number, max: number, label: string) => {
    if (!Number.isInteger(value) || value < min || value > max)
      throw new Error(
        formatMessage(serverTemplates["0MustBeBetween1And2"], {
          0: label,
          1: min,
          2: max,
        }),
      );
    return value;
  };
  const rate = (value: number, label: string) => {
    if (!Number.isFinite(value) || value < 1 || value > 5)
      throw new Error(
        formatMessage(serverTemplates["0MustBeBetween1And5"], { 0: label }),
      );
    return Math.round(value * 100) / 100;
  };
  if (!["arrears", "current"].includes(input.salaryTiming))
    throw new Error(serverMessages.chooseWhenSalariesArePaid);
  if (!["30", "calendar_days", "working_days"].includes(input.dailyRateBasis))
    throw new Error(serverMessages.chooseHowTheDailyRateIsWorked);
  if (
    !["basic", "fixed"].includes(input.deductionBase) ||
    !["basic", "fixed"].includes(input.overtimeBase)
  )
    throw new Error(serverMessages.chooseThePayUsedForDeductionsAnd);
  if (!["present", "absent"].includes(input.unmarkedDays))
    throw new Error(serverMessages.chooseHowUnmarkedDaysCount);
  const weekendDays = Array.from(new Set(input.weekendDays)).sort();
  if (
    weekendDays.length > 3 ||
    weekendDays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)
  )
    throw new Error(serverMessages.chooseUpToThreeWeekendDays);
  if (!(input.workdayHours >= 1 && input.workdayHours <= 16))
    throw new Error(serverMessages.workingHoursMustBeBetween1And);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.workdayStart ?? ""))
    throw new Error(serverMessages.theWorkingDayStartMustBeHh);
  return {
    ...input,
    payDay: int(input.payDay, 1, 31, "Pay day"),
    attendanceCutoffDay:
      input.salaryTiming === "current" && input.attendanceCutoffDay != null
        ? int(input.attendanceCutoffDay, 1, 28, "Attendance cut-off")
        : null,
    weekendDays,
    workdayHours: Math.round(input.workdayHours * 100) / 100,
    lateGraceMinutes: int(input.lateGraceMinutes, 0, 240, "Grace minutes"),
    overtimeRate: rate(input.overtimeRate, "Overtime rate"),
    overtimeNightRate: rate(input.overtimeNightRate, "Night overtime rate"),
    overtimeRestDayRate: rate(
      input.overtimeRestDayRate,
      "Rest-day overtime rate",
    ),
    overtimeHolidayRate: rate(
      input.overtimeHolidayRate,
      "Holiday overtime rate",
    ),
  };
}

export async function updateHrPolicy(
  input: HrPolicyRules,
  _actorId: string,
): Promise<HrPolicyRules> {
  const { currency: _currency, ...data } = validateHrPolicy(input);
  await saveSystemHrPolicyApi({
    id: "default",
    salary_timing: data.salaryTiming,
    pay_day: data.payDay,
    attendance_cutoff_day: data.attendanceCutoffDay,
    workday_hours: data.workdayHours,
    workday_start: data.workdayStart,
    daily_rate_basis: data.dailyRateBasis,
    deduction_base: data.deductionBase,
    overtime_base: data.overtimeBase,
    overtime_rate: data.overtimeRate,
    overtime_night_rate: data.overtimeNightRate,
    overtime_rest_day_rate: data.overtimeRestDayRate,
    overtime_holiday_rate: data.overtimeHolidayRate,
    late_grace_minutes: data.lateGraceMinutes,
    deduct_lateness: data.deductLateness,
    unmarked_days: data.unmarkedDays,
    prorate_joiners: data.prorateJoiners,
    commission_in_payroll: data.commissionInPayroll,
    gratuity_rules: (data as any).gratuityRules as any,
  });
  return getHrPolicy();
}

export async function listPublicHolidays(year?: number) {
  const rows = await listSystemPublicHolidaysApi().catch(() => []);
  return rows
    .map((h) => ({
      id: h.id,
      date: String(h.date).slice(0, 10),
      nameEn: h.name_en ?? h.nameEn,
      nameAr: h.name_ar ?? h.nameAr,
    }))
    .filter((h) => (!year ? true : h.date.startsWith(`${year}-`)))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function holidaySet(start: Date, end: Date): Promise<Set<string>> {
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);
  const rows = await listPublicHolidays();
  return new Set(
    rows
      .filter((h) => h.date >= startStr && h.date <= endStr)
      .map((h) => h.date),
  );
}

export async function savePublicHoliday(input: {
  id?: string | null;
  date: string;
  nameEn: string;
  nameAr: string;
}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date))
    throw new Error(serverMessages.chooseADate);
  const nameEn = input.nameEn.trim();
  const nameAr = input.nameAr.trim() || nameEn;
  if (!nameEn || nameEn.length > 120 || nameAr.length > 120)
    throw new Error(serverMessages.giveTheHolidayAName);
  const existing = await listPublicHolidays();
  const clash = existing.find((h) => h.date === input.date);
  if (clash && clash.id !== input.id)
    throw new Error(serverMessages.thereIsAlreadyAHolidayOnThat);
  return saveSystemPublicHolidayApi({
    id: input.id,
    date: input.date,
    nameEn,
    nameAr,
  });
}

export async function deletePublicHoliday(id: string) {
  await deleteSystemPublicHolidayApi(id);
}

export interface ShiftTypeView {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  allowanceMode: "fixed" | "percent";
  allowanceValue: number;
  isActive: boolean;
}

export async function listShiftTypes(): Promise<ShiftTypeView[]> {
  const rows = await listShiftTypesApi().catch(() => []);
  return rows.map((s) => ({
    id: s.id,
    code: s.code,
    nameEn: s.name_en ?? s.nameEn,
    nameAr: s.name_ar ?? s.nameAr,
    allowanceMode: (s.allowance_mode ?? s.allowanceMode) as "fixed" | "percent",
    allowanceValue: Number(s.allowance_value ?? s.allowanceValue ?? 0),
    isActive: Boolean(s.is_active ?? s.isActive ?? true),
  }));
}

export async function saveShiftType(
  input: Omit<ShiftTypeView, "id"> & { id?: string | null },
) {
  const code = input.code
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .slice(0, 40);
  if (!code) throw new Error(serverMessages.giveTheShiftACode);
  if (!input.nameEn.trim()) throw new Error(serverMessages.giveTheShiftAName);
  if (!["fixed", "percent"].includes(input.allowanceMode))
    throw new Error(serverMessages.chooseHowTheAllowanceIsPaid);
  if (
    !(input.allowanceValue >= 0) ||
    (input.allowanceMode === "percent" && input.allowanceValue > 200) ||
    input.allowanceValue > 100000
  )
    throw new Error(serverMessages.enterAValidAllowance);
  return saveShiftTypeApi({
    id: input.id ?? "",
    code,
    nameEn: input.nameEn.trim(),
    nameAr: input.nameAr.trim() || input.nameEn.trim(),
    allowanceMode: input.allowanceMode,
    allowanceValue: Math.round(input.allowanceValue * 1000) / 1000,
    isActive: input.isActive,
  });
}

export interface LeaveTypeView extends LeaveTypeRules {
  nameEn: string;
  nameAr: string;
  isPaid: boolean;
  requiresAttachment: boolean;
  requiresHandover?: boolean;
  isActive: boolean;
  sortOrder: number;
}

type LeaveTypeRow = any;

export function toLeaveTypeRules(row: LeaveTypeRow): LeaveTypeView {
  return {
    id: row.id,
    code: row.code,
    nameEn: row.name_en ?? row.nameEn,
    nameAr: row.name_ar ?? row.nameAr,
    isPaid: Boolean(row.is_paid ?? row.isPaid),
    payPercent: Number(row.pay_percent ?? row.payPercent ?? 100),
    payTiers: Array.isArray(row.payTiers)
      ? (row.payTiers as Array<{ upToDays: number; percent: number }>)
      : null,
    accrual: (row.accrual ?? "annual") as LeaveTypeRules["accrual"],
    daysAllowedPerYear: Number(row.days_allowed_per_year ?? row.daysAllowedPerYear ?? 0),
    eligibleAfterMonths: Number(row.eligible_after_months ?? row.eligibleAfterMonths ?? 0),
    maxCarryOverDays: Number(row.max_carry_over_days ?? row.maxCarryOverDays ?? 0),
    maxDaysPerRequest:
      (row.max_days_per_request ?? row.maxDaysPerRequest) == null
        ? null
        : Number(row.max_days_per_request ?? row.maxDaysPerRequest),
    allowHalfDay: Boolean(row.allow_half_day ?? row.allowHalfDay ?? true),
    allowHours: Boolean(row.allow_hours ?? row.allowHours ?? false),
    countCalendarDays: Boolean(row.count_calendar_days ?? row.countCalendarDays ?? false),
    requiresAttachment: Boolean(row.requires_attachment ?? row.requiresAttachment ?? false),
    requiresHandover: Boolean(row.requires_handover ?? row.requiresHandover ?? false),
    isActive: Boolean(row.is_active ?? row.isActive ?? true),
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
  };
}

export async function listLeaveTypeRules(
  options: { activeOnly?: boolean } = {},
): Promise<LeaveTypeView[]> {
  const rows = await listLeaveTypesApi().catch(() => []);
  const mapped = rows.map(toLeaveTypeRules);
  return options.activeOnly ? mapped.filter((r) => r.isActive) : mapped;
}

export type LeaveTypeInput = Omit<LeaveTypeView, "id" | "isPaid"> & {
  id?: string | null;
};

export async function saveLeaveType(input: LeaveTypeInput) {
  const code = input.code
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .slice(0, 40);
  if (!code || !input.nameEn.trim())
    throw new Error(serverMessages.giveTheLeaveTypeACodeAnd);
  if (!["annual", "monthly", "none"].includes(input.accrual))
    throw new Error(serverMessages.chooseHowTheBalanceIsEarned);
  if (
    !Number.isInteger(input.payPercent) ||
    input.payPercent < 0 ||
    input.payPercent > 100
  )
    throw new Error(serverMessages.payMustBe0100);
  if (!(input.daysAllowedPerYear >= 0 && input.daysAllowedPerYear <= 366))
    throw new Error(serverMessages.daysPerYearMustBe0366);
  if (
    !Number.isInteger(input.eligibleAfterMonths) ||
    input.eligibleAfterMonths < 0 ||
    input.eligibleAfterMonths > 120
  )
    throw new Error(serverMessages.eligibilityMustBe0120Months);
  if (!(input.maxCarryOverDays >= 0 && input.maxCarryOverDays <= 366))
    throw new Error(serverMessages.carryOverMustBe0366Days);
  if (
    input.maxDaysPerRequest != null &&
    !(input.maxDaysPerRequest > 0 && input.maxDaysPerRequest <= 366)
  )
    throw new Error(serverMessages.maximumPerRequestMustBe1366);
  let tiers: Array<{ upToDays: number; percent: number }> | null = null;
  if (input.payTiers?.length) {
    tiers = [...input.payTiers].sort((a, b) => a.upToDays - b.upToDays);
    let previous = 0;
    for (const tier of tiers) {
      if (
        !(tier.upToDays > previous) ||
        !Number.isInteger(tier.percent) ||
        tier.percent < 0 ||
        tier.percent > 100
      )
        throw new Error(serverMessages.payBandsNeedIncreasingDayLimitsAnd);
      previous = tier.upToDays;
    }
  }
  const data = {
    code,
    nameEn: input.nameEn.trim(),
    nameAr: input.nameAr.trim() || input.nameEn.trim(),
    payPercent: input.payPercent,
    isPaid: tiers ? tiers.some((t) => t.percent > 0) : input.payPercent > 0,
    payTiers: tiers ?? undefined,
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
  const existing = await listLeaveTypeRules();
  const clash = existing.find((lt) => lt.code === code);
  if (clash && clash.id !== input.id)
    throw new Error(serverMessages.anotherLeaveTypeUsesThisCode);
  return saveLeaveTypeApi({
    id: input.id ?? "",
    code,
    nameEn: data.nameEn,
    nameAr: data.nameAr,
    daysAllowedPerYear: data.daysAllowedPerYear,
    isPaid: data.isPaid,
    payPercent: data.payPercent,
  });
}
