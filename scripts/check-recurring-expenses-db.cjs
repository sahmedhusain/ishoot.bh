// Run: node scripts/check-recurring-expenses-db.cjs  (local database only; everything is rolled back)
// Periodic bills: due-date arithmetic (month ends, quarters, weeks), recording with the actual amount and
// approval, skipping, automatic catch-up recording, one reminder per due date, end dates, deletion rules.
require("dotenv").config({ quiet: true });
require("ts-node").register({ transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", moduleResolution: "Node", esModuleInterop: true, resolveJsonModule: true } });
const assert = require("node:assert/strict");
const { db } = require("../packages/database/src/db.ts");
const { transactionContext } = require("../packages/database/src/transaction-context.ts");
const rx = require("../packages/database/src/queries/recurring-expenses.ts");

const rollback = new Error("ROLLBACK_RECURRING_EXPENSES_TEST");
const rejects = (promise, message) => assert.rejects(promise, (error) => error.message === message);
const d = (s) => new Date(`${s}T00:00:00Z`);
const iso = (x) => x.toISOString().slice(0, 10);
const today = () => new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);
const shift = (s, days) => iso(new Date(d(s).getTime() + days * 86400000));

async function main() {
  // Same day each month; the 31st falls on the month's last day and returns to the 31st afterwards.
  assert.equal(iso(rx.nextDueAfter(d("2026-01-31"), "monthly")), "2026-02-28");
  assert.equal(iso(rx.nextDueAfter(d("2026-02-28"), "monthly", 31)), "2026-03-31");
  assert.equal(iso(rx.nextDueAfter(d("2026-11-15"), "quarterly")), "2027-02-15");
  assert.equal(iso(rx.nextDueAfter(d("2026-10-01"), "weekly")), "2026-10-08");
  assert.equal(iso(rx.nextDueAfter(d("2024-02-29"), "yearly")), "2025-02-28");

  try {
    await db.$transaction((tx) => transactionContext.run(tx, async () => {
      const actor = await tx.user.findFirstOrThrow({ where: { role: "super_admin", isActive: true } });
      const rent = await tx.expenseCategory.findUniqueOrThrow({ where: { slug: "rent" } });
      const utilities = await tx.expenseCategory.findUniqueOrThrow({ where: { slug: "utilities" } });
      await tx.recurringExpense.deleteMany({});
      const base = { currency: "BHD", is_vat_recoverable: true, is_active: true, remind_days_before: 3 };

      await rejects(rx.saveRecurringExpense({ ...base, title_en: "", amount: 1, frequency: "monthly", start_date: today(), auto_record: false }, actor.id), "Enter the bill's name");
      await rejects(rx.saveRecurringExpense({ ...base, title_en: "X", amount: 1, frequency: "daily", start_date: today(), auto_record: false }, actor.id), "Choose how often the bill is due");
      await rejects(rx.saveRecurringExpense({ ...base, title_en: "X", amount: 10, input_vat_amount: 10, frequency: "monthly", start_date: today(), auto_record: false }, actor.id), "Input VAT must be less than the expense amount");
      await rejects(rx.saveRecurringExpense({ ...base, title_en: "X", amount: 10, frequency: "monthly", start_date: today(), end_date: shift(today(), -1), auto_record: false }, actor.id), "The end date cannot be before the start date");

      // ---- automatic rent, three months behind: the daily pass catches up, then stops at today
      const start = iso(new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 2, 1)));
      const auto = await rx.saveRecurringExpense({ ...base, title_en: "Office rent", category_id: rent.id, vendor_name: "Landlord", reference: "LEASE-7", amount: 900, frequency: "monthly", start_date: start, auto_record: true }, actor.id);
      // ---- manual electricity bill due in two days: reminded once
      const ewa = await rx.saveRecurringExpense({ ...base, title_en: "Electricity and water", title_ar: "الكهرباء والماء", category_id: utilities.id, amount: 120, frequency: "monthly", start_date: shift(today(), 2), auto_record: false }, actor.id);
      // ---- a yearly licence that already ended is never recorded
      const ended = await rx.saveRecurringExpense({ ...base, title_en: "Old licence", amount: 50, frequency: "yearly", start_date: shift(today(), -400), end_date: shift(today(), -300), auto_record: true }, actor.id);

      const first = await rx.processRecurringExpenses();
      assert.equal(first.recorded >= 3, true, "the missed months and this month are recorded");
      const rentExpenses = await tx.expense.findMany({ where: { recurringExpenseId: auto.id }, orderBy: { expenseDate: "asc" } });
      assert.equal(rentExpenses[0].expenseDate.toISOString().slice(0, 10), start);
      assert.ok(rentExpenses.every((e) => Number(e.amount) === 900 && e.isRecurring && e.recurrenceInterval === "monthly"));
      assert.ok(rentExpenses.every((e) => (e.notes ?? "").includes("LEASE-7")));
      const approvals = await tx.approvalRequest.count({ where: { targetType: "expense", targetId: { in: rentExpenses.map((e) => e.id) } } });
      assert.equal(approvals, rentExpenses.length, "every recorded bill goes through expense approval");
      const after = await tx.recurringExpense.findUniqueOrThrow({ where: { id: auto.id } });
      assert.ok(iso(after.nextDueDate) > today(), "schedule moved past today");
      assert.ok(first.reminded > 0, "finance reminded about the electricity bill");
      const endedRow = await tx.recurringExpense.findUniqueOrThrow({ where: { id: ended.id } });
      assert.equal(await tx.expense.count({ where: { recurringExpenseId: ended.id } }), 1, "only the due date inside the bill's period");
      assert.equal(endedRow.isActive, false, "a bill past its end date stops");

      const second = await rx.processRecurringExpenses();
      assert.equal(second.recorded, 0, "nothing recorded twice");
      assert.equal(second.reminded, 0, "one reminder per due date");

      // ---- recording the manual bill with the actual amount, then skipping the next one
      const recorded = await rx.recordRecurringExpense(ewa.id, actor.id, { amount: 134.25 });
      const expense = await tx.expense.findUniqueOrThrow({ where: { id: recorded.expenseId } });
      assert.equal(Number(expense.amount), 134.25);
      assert.equal(recorded.dueDate, shift(today(), 2));
      const skippedDate = await rx.skipRecurringExpense(ewa.id);
      assert.equal(skippedDate, iso(rx.nextDueAfter(d(shift(today(), 2)), "monthly")));
      const list = await rx.listRecurringExpenses();
      const row = list.find((r) => r.id === ewa.id);
      assert.equal(row.recorded_count, 1);
      assert.equal(row.monthly_equivalent, 120);

      await rejects(rx.deleteRecurringExpense(ewa.id), "Expenses were already recorded from this bill. Pause it instead.");
      const fresh = await rx.saveRecurringExpense({ ...base, title_en: "Fresh", amount: 12, frequency: "quarterly", start_date: shift(today(), 30), auto_record: false }, actor.id);
      assert.equal((await rx.listRecurringExpenses()).find((r) => r.id === fresh.id).monthly_equivalent, 4);
      await rx.deleteRecurringExpense(fresh.id);
      await tx.recurringExpense.update({ where: { id: ewa.id }, data: { isActive: false } });
      await rejects(rx.recordRecurringExpense(ewa.id, actor.id), "This recurring expense is paused");

      throw rollback;
    }), { timeout: 120000 });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log("Recurring expense checks passed and rolled back: due-date arithmetic, catch-up recording with approval, end dates, one reminder per due date, actual amounts, skipping, pause and deletion rules.");
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => db.$disconnect());
