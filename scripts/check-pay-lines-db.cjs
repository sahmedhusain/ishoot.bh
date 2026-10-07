// Run: node scripts/check-pay-lines-db.cjs  (local database only; everything is rolled back)
// Named payroll additions and deductions: recurring items flow into each run for their months only,
// manual lines survive recalculation, and totals stay the sum of the lines.
require("dotenv").config({ quiet: true });
require("ts-node").register({ transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", moduleResolution: "Node", esModuleInterop: true, resolveJsonModule: true } });
const assert = require("node:assert/strict");
const { db } = require("../packages/database/src/db.ts");
const { transactionContext } = require("../packages/database/src/transaction-context.ts");
const payroll = require("../packages/database/src/queries/payroll.ts");
const recurring = require("../packages/database/src/queries/recurring-pay.ts");

const rollback = new Error("ROLLBACK_PAY_LINES_TEST");
const rejects = (promise, message) => assert.rejects(promise, (error) => error.message === message);

async function main() {
  try {
    await db.$transaction((tx) => transactionContext.run(tx, async () => {
      const actor = await tx.user.findFirstOrThrow({ where: { role: "super_admin", isActive: true } });
      const year = 2198, month = 3, key = "2198-03";
      await tx.payrollRun.deleteMany({ where: { year } });
      const probe = await payroll.createPayrollRun(month, year, actor.id);
      const employeeId = probe.items[0].employeeId;
      await tx.payrollRun.delete({ where: { id: probe.id } });

      await rejects(recurring.saveRecurringPay(employeeId, { kind: "addition", category: "loan_repayment", label: "x", amount: 5, start_month: key, is_active: true }), "Choose a category for every line");
      await rejects(recurring.saveRecurringPay(employeeId, { kind: "addition", category: "allowance", label: "Phone", amount: 5, start_month: key, end_month: "2198-01", is_active: true }), "The last month cannot be before the first month");
      await recurring.saveRecurringPay(employeeId, { kind: "addition", category: "allowance", label: "Phone allowance", amount: 15, start_month: "2198-01", is_active: true });
      await recurring.saveRecurringPay(employeeId, { kind: "deduction", category: "loan_repayment", label: "Car loan", amount: 40, start_month: "2198-02", end_month: key, is_active: true });
      await recurring.saveRecurringPay(employeeId, { kind: "deduction", category: "penalty", label: "Ended", amount: 9, start_month: "2197-01", end_month: "2197-12", is_active: true });
      await recurring.saveRecurringPay(employeeId, { kind: "addition", category: "bonus", label: "Paused", amount: 9, start_month: "2198-01", is_active: false });

      let run = await payroll.createPayrollRun(month, year, actor.id);
      let item = run.items.find((i) => i.employeeId === employeeId);
      assert.equal(item.bonus, 15, "only the active, in-period addition");
      assert.equal(item.otherDeductions, 40, "only the in-period deduction");
      const lines = await tx.payrollItemLine.findMany({ where: { payrollItemId: item.id } });
      assert.deepEqual(lines.map((l) => [l.kind, l.label, l.source]).sort(), [["addition", "Phone allowance", "recurring"], ["deduction", "Car loan", "recurring"]]);

      // Manual lines join the recurring ones and survive a recalculation; the recurring ones are refreshed.
      await payroll.setPayrollItemLines(item.id, { additions: [{ category: "bonus", label: "Festival shoot", amount: 100 }], deductions: [{ category: "advance_recovery", label: "Advance", amount: 10 }] }, actor.id);
      await tx.employeeRecurringPay.updateMany({ where: { employeeId, label: "Phone allowance" }, data: { amount: 20 } });
      run = await payroll.recalculatePayrollRun(run.id, actor.id);
      item = run.items.find((i) => i.employeeId === employeeId);
      assert.equal(item.bonus, 120, "manual 100 + refreshed recurring 20");
      assert.equal(item.otherDeductions, 50, "manual 10 + recurring 40");
      assert.equal(await tx.payrollItemLine.count({ where: { payrollItemId: item.id } }), 4);
      const detail = await payroll.getPayrollItemDetail(item.id);
      assert.equal(detail.lines.length, 4);
      assert.equal(detail.item.lines, undefined, "raw rows do not leak into the item");

      throw rollback;
    }), { timeout: 120000 });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log("Pay line checks passed and rolled back: recurring additions and deductions by month, paused and ended items skipped, manual lines kept on recalculation, totals from lines.");
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => db.$disconnect());
