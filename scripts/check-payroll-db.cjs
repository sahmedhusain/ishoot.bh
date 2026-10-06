// Run: node scripts/check-payroll-db.cjs  (local database only; everything is rolled back)
// End-to-end payroll: attendance, leave pay bands, overtime, shifts, commission, joiners, individual payments,
// attendance locks, pay-day cut-off carry-over, leave requests and balances.
require("dotenv").config({ quiet: true });
require("ts-node").register({ transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", moduleResolution: "Node", esModuleInterop: true, resolveJsonModule: true } });
const assert = require("node:assert/strict");
const { db } = require("../packages/database/src/db.ts");
const { transactionContext } = require("../packages/database/src/transaction-context.ts");
const { createEmployee } = require("../packages/database/src/queries/hrms.ts");
const payroll = require("../packages/database/src/queries/payroll.ts");
const attendance = require("../packages/database/src/queries/attendance.ts");
const settings = require("../packages/database/src/queries/hr-settings.ts");
const balances = require("../packages/database/src/queries/leave-balances.ts");
const { createLeaveRequest } = require("../packages/database/src/queries/leave.ts");
const { createQuotation, convertQuotationToInvoice } = require("../packages/database/src/queries/quotations.ts");
const { updateInvoiceStatus } = require("../packages/database/src/queries/invoices.ts");
const { createPayment } = require("../packages/database/src/queries/payments.ts");
const { recordCommissionPayout } = require("../packages/database/src/queries/sales-attribution.ts");
const engine = require("../packages/database/src/hr/payroll-engine.ts");

const rollback = new Error("ROLLBACK_PAYROLL_TEST");
const close = (actual, expected, message) => assert.ok(Math.abs(Number(actual) - expected) < 0.0015, `${message}: expected ${expected}, got ${actual}`);
const D = (s) => new Date(`${s}T00:00:00Z`);

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(url.hostname), "Run only against a local test/development database");
  try {
    await db.$transaction((tx) => transactionContext.run(tx, async () => {
      const actor = await tx.user.findFirstOrThrow({ where: { role: "super_admin", isActive: true }, select: { id: true } });
      const stamp = Date.now();
      await settings.updateHrPolicy({ ...engine.DEFAULT_HR_POLICY }, actor.id);
      const policy = await settings.getHrPolicy();
      const holidays = new Set();
      const type = async (code) => tx.leaveType.findUniqueOrThrow({ where: { code } });
      const [annual, sick, unpaid, hajj] = await Promise.all(["annual", "sick", "unpaid", "hajj"].map(type));

      // Only the test employees are paid in these runs.
      await tx.employee.updateMany({ data: { status: "suspended" } });
      const statutory = { employee: { mode: "percentage", value: 7 }, employer: { mode: "percentage", value: 12 }, supports: [] };
      const a = await createEmployee({ firstNameEn: "Payroll", lastNameEn: "Alpha", firstNameAr: "رواتب", lastNameAr: "ألف", jobTitleEn: "Producer", jobTitleAr: "منتج", hireDate: D("2020-01-01"), basicSalary: 3000, housingAllowance: 400, transportAllowance: 100, payrollSettings: statutory }, actor.id);
      const b = await createEmployee({ firstNameEn: "Payroll", lastNameEn: "Bravo", firstNameAr: "رواتب", lastNameAr: "باء", jobTitleEn: "Assistant", jobTitleAr: "مساعد", hireDate: D("2199-09-16"), basicSalary: 1000, payrollSettings: { employee: { mode: "fixed", value: 0 }, employer: { mode: "fixed", value: 0 }, supports: [] } }, actor.id);
      const seller = await tx.user.create({ data: { email: `alpha-${stamp}@payroll.test`, fullName: "Payroll Alpha", passwordHash: "x", role: "sales", commissionRatePercent: 5 } });
      await tx.employee.update({ where: { id: a.id }, data: { userId: seller.id } });

      // September 2199 working days (Friday/Saturday weekend).
      const wd = engine.eachDay(D("2199-09-01"), D("2199-09-30")).filter((d) => engine.isWorkingDay(d, policy, holidays)).map(engine.dayKey);
      const shift = await settings.saveShiftType({ code: `night_${stamp}`, nameEn: "Night shift", nameAr: "مناوبة ليلية", allowanceMode: "fixed", allowanceValue: 5, isActive: true });
      const entry = (date, data) => tx.attendanceEntry.create({ data: { employeeId: a.id, date: D(date), status: "present", ...data } });
      await entry(wd[0], { status: "absent" });
      await entry(wd[1], { status: "absent" });
      await entry(wd[2], { status: "half_day" });
      await entry(wd[3], { overtimeMinutes: 120 });
      await entry(wd[4], { lateMinutes: 40, shiftTypeId: shift.id });
      await entry(wd[5], { shiftTypeId: shift.id });
      // Sick leave: 14 days in February, then 3 days in September → 1 full-pay day + 2 half-pay days.
      const approvedLeave = (leaveType, start, end, days, extra = {}) =>
        tx.leaveRequest.create({ data: { employeeId: a.id, leaveTypeId: leaveType.id, startDate: D(start), endDate: D(end), days, status: "approved", approvedById: actor.id, approvedAt: new Date(), reason: "test", ...extra } });
      await approvedLeave(sick, "2199-02-01", "2199-02-18", 14);
      await approvedLeave(sick, wd[8], wd[10], 3);
      await approvedLeave(unpaid, wd[11], wd[11], 1);

      // Commission: an invoice credited to Alpha, paid in September (1,000 BHD net of VAT at 5%).
      const issuer = await tx.user.create({ data: { email: `issuer-${stamp}@payroll.test`, fullName: "Issuer", passwordHash: "x", role: "admin", signatureUrl: "/brand/signatures/guest.svg" } });
      const contact = await tx.crmContact.create({ data: { firstName: "Payroll", lastName: "Client" } });
      const quote = await createQuotation({ clientId: contact.id, salesOwnerId: seller.id, validUntilDate: new Date(Date.now() + 7 * 86400000), lineItems: [{ descriptionEn: "Film", quantity: 1, unitPrice: 1000 }] }, issuer.id);
      await tx.quotation.update({ where: { id: quote.id }, data: { status: "accepted" } });
      const { invoiceId } = await convertQuotationToInvoice(quote.id, issuer.id);
      const { signDocument, requestInvoiceApproval } = require("../packages/database/src/queries/document-signing.ts");
      await requestInvoiceApproval(invoiceId, issuer.id);
      await signDocument("invoice", invoiceId, issuer.id);
      await updateInvoiceStatus(invoiceId, "sent");
      const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
      await createPayment({ invoice_id: invoiceId, amount: Number(invoice.totalAmount), payment_date: "2199-09-10", payment_method: "bank_transfer" }, actor.id);

      // Times entered for a recent working day work out lateness (after 08:00) and overtime (past 8 hours);
      // a weekend day counts every minute as rest-day overtime. Future days are refused.
      const recent = engine.eachDay(new Date(Date.now() - 6 * 86400000), new Date()).map(engine.dayKey);
      const unlocked = await attendance.attendanceLockedThrough();
      const open = recent.filter((d) => !unlocked || d > engine.dayKey(unlocked));
      const workday = open.find((d) => engine.isWorkingDay(D(d), policy, holidays));
      const weekend = open.find((d) => !engine.isWorkingDay(D(d), policy, holidays));
      if (workday) {
        const cell = await attendance.saveAttendanceEntry({ employeeId: a.id, date: workday, status: "present", checkIn: "08:30", checkOut: "18:00" }, actor.id);
        assert.deepEqual([cell.lateMinutes, cell.overtimeMinutes, cell.checkIn, cell.checkOut], [30, 90, "08:30", "18:00"]);
        const override = await attendance.saveAttendanceEntry({ employeeId: a.id, date: workday, status: "present", checkIn: "08:30", checkOut: "18:00", lateMinutes: 0, overtimeMinutes: 60 }, actor.id);
        assert.deepEqual([override.lateMinutes, override.overtimeMinutes], [0, 60], "explicit values win");
      }
      if (weekend) {
        const cell = await attendance.saveAttendanceEntry({ employeeId: a.id, date: weekend, status: "present", checkIn: "10:00", checkOut: "14:00" }, actor.id);
        assert.deepEqual([cell.overtimeRestDayMinutes, cell.overtimeMinutes, cell.lateMinutes], [240, 0, 0]);
      }
      await assert.rejects(attendance.saveAttendanceEntry({ employeeId: a.id, date: engine.dayKey(new Date(Date.now() + 5 * 86400000)), status: "present" }, actor.id), /future/);
      await assert.rejects(attendance.saveAttendanceEntry({ employeeId: b.id, date: "2199-09-01", status: "present" }, actor.id), /had not joined|future/);
      const marked = await attendance.markMonthPresent(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, [a.id], actor.id);
      assert.ok(marked.created >= 0);

      // --- September run ---
      let run = await payroll.createPayrollRun(9, 2199, actor.id);
      assert.equal(run.items.length, 2);
      assert.equal(run.payDate.slice(0, 10), "2199-10-01", "paid on the 1st of the next month");
      let itemA = run.items.find((i) => i.employeeId === a.id);
      close(itemA.absenceDeduction, 2.5 * 3500 / 30, "two absent days and a half day");
      close(itemA.leaveDeduction, 2 * 3500 / 30, "one unpaid day + half of two half-pay sick days");
      close(itemA.overtimePay, 2 * 12.5 * 1.25, "two hours of overtime at 125% of basic hourly");
      close(itemA.shiftAllowance, 10, "two night shifts");
      close(itemA.commission, 50, "5% of 1,000 BHD collected");
      assert.equal(itemA.latenessDeduction, 0, "lateness is not deducted by default");
      close(itemA.gosiEmployee, 245, "7% of fixed pay");
      close(itemA.grossSalary, 3500 + 31.25 + 10 + 50, "gross");
      close(itemA.netSalary, 3591.25 - 245 - 291.667 - 233.333, "net");
      const summary = (await tx.payrollItem.findUniqueOrThrow({ where: { id: itemA.id } })).attendanceSummary;
      assert.equal(summary.absentDays, 2.5);
      assert.deepEqual(summary.leave.sick, { days: 3, unpaidDays: 1 });
      assert.deepEqual(summary.shifts, { [shift.code]: 2 });
      const itemB = run.items.find((i) => i.employeeId === b.id);
      close(itemB.absenceDeduction, 500, "joined on the 16th: 15 of 30 days unpaid");
      close(itemB.netSalary, 500, "joiner's first salary");
      close(run.totalNet, Number(itemA.netSalary) + 500, "run total");

      // Commission is paid with the salary, not again as an expense.
      const payout = await tx.commissionPayout.findUniqueOrThrow({ where: { payrollItemId: itemA.id } });
      close(payout.amount, 50, "payout recorded against the salary line");
      await assert.rejects(recordCommissionPayout(seller.id, "2199-09", actor.id), /already recorded|on payroll/);

      // Adjustments on the employee's page need a reason; recalculation keeps them.
      await assert.rejects(payroll.updatePayrollItem(itemA.id, { bonus: 100 }, actor.id), /Explain/);
      await payroll.updatePayrollItem(itemA.id, { bonus: 100, adjustmentNote: "Festival shoot" }, actor.id);
      await tx.attendanceEntry.update({ where: { employeeId_date: { employeeId: a.id, date: D(wd[0]) } }, data: { status: "present" } });
      run = await payroll.recalculatePayrollRun(run.id, actor.id);
      itemA = run.items.find((i) => i.employeeId === a.id);
      close(itemA.absenceDeduction, 1.5 * 3500 / 30, "attendance correction picked up");
      close(itemA.bonus, 100, "bonus kept");
      assert.equal(itemA.adjustmentNote, "Festival shoot");

      // Lateness deduction when the policy turns it on: 40 − 15 grace = 25 minutes.
      await settings.updateHrPolicy({ ...policy, deductLateness: true }, actor.id);
      run = await payroll.recalculatePayrollRun(run.id, actor.id);
      close(run.items.find((i) => i.employeeId === a.id).latenessDeduction, (25 / 60) * (3500 / 30 / 8), "late minutes past grace");
      await settings.updateHrPolicy({ ...policy, deductLateness: false }, actor.id);
      run = await payroll.recalculatePayrollRun(run.id, actor.id);

      // Approval, then individual payments.
      await payroll.submitPayrollRunForApproval(run.id, actor.id);
      await assert.rejects(payroll.recalculatePayrollRun(run.id, actor.id), /only be recalculated before/);
      assert.equal((await tx.payrollRun.findUniqueOrThrow({ where: { id: run.id } })).status, "approved");
      await assert.rejects(payroll.payPayrollItem(itemB.id, { method: "teleport" }, actor.id), /how the salary/);
      run = await payroll.payPayrollItem(itemB.id, { method: "bank_transfer", reference: "TRX-1" }, actor.id);
      assert.equal(run.status, "approved", "the run stays open until every salary is paid");
      assert.equal(run.items.find((i) => i.id === itemB.id).paymentStatus, "paid");
      assert.ok(await tx.payslip.findUnique({ where: { payrollItemId: itemB.id } }), "payslip issued");
      await assert.rejects(payroll.payPayrollItem(itemB.id, { method: "cash" }, actor.id), /already paid/);
      run = await payroll.markPayrollAsPaid(run.id, actor.id, { method: "wps" });
      assert.equal(run.status, "paid");
      const detail = await payroll.getPayrollItemDetail(itemA.id);
      assert.equal(detail.item.paymentMethod, "wps");
      assert.equal(detail.leaves.length, 2);
      assert.equal(detail.run.attendanceEnd, "2199-09-30");
      assert.ok(detail.commission && detail.commission.amount === 50);

      // Attendance inside a submitted payroll is locked; recent unlocked days work out lateness and overtime.
      await assert.rejects(attendance.saveAttendanceEntry({ employeeId: a.id, date: "2199-09-02", status: "absent" }, actor.id), /future|submitted payroll/);
      const lockedThrough = await attendance.attendanceLockedThrough();
      assert.equal(engine.dayKey(lockedThrough), "2199-09-30");

      // --- Pay on the 26th with a cut-off on the 25th: an absence on 28 November is deducted in December ---
      await settings.updateHrPolicy({ ...policy, salaryTiming: "current", payDay: 26, attendanceCutoffDay: null }, actor.id);
      const late = engine.eachDay(D("2199-11-26"), D("2199-11-30")).find((d) => engine.isWorkingDay(d, policy, holidays));
      await entry(engine.dayKey(late), { status: "absent" });
      const november = await payroll.createPayrollRun(11, 2199, actor.id);
      assert.deepEqual([november.attendanceStart.slice(0, 10), november.attendanceEnd.slice(0, 10), november.payDate.slice(0, 10)], ["2199-10-26", "2199-11-25", "2199-11-26"]);
      assert.equal(november.items.find((i) => i.employeeId === a.id).absenceDeduction, 0);
      const december = await payroll.createPayrollRun(12, 2199, actor.id);
      close(december.items.find((i) => i.employeeId === a.id).absenceDeduction, 3500 / 30, "carried into December");
      await settings.updateHrPolicy({ ...engine.DEFAULT_HR_POLICY }, actor.id);

      // --- Leave requests and balances ---
      const half = await createLeaveRequest({ employeeId: a.id, leaveTypeId: annual.id, startDate: D(wd[14]), endDate: D(wd[14]), dayPortion: "half_am", reason: "Appointment" });
      assert.equal(half.days, 0.5);
      const otherHalf = await createLeaveRequest({ employeeId: a.id, leaveTypeId: annual.id, startDate: D(wd[14]), endDate: D(wd[14]), dayPortion: "half_pm", reason: "Appointment" });
      assert.equal(otherHalf.days, 0.5, "morning and afternoon halves can both be taken");
      await assert.rejects(createLeaveRequest({ employeeId: a.id, leaveTypeId: annual.id, startDate: D(wd[15]), endDate: D(wd[15]), dayPortion: "hours", hours: 2, reason: "x" }), /by the hour/);
      const hourly = await createLeaveRequest({ employeeId: a.id, leaveTypeId: unpaid.id, startDate: D(wd[15]), endDate: D(wd[15]), dayPortion: "hours", hours: 3, reason: "Bank" });
      assert.equal(hourly.days, 0.38);
      await assert.rejects(createLeaveRequest({ employeeId: a.id, leaveTypeId: annual.id, startDate: D("2199-10-01"), endDate: D("2199-12-31"), reason: "Long trip" }), /Insufficient leave balance/);
      const newcomer = await createEmployee({ firstNameEn: "New", lastNameEn: "Joiner", firstNameAr: "جديد", lastNameAr: "منضم", jobTitleEn: "Runner", jobTitleAr: "مساعد", hireDate: D("2199-06-01"), basicSalary: 500, payrollSettings: statutory }, actor.id);
      await assert.rejects(createLeaveRequest({ employeeId: newcomer.id, leaveTypeId: hajj.id, startDate: D("2199-08-01"), endDate: D("2199-08-10"), reason: "Hajj" }), /Not yet eligible/);
      await assert.rejects(createLeaveRequest({ employeeId: a.id, leaveTypeId: annual.id, startDate: D(wd[16]), endDate: D(wd[17]), dayPortion: "half_am", reason: "x" }), /single day/);

      let annualBalance = await balances.getLeaveBalance(a.id, annual.id, 2199);
      assert.equal(annualBalance.entitled, 30, "full year earned by year end (2.5 a month)");
      assert.equal(annualBalance.carriedOver, 15, "unused 2198 days carried over up to the 15-day cap");
      assert.equal(annualBalance.pending, 1, "two pending half days");
      assert.equal(annualBalance.available, 44);
      await balances.addLeaveAdjustment({ employeeId: a.id, leaveTypeId: annual.id, year: 2199, days: 2, reason: "Worked public holiday" }, actor.id);
      annualBalance = await balances.getLeaveBalance(a.id, annual.id, 2199);
      assert.equal(annualBalance.available, 46);
      await assert.rejects(balances.addLeaveAdjustment({ employeeId: a.id, leaveTypeId: unpaid.id, year: 2199, days: 2, reason: "x" }, actor.id), /no balance/);
      const sickBalance = await balances.getLeaveBalance(a.id, sick.id, 2199);
      assert.deepEqual([sickBalance.used, sickBalance.available, sickBalance.hasPayBands], [17, 38, true]);
      assert.equal((await balances.getLeaveBalance(a.id, unpaid.id, 2199)).available, null, "unpaid leave has no balance");
      throw rollback;
    }), { timeout: 60000 });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log("Payroll database checks passed and rolled back: absence, half days and joiner proration; unpaid leave and sick-leave pay bands; overtime, shift allowance and commission in the salary; commission not paid twice; adjustments need a reason and survive recalculation; lateness policy; approval then per-employee payment and run completion; attendance lock; 26th pay day with cut-off carry-over; half-day, hourly and eligibility rules; balances with carry-over, pending and adjustments.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
