// Run: node scripts/check-claims-db.cjs  (local database only; everything is rolled back)
// Staff expense claims: submit → manager → finance approval → schedule → pay, which books the expense.
require("dotenv").config({ quiet: true });
require("ts-node").register({ transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", moduleResolution: "Node", esModuleInterop: true, resolveJsonModule: true } });
const assert = require("node:assert/strict");
const { db } = require("../apps/admin/lib/database/db.ts");
const { transactionContext } = require("../apps/admin/lib/database/transaction-context.ts");
const claims = require("../apps/admin/lib/database/queries/expense-claims.ts");
const { serverMessages } = require("../apps/admin/locales/index.ts");
const { submitForApproval, decideApprovalRequest } = require("../apps/admin/lib/database/services/approval-engine.ts");

const { fixtureUpload, removeFixtureUploads } = require("./lib/upload-fixtures.cjs");
const { SAMPLE_RECEIPT_JPEG } = require("../apps/admin/lib/database/services/sample-files.ts");

const rollback = new Error("ROLLBACK_CLAIMS_TEST");

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(url.hostname), "Run only against a local test/development database");
  try {
    await db.$transaction((tx) => transactionContext.run(tx, async () => {
      assert.ok(await tx.approvalPolicy.findUnique({ where: { targetType: "expense_claim" } }), "Run migrations first: the claim policy is missing");
      const stamp = Date.now();
      const user = (role, extra = {}) =>
        tx.user.create({ data: { email: `${role}-${stamp}@claims.test`, fullName: `Claims ${role}`, passwordHash: "x", role, ...extra } });
      const manager = await user("operations_manager");
      const producer = await user("project_lead", { managerId: manager.id });
      const finance = await tx.user.findFirstOrThrow({ where: { role: "finance_manager", isActive: true } });
      const category = await tx.expenseCategory.findFirstOrThrow({ where: { slug: "fuel_transport" } });
      const deal = await tx.crmDeal.findFirstOrThrow({ where: { contactId: { not: null } } });
      // Receipts are verified against the stored bytes, so the test stores a real (sample) JPEG.
      const receipt = (name) =>
        fixtureUpload(producer.id, { fileName: `${name}.jpg`, mimeType: "image/jpeg", bytes: SAMPLE_RECEIPT_JPEG });
      const upload = await receipt("claim");

      await assert.rejects(claims.createExpenseClaim({ amount: 5, expenseDate: "2026-01-01", reason: "x", receiptUrl: "" }, producer.id), /receipt/);
      await assert.rejects(claims.createExpenseClaim({ amount: 5, currency: "JPY", expenseDate: "2026-01-01", reason: "x", receiptUrl: upload.fileUrl }, producer.id), { message: serverMessages.companyCurrencyRequired });

      const claim = await claims.createExpenseClaim(
        { amount: 12.5, expenseDate: "2026-09-20", reason: "Taxi to the client shoot", categoryId: category.id, dealId: deal.id, receiptUrl: upload.fileUrl },
        producer.id,
      );
      assert.match(claim.claimNumber, /^CLM-2026-\d{6}$/);
      assert.equal(claim.status, "submitted");

      const approval = await submitForApproval({ targetType: "expense_claim", targetId: claim.id, requesterId: producer.id });
      assert.deepEqual(approval.approverIds, [manager.id], "the claimant's manager decides first");
      await assert.rejects(claims.payExpenseClaim(claim.id, finance.id, { method: "bank_transfer" }), /Only approved claims/);
      await assert.rejects(claims.cancelExpenseClaim(claim.id, manager.id), /Only the claimant/);
      let step = await decideApprovalRequest(approval.approvalRequestId, manager.id, "approved");
      while (step.status === "pending") step = await decideApprovalRequest(approval.approvalRequestId, step.approverIds[0], "approved");
      assert.equal((await claims.getExpenseClaim(claim.id)).status, "approved");

      const scheduled = await claims.scheduleExpenseClaim(claim.id, finance.id, "2026-10-01");
      assert.deepEqual([scheduled.status, scheduled.scheduledForDate], ["scheduled", "2026-10-01"]);
      await assert.rejects(claims.payExpenseClaim(claim.id, finance.id, { method: "crypto" }), /how the claim was paid/);

      const paid = await claims.payExpenseClaim(claim.id, finance.id, { method: "bank_transfer", reference: "TRF-881" });
      assert.equal(paid.status, "paid");
      const expense = await tx.expense.findUniqueOrThrow({ where: { id: paid.expenseId } });
      assert.equal(Number(expense.amount), 12.5);
      assert.deepEqual([expense.scope, expense.dealId, expense.clientId, expense.status, expense.paymentMethod], ["deal", deal.id, deal.contactId, "approved", "staff_reimbursement"]);
      await assert.rejects(claims.payExpenseClaim(claim.id, finance.id, { method: "cash" }), /Only approved claims/, "a claim is paid once");

      // A claim can be withdrawn while it awaits approval, which closes its approval request.
      const upload2 = await receipt("claim2");
      const second = await claims.createExpenseClaim({ amount: 3, expenseDate: "2026-09-21", reason: "Parking", receiptUrl: upload2.fileUrl }, producer.id);
      const secondApproval = await submitForApproval({ targetType: "expense_claim", targetId: second.id, requesterId: producer.id });
      assert.equal((await claims.cancelExpenseClaim(second.id, producer.id)).status, "cancelled");
      assert.equal((await tx.approvalRequest.findUniqueOrThrow({ where: { id: secondApproval.approvalRequestId } })).status, "cancelled");

      const mine = await claims.listExpenseClaims({ claimantId: producer.id });
      assert.equal(mine.items.length, 2);
      assert.equal(mine.stats.paidThisMonth >= 0, true);
      throw rollback;
    }), { timeout: 30000 });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log("Expense claim database checks passed and rolled back: receipt and currency rules, manager-first approval, schedule, single payment booking a deal expense, withdrawal.");
}
main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => {
    // The database rows were rolled back; remove the sample files written for them too.
    await removeFixtureUploads();
    await db.$disconnect();
  });
