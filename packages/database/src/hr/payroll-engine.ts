import { serverTemplates, formatMessage, serverMessages } from "@ishoot/locales";

/**
 * Payroll and leave arithmetic with no database access, so every rule can be unit tested.
 *
 * Money is BHD rounded to 3 decimals. Dates are handled as UTC calendar days ("YYYY-MM-DD").
 */

export interface HrPolicyRules {
  salaryTiming: "arrears" | "current";
  payDay: number;
  attendanceCutoffDay: number | null;
  weekendDays: number[];
  workdayHours: number;
  /** Local start of the working day (HH:MM); arriving later counts as late. */
  workdayStart: string;
  dailyRateBasis: "30" | "calendar_days" | "working_days";
  deductionBase: "basic" | "fixed";
  overtimeBase: "basic" | "fixed";
  overtimeRate: number;
  overtimeNightRate: number;
  overtimeRestDayRate: number;
  overtimeHolidayRate: number;
  lateGraceMinutes: number;
  deductLateness: boolean;
  unmarkedDays: "present" | "absent";
  prorateJoiners: boolean;
  commissionInPayroll: boolean;
}

export const DEFAULT_HR_POLICY: HrPolicyRules = {
  salaryTiming: "arrears",
  payDay: 1,
  attendanceCutoffDay: null,
  weekendDays: [5, 6],
  workdayHours: 8,
  workdayStart: "08:00",
  dailyRateBasis: "30",
  deductionBase: "fixed",
  overtimeBase: "basic",
  overtimeRate: 1.25,
  overtimeNightRate: 1.5,
  overtimeRestDayRate: 1.5,
  overtimeHolidayRate: 2,
  lateGraceMinutes: 15,
  deductLateness: false,
  unmarkedDays: "present",
  prorateJoiners: true,
  commissionInPayroll: true,
};

export const r3 = (value: number) => Math.round((value + Number.EPSILON) * 1000) / 1000;
const r2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

// ---------- Calendar days ----------

