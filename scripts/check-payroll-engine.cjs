// Run: node scripts/check-payroll-engine.cjs
// Payroll, attendance and leave arithmetic (no database).
require("ts-node").register({ transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", moduleResolution: "Node", esModuleInterop: true } });
const assert = require("node:assert/strict");
const e = require("../apps/admin/lib/database/hr/payroll-engine.ts");

const D = (s) => new Date(`${s}T00:00:00Z`);
const key = (d) => d.toISOString().slice(0, 10);
const none = new Set();
const policy = (patch = {}) => ({ ...e.DEFAULT_HR_POLICY, ...patch });
const day = (date, patch = {}) => ({ date, status: "present", lateMinutes: 0, overtimeMinutes: 0, overtimeNightMinutes: 0, overtimeRestDayMinutes: 0, overtimeHolidayMinutes: 0, shift: null, ...patch });
const pay = { basic: 3000, housing: 400, transport: 100, other: 0 }; // fixed 3,500
const run = (patch = {}) => {
  const p = patch.policy ?? policy();
  return e.computeEmployeePayroll({
    hireDate: D("2020-01-01"), pay, window: e.payrollWindow(p, 2026, 9), policy: p, holidays: none, attendance: [], leaves: [], ...patch,
  });
};
const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 0.0015, `${message}: expected ${expected}, got ${actual}`);

// --- Pay periods ---
// Paid on 1 October: the salary is September's and all of September is counted.
let w = e.payrollWindow(policy({ salaryTiming: "arrears", payDay: 1 }), 2026, 9);
assert.deepEqual([key(w.attendanceStart), key(w.attendanceEnd), key(w.payDate)], ["2026-09-01", "2026-09-30", "2026-10-01"]);
// Paid on 26 September: counts 26 Aug – 25 Sep; 26–30 Sep belong to October's run.
w = e.payrollWindow(policy({ salaryTiming: "current", payDay: 26 }), 2026, 9);
assert.deepEqual([key(w.attendanceStart), key(w.attendanceEnd), key(w.payDate)], ["2026-08-26", "2026-09-25", "2026-09-26"]);
const october = e.payrollWindow(policy({ salaryTiming: "current", payDay: 26 }), 2026, 10);
assert.deepEqual([key(october.attendanceStart), key(october.attendanceEnd)], ["2026-09-26", "2026-10-25"]);
// January wraps to the previous year; a pay day of 31 clamps to short months.
w = e.payrollWindow(policy({ salaryTiming: "current", payDay: 26 }), 2027, 1);
assert.equal(key(w.attendanceStart), "2026-12-26");
assert.equal(key(e.payrollWindow(policy({ salaryTiming: "arrears", payDay: 31 }), 2026, 1).payDate), "2026-02-28");
// An explicit cut-off overrides the pay day.
assert.equal(key(e.payrollWindow(policy({ salaryTiming: "current", payDay: 28, attendanceCutoffDay: 20 }), 2026, 9).attendanceEnd), "2026-09-20");

// --- Daily rate and absence ---
let b = run({ attendance: [day("2026-09-07", { status: "absent" }), day("2026-09-08", { status: "absent" })] });
close(b.dailyRate, 116.667, "daily rate = fixed pay / 30");
close(b.absenceDeduction, 233.333, "two absent days");
assert.equal(b.summary.absentDays, 2);
b = run({ attendance: [day("2026-09-07", { status: "half_day" })] });
close(b.absenceDeduction, 58.333, "half day absent");
// Basic-only deduction base and working-day divisor (Sep 2026 has 22 working days, Fri/Sat weekend).
b = run({ policy: policy({ deductionBase: "basic", dailyRateBasis: "working_days" }), attendance: [day("2026-09-07", { status: "absent" })] });
close(b.absenceDeduction, 3000 / 22, "basic / working days");
// The absence on 28 September (current timing, cut-off 25) is deducted in October, not September.
const current = policy({ salaryTiming: "current", payDay: 26 });
const late = [day("2026-09-28", { status: "absent" })];
assert.equal(run({ policy: current, window: e.payrollWindow(current, 2026, 9), attendance: late }).absenceDeduction, 0);
close(run({ policy: current, window: october, attendance: late }).absenceDeduction, 116.667, "carried to October");
// Unmarked working days count as present by default, or as absent if the policy says so.
assert.equal(run().absenceDeduction, 0);
assert.equal(run().summary.unmarkedDays, 22);
close(run({ policy: policy({ unmarkedDays: "absent" }) }).absenceDeduction, 3500, "absent on every working day: no salary");
const allButOne = ["01", "02", "03", "06", "07", "08", "09", "10", "13", "14", "15", "16", "17", "20", "21", "22", "23", "24", "27", "28", "29"].map((d) => day(`2026-09-${d}`, { status: "absent" }));
close(run({ attendance: allButOne }).absenceDeduction, 21 * 3500 / 30, "21 absent days, one worked");

// --- Leave ---
const unpaid = { payPercent: 0, payTiers: null, countCalendarDays: false };
const annual = { payPercent: 100, payTiers: null, countCalendarDays: false };
const sick = { payPercent: 100, payTiers: [{ upToDays: 15, percent: 100 }, { upToDays: 35, percent: 50 }, { upToDays: 55, percent: 0 }], countCalendarDays: false };
const leave = (type, start, end, extra = {}) => ({ typeCode: extra.code ?? "x", type, start: D(start), end: D(end), portion: "full", takenBefore: 0, ...extra });
// Paid annual leave costs nothing; unpaid leave is deducted per working day (Thu 10 – Sun 13 Sep = 2 working days).
assert.equal(run({ leaves: [leave(annual, "2026-09-10", "2026-09-13")] }).leaveDeduction, 0);
b = run({ leaves: [leave(unpaid, "2026-09-10", "2026-09-13", { code: "unpaid" })] });
close(b.leaveDeduction, 233.333, "two unpaid working days");
assert.deepEqual(b.summary.leave.unpaid, { days: 2, unpaidDays: 2 });
close(run({ leaves: [leave(unpaid, "2026-09-07", "2026-09-07", { portion: "half_am" })] }).leaveDeduction, 58.333, "unpaid half day");
close(run({ leaves: [leave(unpaid, "2026-09-07", "2026-09-07", { portion: "hours", hourFraction: 0.25 })] }).leaveDeduction, 29.167, "two unpaid hours");
// Sick leave bands: with 14 days used, three more days pay 1 full + 2 half → 1 unpaid day.
assert.equal(e.leavePaidDays(sick, 14, 3), 2);
assert.equal(e.leavePaidDays(sick, 34, 3), 0.5);
assert.equal(e.leavePaidDays(sick, 60, 2), 0);
b = run({ leaves: [leave(sick, "2026-09-07", "2026-09-09", { takenBefore: 14, code: "sick" })] });
close(b.leaveDeduction, 116.667, "sick leave over the full-pay band");
assert.deepEqual(b.summary.leave.sick, { days: 3, unpaidDays: 1 });
// A half day leave plus a half-day attendance record means the employee was there the other half.
assert.equal(run({ leaves: [leave(annual, "2026-09-07", "2026-09-07", { portion: "half_pm" })], attendance: [day("2026-09-07", { status: "half_day" })] }).absenceDeduction, 0);

// Days charged by a request.
const types = { countCalendarDays: false, allowHalfDay: true, allowHours: true, maxDaysPerRequest: null };
assert.equal(e.leaveDaysCharged({ start: D("2026-09-10"), end: D("2026-09-13"), portion: "full" }, types, policy(), none), 2);
assert.equal(e.leaveDaysCharged({ start: D("2026-09-10"), end: D("2026-09-13"), portion: "full" }, { ...types, countCalendarDays: true }, policy(), none), 4);
assert.equal(e.leaveDaysCharged({ start: D("2026-09-10"), end: D("2026-09-13"), portion: "full" }, types, policy({ weekendDays: [0, 6] }), none), 2, "Sat/Sun weekend");
assert.equal(e.leaveDaysCharged({ start: D("2026-09-07"), end: D("2026-09-07"), portion: "half_am" }, types, policy(), none), 0.5);
assert.equal(e.leaveDaysCharged({ start: D("2026-09-07"), end: D("2026-09-07"), portion: "hours", hours: 3 }, types, policy(), none), 0.38);
assert.equal(e.leaveDaysCharged({ start: D("2026-09-07"), end: D("2026-09-09"), portion: "full" }, types, policy(), new Set(["2026-09-08"])), 2, "public holiday not charged");
assert.throws(() => e.leaveDaysCharged({ start: D("2026-09-07"), end: D("2026-09-07"), portion: "half_am" }, { ...types, allowHalfDay: false }, policy(), none), /half day/);
assert.throws(() => e.leaveDaysCharged({ start: D("2026-09-07"), end: D("2026-09-07"), portion: "hours", hours: 2 }, { ...types, allowHours: false }, policy(), none), /by the hour/);
assert.throws(() => e.leaveDaysCharged({ start: D("2026-09-07"), end: D("2026-09-08"), portion: "half_am" }, types, policy(), none), /single day/);
assert.throws(() => e.leaveDaysCharged({ start: D("2026-09-11"), end: D("2026-09-12"), portion: "full" }, types, policy(), none), /no working days/);
assert.throws(() => e.leaveDaysCharged({ start: D("2026-09-07"), end: D("2026-09-17"), portion: "full" }, { ...types, maxDaysPerRequest: 5 }, policy(), none), /At most 5/);

// Entitlement: 30 days a year earned monthly (2.5 per completed month); annual prorated for joiners.
const monthly = { accrual: "monthly", daysAllowedPerYear: 30 };
assert.equal(e.leaveEntitlement(monthly, D("2020-01-01"), 2026, D("2026-03-31")), 7.5);
assert.equal(e.leaveEntitlement(monthly, D("2020-01-01"), 2026, D("2026-03-30")), 5);
assert.equal(e.leaveEntitlement(monthly, D("2020-01-01"), 2026, D("2026-12-31")), 30);
assert.equal(e.leaveEntitlement(monthly, D("2026-07-15"), 2026, D("2026-09-20")), 5, "joined mid-July: two completed months by 20 Sep");
assert.equal(e.leaveEntitlement({ accrual: "annual", daysAllowedPerYear: 30 }, D("2020-01-01"), 2026, D("2026-01-01")), 30);
assert.equal(e.leaveEntitlement({ accrual: "annual", daysAllowedPerYear: 30 }, D("2026-07-02"), 2026, D("2026-07-02")), 15.04, "183 of 365 days");
assert.equal(e.leaveEntitlement({ accrual: "none", daysAllowedPerYear: 0 }, D("2020-01-01"), 2026, D("2026-07-02")), null);
assert.equal(e.monthsOfService(D("2026-01-15"), D("2026-04-14")), 2);
assert.equal(e.monthsOfService(D("2026-01-15"), D("2026-04-15")), 3);

// --- Overtime, shifts, lateness ---
// Hourly overtime base = basic / 30 / 8 = 12.5.
b = run({ attendance: [day("2026-09-07", { overtimeMinutes: 600, overtimeNightMinutes: 120, overtimeRestDayMinutes: 60, overtimeHolidayMinutes: 60 })] });
close(b.overtimePay, 10 * 12.5 * 1.25 + 2 * 12.5 * 1.5 + 12.5 * 1.5 + 12.5 * 2, "overtime at each rate");
assert.deepEqual(b.summary.overtime, { normal: 600, night: 120, restDay: 60, holiday: 60 });
const night = { code: "night", mode: "fixed", value: 5 };
const location = { code: "location", mode: "percent", value: 10 };
b = run({ attendance: [day("2026-09-07", { shift: night }), day("2026-09-08", { shift: night }), day("2026-09-09", { shift: location }), day("2026-09-10", { status: "absent", shift: night })] });
close(b.shiftAllowance, 10 + 11.667, "shift allowances; none for an absent day");
assert.deepEqual(b.summary.shifts, { night: 2, location: 1 });
b = run({ policy: policy({ deductLateness: true }), attendance: [day("2026-09-07", { lateMinutes: 45 }), day("2026-09-08", { lateMinutes: 10 })] });
close(b.latenessDeduction, (30 / 60) * (3500 / 30 / 8), "only minutes past the 15-minute grace");
assert.equal(run({ attendance: [day("2026-09-07", { lateMinutes: 45 })] }).latenessDeduction, 0, "lateness off by default");

// --- Joiners and totals ---
b = run({ hireDate: D("2026-09-16") });
close(b.absenceDeduction, 3500 * 15 / 30, "joined on the 16th: 15 of 30 days unpaid");
assert.equal(b.summary.notEmployedDays, 15);
assert.equal(run({ hireDate: D("2026-09-16"), policy: policy({ prorateJoiners: false }) }).absenceDeduction, 0);
b = run({ commission: 420.5, bonus: 100, otherDeductions: 50, attendance: [day("2026-09-07", { status: "absent", overtimeMinutes: 120 })] });
const totals = e.payrollTotals(b, 245);
close(totals.gross, 3500 + 31.25 + 420.5 + 100, "gross includes overtime, commission and bonus");
close(totals.deductions, 245 + 116.667 + 50, "deductions include contribution, absence and other");
close(totals.net, totals.gross - totals.deductions, "net");
assert.throws(() => e.payrollTotals({ ...b, otherDeductions: 99999 }, 0), /cannot exceed/);

console.log("Payroll engine checks passed: arrears and cut-off pay periods with carry-over, daily rate bases, absence and half days, unmarked-day policy, unpaid/half-day/hourly leave, sick-leave pay bands, working vs calendar days and holidays, accrual and joiner proration, overtime rates, shift allowances, lateness grace, joiner proration, totals.");