export const dayKey = (date: Date) => date.toISOString().slice(0, 10);
export const utcDay = (year: number, monthIndex: number, day: number) => new Date(Date.UTC(year, monthIndex, day));
export const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const startOfDay = (date: Date) => utcDay(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

export function eachDay(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  const cursor = startOfDay(start);
  const last = startOfDay(end).getTime();
  while (cursor.getTime() <= last) {
    out.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

export function isWorkingDay(date: Date, policy: Pick<HrPolicyRules, "weekendDays">, holidays: ReadonlySet<string>): boolean {
  return !policy.weekendDays.includes(date.getUTCDay()) && !holidays.has(dayKey(date));
}

export function workingDaysBetween(start: Date, end: Date, policy: Pick<HrPolicyRules, "weekendDays">, holidays: ReadonlySet<string>): number {
  return eachDay(start, end).filter((d) => isWorkingDay(d, policy, holidays)).length;
}

// ---------- Pay periods ----------

export interface PayrollWindow {
  /** The salary month being paid. */
  salaryStart: Date;
  salaryEnd: Date;
  /** Attendance, leave and commissions counted in this run. */
  attendanceStart: Date;
  attendanceEnd: Date;
  payDate: Date;
}

const clampDay = (year: number, month: number, day: number) => Math.min(day, daysInMonth(year, month));

/**
 * Arrears (e.g. paid on 1 October): pays September and counts all of September.
 * Current (e.g. paid on 26 September with cut-off 25): pays September, counts 26 August – 25 September,
 * so absences on 26–30 September are deducted in October's payroll.
 */
export function payrollWindow(policy: Pick<HrPolicyRules, "salaryTiming" | "payDay" | "attendanceCutoffDay">, year: number, month: number): PayrollWindow {
  const salaryStart = utcDay(year, month - 1, 1);
  const salaryEnd = utcDay(year, month, 0);
  if (policy.salaryTiming === "arrears") {
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    return {
      salaryStart,
      salaryEnd,
      attendanceStart: salaryStart,
      attendanceEnd: salaryEnd,
      payDate: utcDay(nextYear, nextMonth - 1, clampDay(nextYear, nextMonth, policy.payDay)),
    };
  }
  const payDay = clampDay(year, month, policy.payDay);
  const cutoff = Math.min(28, Math.max(1, policy.attendanceCutoffDay ?? payDay - 1));
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  return {
    salaryStart,
    salaryEnd,
    attendanceStart: utcDay(prevYear, prevMonth - 1, cutoff + 1),
    attendanceEnd: utcDay(year, month - 1, cutoff),
    payDate: utcDay(year, month - 1, payDay),
  };
}

// ---------- Leave ----------

export interface LeaveTypeRules {
  id: string;
  code: string;
  payPercent: number;
  payTiers: Array<{ upToDays: number; percent: number }> | null;
  accrual: "annual" | "monthly" | "none";
  daysAllowedPerYear: number;
  eligibleAfterMonths: number;
  maxCarryOverDays: number;
  maxDaysPerRequest: number | null;
  allowHalfDay: boolean;
  allowHours: boolean;
  countCalendarDays: boolean;
}

export type DayPortion = "full" | "half_am" | "half_pm" | "hours";

/** Days a request charges: working days (or calendar days for types like maternity), half days and hours. */
export function leaveDaysCharged(
  input: { start: Date; end: Date; portion: DayPortion; hours?: number | null },
  type: Pick<LeaveTypeRules, "countCalendarDays" | "allowHalfDay" | "allowHours" | "maxDaysPerRequest">,
  policy: Pick<HrPolicyRules, "weekendDays" | "workdayHours">,
  holidays: ReadonlySet<string>,
): number {
  if (input.end < input.start) throw new Error(serverMessages.theLeaveCannotEndBeforeItStarts);
  if (input.portion !== "full") {
    if (dayKey(input.start) !== dayKey(input.end)) throw new Error(serverMessages.halfDayAndHourlyLeaveCoverA);
    if (!type.countCalendarDays && !isWorkingDay(input.start, policy, holidays)) throw new Error(serverMessages.theSelectedDayIsNotAWorking);
  }
  let days: number;
  if (input.portion === "half_am" || input.portion === "half_pm") {
    if (!type.allowHalfDay) throw new Error(serverMessages.thisLeaveTypeCannotBeTakenAs);
    days = 0.5;
  } else if (input.portion === "hours") {
    if (!type.allowHours) throw new Error(serverMessages.thisLeaveTypeCannotBeTakenBy);
    const hours = Number(input.hours ?? 0);
    if (!(hours > 0) || hours >= policy.workdayHours) throw new Error(formatMessage(serverTemplates.hourlyLeaveMustBeBetween0And, { 0: policy.workdayHours }));
    days = r2(hours / policy.workdayHours);
  } else {
    days = type.countCalendarDays
      ? eachDay(input.start, input.end).length
      : workingDaysBetween(input.start, input.end, policy, holidays);
  }
  if (days <= 0) throw new Error(serverMessages.theSelectedPeriodHasNoWorkingDays);
  if (type.maxDaysPerRequest != null && days > type.maxDaysPerRequest)
    throw new Error(formatMessage(serverTemplates.atMost0DaySCanBe, { 0: type.maxDaysPerRequest }));
  return days;
}

/**
 * Paid share (in days) of `days` more leave of a type, given the days already taken this year.
 * With pay bands, each part of the leave is paid at the band it falls in; past the last band it is unpaid.
 */
export function leavePaidDays(type: Pick<LeaveTypeRules, "payPercent" | "payTiers">, alreadyTaken: number, days: number): number {
  if (!type.payTiers?.length) return r3((days * type.payPercent) / 100);
  const from = alreadyTaken;
  const to = alreadyTaken + days;
  let paid = 0;
  let lower = 0;
  for (const tier of [...type.payTiers].sort((a, b) => a.upToDays - b.upToDays)) {
    const overlap = Math.max(0, Math.min(to, tier.upToDays) - Math.max(from, lower));
    paid += (overlap * tier.percent) / 100;
    lower = tier.upToDays;
  }
  return r3(paid);
}

export function payPercentAt(type: Pick<LeaveTypeRules, "payPercent" | "payTiers">, dayNumber: number): number {
  if (!type.payTiers?.length) return type.payPercent;
  const tier = [...type.payTiers].sort((a, b) => a.upToDays - b.upToDays).find((t) => dayNumber <= t.upToDays);
  return tier ? tier.percent : 0;
}

export function monthsOfService(hireDate: Date, asOf: Date): number {
  let months = (asOf.getUTCFullYear() - hireDate.getUTCFullYear()) * 12 + (asOf.getUTCMonth() - hireDate.getUTCMonth());
  if (asOf.getUTCDate() < hireDate.getUTCDate()) months -= 1;
  return Math.max(0, months);
}

/** Days earned in `year` up to `asOf`; null when the type keeps no balance. */
export function leaveEntitlement(type: Pick<LeaveTypeRules, "accrual" | "daysAllowedPerYear">, hireDate: Date, year: number, asOf: Date): number | null {
  if (type.accrual === "none") return null;
  const yearStart = utcDay(year, 0, 1);
  const yearEnd = utcDay(year, 11, 31);
  const hire = startOfDay(hireDate);
  if (hire > yearEnd) return 0;
  const from = hire > yearStart ? hire : yearStart;
  if (type.accrual === "annual") {
    // The whole allowance, prorated by the days employed in the joining year.
    const yearDays = eachDay(yearStart, yearEnd).length;
    return r2((type.daysAllowedPerYear * eachDay(from, yearEnd).length) / yearDays);
  }
  // Monthly: one twelfth for each completed month of service in the year up to asOf.
  const until = asOf < yearEnd ? startOfDay(asOf) : yearEnd;
  if (until < from) return 0;
  const dayAfter = new Date(until.getTime() + 86_400_000);
  return r2((type.daysAllowedPerYear / 12) * Math.min(12, monthsOfService(from, dayAfter)));
}

// ---------- Payroll ----------

export interface AttendanceDay {
  date: string;
  status: "present" | "absent" | "half_day" | "on_leave" | "holiday";
  lateMinutes: number;
  overtimeMinutes: number;
  overtimeNightMinutes: number;
  overtimeRestDayMinutes: number;
  overtimeHolidayMinutes: number;
  shift?: { code: string; mode: "fixed" | "percent"; value: number } | null;
}

export interface LeaveInWindow {
  typeCode: string;
  type: Pick<LeaveTypeRules, "payPercent" | "payTiers" | "countCalendarDays">;
  start: Date;
  end: Date;
  portion: DayPortion;
  /** Charged days for hourly leave (hours / workday hours). */
  hourFraction?: number | null;
  /** Days of this type already taken this year before this leave started. */
  takenBefore: number;
}

export interface EmployeePayrollInput {
  hireDate: Date;
  pay: { basic: number; housing: number; transport: number; other: number };
  window: PayrollWindow;
  policy: HrPolicyRules;
  holidays: ReadonlySet<string>;
  attendance: AttendanceDay[];
  leaves: LeaveInWindow[];
  commission?: number;
  bonus?: number;
  otherDeductions?: number;
}

export interface PayrollBreakdown {
  fixedPay: number;
  dailyRate: number;
  hourlyOvertimeRate: number;
  overtimePay: number;
  shiftAllowance: number;
  commission: number;
  bonus: number;
  absenceDeduction: number;
  leaveDeduction: number;
  latenessDeduction: number;
  otherDeductions: number;
  summary: {
    attendanceStart: string;
    attendanceEnd: string;
    workingDays: number;
    presentDays: number;
    absentDays: number;
    halfDays: number;
    unmarkedDays: number;
    notEmployedDays: number;
    lateMinutes: number;
    deductibleLateMinutes: number;
    overtime: { normal: number; night: number; restDay: number; holiday: number };
    shifts: Record<string, number>;
    leave: Record<string, { days: number; unpaidDays: number }>;
    warnings: string[];
  };
}

/** Variable pay and attendance deductions for one employee in one run. Contributions are added by the caller. */
export function computeEmployeePayroll(input: EmployeePayrollInput): PayrollBreakdown {
  const { policy, window, holidays, pay } = input;
  const fixedPay = r3(pay.basic + pay.housing + pay.transport + pay.other);
  const salaryDays = daysInMonth(window.salaryStart.getUTCFullYear(), window.salaryStart.getUTCMonth() + 1);
  const divisor =
    policy.dailyRateBasis === "30" ? 30
      : policy.dailyRateBasis === "calendar_days" ? salaryDays
        : Math.max(1, workingDaysBetween(window.salaryStart, window.salaryEnd, policy, holidays));
  const deductionBase = policy.deductionBase === "basic" ? pay.basic : fixedPay;
  const dailyRate = deductionBase / divisor;
  const hourlyRate = dailyRate / policy.workdayHours;
  const overtimeBase = policy.overtimeBase === "basic" ? pay.basic : fixedPay;
  const hourlyOvertimeRate = overtimeBase / divisor / policy.workdayHours;

  const hire = startOfDay(input.hireDate);
  const attendance = new Map(input.attendance.map((day) => [day.date, day]));
  const warnings: string[] = [];
  const leaveSummary: PayrollBreakdown["summary"]["leave"] = {};

  // Leave days by date with the pay share for each.
  const leaveByDay = new Map<string, { code: string; fraction: number; paid: number }>();
  for (const leave of input.leaves) {
    const chargeable = eachDay(leave.start, leave.end).filter((d) => leave.type.countCalendarDays || isWorkingDay(d, policy, holidays));
    const perDay = leave.portion === "full" ? 1 : leave.portion === "hours" ? Number(leave.hourFraction ?? 0) : 0.5;
    let taken = leave.takenBefore;
    for (const day of chargeable) {
      const paidShare = leavePaidDays(leave.type, taken, perDay);
      taken += perDay;
      const key = dayKey(day);
      if (day < window.attendanceStart || day > window.attendanceEnd) continue;
      leaveByDay.set(key, { code: leave.typeCode, fraction: perDay, paid: paidShare });
      const row = (leaveSummary[leave.typeCode] ??= { days: 0, unpaidDays: 0 });
      row.days = r2(row.days + perDay);
      row.unpaidDays = r2(row.unpaidDays + (perDay - paidShare));
    }
  }

  let workingDays = 0;
  let presentDays = 0;
  let absentDays = 0;
  let halfDays = 0;
  let unmarkedDays = 0;
  let unpaidLeaveDays = 0;
  let lateMinutes = 0;
  let deductibleLateMinutes = 0;
  const overtime = { normal: 0, night: 0, restDay: 0, holiday: 0 };
  const shifts: Record<string, number> = {};
  let shiftAllowance = 0;

  for (const day of eachDay(window.attendanceStart, window.attendanceEnd)) {
    const key = dayKey(day);
    const entry = attendance.get(key);
    if (entry) {
      overtime.normal += entry.overtimeMinutes;
      overtime.night += entry.overtimeNightMinutes;
      overtime.restDay += entry.overtimeRestDayMinutes;
      overtime.holiday += entry.overtimeHolidayMinutes;
      if (entry.shift && entry.status !== "absent") {
        shifts[entry.shift.code] = (shifts[entry.shift.code] ?? 0) + 1;
        shiftAllowance += entry.shift.mode === "fixed" ? entry.shift.value : (dailyRate * entry.shift.value) / 100;
      }
    }
    if (day < hire) {
      continue;
    }
    const leave = leaveByDay.get(key);
    if (leave) unpaidLeaveDays += leave.fraction - leave.paid;
    if (!isWorkingDay(day, policy, holidays)) continue;
    workingDays++;
    // A part-day leave still expects the rest of the day to be worked.
    const leaveFraction = leave?.fraction ?? 0;
    if (leaveFraction >= 1) continue;
    if (!entry) {
      unmarkedDays++;
      if (policy.unmarkedDays === "absent") absentDays += 1 - leaveFraction;
      else presentDays++;
      continue;
    }
    if (entry.status === "absent") absentDays += 1 - leaveFraction;
    else if (entry.status === "half_day") {
      halfDays++;
      absentDays += Math.max(0, 0.5 - leaveFraction);
    } else if (entry.status === "on_leave" && !leave) {
      warnings.push(`on_leave_without_request:${key}`);
      absentDays += 1;
    } else presentDays++;
    if (entry.lateMinutes > 0) {
      lateMinutes += entry.lateMinutes;
      deductibleLateMinutes += Math.max(0, entry.lateMinutes - policy.lateGraceMinutes);
    }
  }

  // Joiners: days of the salary month before the hire date are not paid.
  let notEmployedDays = 0;
  let prorationDeduction = 0;
  if (policy.prorateJoiners && hire > window.salaryStart) {
    notEmployedDays = hire > window.salaryEnd ? salaryDays : eachDay(window.salaryStart, new Date(hire.getTime() - 86_400_000)).length;
    prorationDeduction = (fixedPay * notEmployedDays) / salaryDays;
  }
  if (unmarkedDays && policy.unmarkedDays === "present") warnings.push(`unmarked_days:${unmarkedDays}`);

  const overtimePay = r3(
    (hourlyOvertimeRate *
      (overtime.normal * policy.overtimeRate +
        overtime.night * policy.overtimeNightRate +
        overtime.restDay * policy.overtimeRestDayRate +
        overtime.holiday * policy.overtimeHolidayRate)) /
      60,
  );
  let absenceDeduction = absentDays * dailyRate + prorationDeduction;
  let leaveDeduction = unpaidLeaveDays * dailyRate;
  // With a 30-day or calendar basis, absent on every working day would still leave the weekends paid;
  // nothing worked and nothing paid means no salary for the period.
  if (workingDays > 0 && absentDays + unpaidLeaveDays >= workingDays - 1e-9 && absenceDeduction + leaveDeduction < fixedPay) {
    absenceDeduction = fixedPay - leaveDeduction;
    warnings.push("no_paid_days");
  }
  let latenessDeduction = policy.deductLateness ? (deductibleLateMinutes / 60) * hourlyRate : 0;
  // Attendance deductions never take more than the fixed pay.
  const totalAttendance = absenceDeduction + leaveDeduction + latenessDeduction;
  if (totalAttendance > fixedPay && totalAttendance > 0) {
    const factor = fixedPay / totalAttendance;
    absenceDeduction *= factor;
    leaveDeduction *= factor;
    latenessDeduction *= factor;
    warnings.push("deductions_capped");
  }

  return {
    fixedPay,
    dailyRate: r3(dailyRate),
    hourlyOvertimeRate: r3(hourlyOvertimeRate),
    overtimePay,
    shiftAllowance: r3(shiftAllowance),
    commission: r3(input.commission ?? 0),
    bonus: r3(input.bonus ?? 0),
    absenceDeduction: r3(absenceDeduction),
    leaveDeduction: r3(leaveDeduction),
    latenessDeduction: r3(latenessDeduction),
    otherDeductions: r3(input.otherDeductions ?? 0),
    summary: {
      attendanceStart: dayKey(window.attendanceStart),
      attendanceEnd: dayKey(window.attendanceEnd),
      workingDays,
      presentDays,
      absentDays: r2(absentDays),
      halfDays,
      unmarkedDays,
      notEmployedDays,
      lateMinutes,
      deductibleLateMinutes,
      overtime,
      shifts,
      leave: leaveSummary,
      warnings,
    },
  };
}

/** Final line: gross = fixed + variable pay; net = gross − employee contribution − all deductions. */
export function payrollTotals(b: Pick<PayrollBreakdown, "fixedPay" | "overtimePay" | "shiftAllowance" | "commission" | "bonus" | "absenceDeduction" | "leaveDeduction" | "latenessDeduction" | "otherDeductions">, employeeContribution: number) {
  const gross = r3(b.fixedPay + b.overtimePay + b.shiftAllowance + b.commission + b.bonus);
  const deductions = r3(employeeContribution + b.absenceDeduction + b.leaveDeduction + b.latenessDeduction + b.otherDeductions);
  const net = r3(gross - deductions);
  if (net < 0) throw new Error(serverMessages.deductionsCannotExceedTheMonthSPay);
  return { gross, deductions, net };
}
