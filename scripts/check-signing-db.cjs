// Run: node scripts/check-signing-db.cjs  (local database only; everything is rolled back)
// Approval → sign & stamp → send for quotations, invoices and receipts.
require("dotenv").config({ quiet: true });
require("ts-node").register({ transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", moduleResolution: "Node", esModuleInterop: true, resolveJsonModule: true } });
const assert = require("node:assert/strict");
const { db } = require("../packages/database/src/db.ts");
const { transactionContext } = require("../packages/database/src/transaction-context.ts");
const { createQuotation, issueQuotation } = require("../packages/database/src/queries/quotations.ts");
const { createInvoice, updateInvoiceStatus } = require("../packages/database/src/queries/invoices.ts");
const { createPayment } = require("../packages/database/src/queries/payments.ts");
const signing = require("../packages/database/src/queries/document-signing.ts");

const rollback = new Error("ROLLBACK_SIGNING_TEST");

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(url.hostname), "Run only against a local test/development database");
  try {
    await db.$transaction((tx) => transactionContext.run(tx, async () => {
      const stamp = Date.now();
      const seller = await tx.user.create({ data: { email: `seller-${stamp}@sign.test`, fullName: "Signing Seller", passwordHash: "x", role: "sales", signatureUrl: "/api/files/brand/test-signature.png" } });
      const unsigned = await tx.user.create({ data: { email: `nosig-${stamp}@sign.test`, fullName: "No Signature", passwordHash: "x", role: "sales" } });
      const owner = await tx.user.findFirstOrThrow({ where: { role: "super_admin", isActive: true } });
      const contact = await tx.crmContact.create({ data: { firstName: "Sign", lastName: "Test" } });

      // Quotation: not signable until approved; cannot be issued unsigned; signature is snapshotted.
      const q = await createQuotation({ clientId: contact.id, validUntilDate: new Date(Date.now() + 7 * 86400000), lineItems: [{ descriptionEn: "Film", quantity: 1, unitPrice: 100 }] }, seller.id);
      await assert.rejects(signing.signDocument("quotation", q.id, seller.id), /must be approved/);
      await tx.quotation.update({ where: { id: q.id }, data: { status: "approved" } });
      await assert.rejects(issueQuotation(q.id, seller.id, "email"), /Sign and stamp/);
      await assert.rejects(signing.signDocument("quotation", q.id, unsigned.id), /Add your signature/);
      assert.equal(await signing.canSignDocument("quotation", q.id, unsigned, false), false, "a stranger without send rights cannot sign");
      assert.equal(await signing.canSignDocument("quotation", q.id, seller, false), true, "the issuer can sign");
      const state = await signing.signDocument("quotation", q.id, seller.id);
      assert.deepEqual([state.signed, state.signedBy.id, state.signatureUrl], [true, seller.id, "/api/files/brand/test-signature.png"]);
      await tx.user.update({ where: { id: seller.id }, data: { signatureUrl: "/api/files/brand/test-signature-2.png" } });
      assert.equal((await signing.getSigningState("quotation", q.id)).signatureUrl, "/api/files/brand/test-signature.png", "later signature changes do not alter signed documents");
      await issueQuotation(q.id, seller.id, "email");

      // Invoice: request approval (auto when the invoice policy is off), sign, then send.
      const issue = new Date().toISOString().slice(0, 10);
      const inv = await createInvoice({ contact_id: contact.id, issue_date: issue, due_date: issue, line_items: [{ description_en: "Edit", quantity: 1, unit_price: 50 }], created_by: seller.id });
      await assert.rejects(updateInvoiceStatus(inv.id, "sent"), /approved/);
      const policy = await tx.approvalPolicy.findUnique({ where: { targetType: "invoice" } });
      const outcome = await signing.requestInvoiceApproval(inv.id, seller.id);
      if (policy && policy.enabled) await require("../packages/database/src/services/approval-engine.ts").decideApprovalRequest(outcome.approvalRequestId, owner.id, "approved");
      assert.equal((await signing.getSigningState("invoice", inv.id)).approved, true);
      await assert.rejects(signing.requestInvoiceApproval(inv.id, seller.id), /already approved/);
      await signing.signDocument("invoice", inv.id, seller.id);
      await updateInvoiceStatus(inv.id, "sent");

      // Receipt: signed after it is recorded.
      const receipt = await createPayment({ invoice_id: inv.id, amount: 10 });
      assert.equal((await signing.getSigningState("receipt", receipt.id)).signed, false);
      await signing.signDocument("receipt", receipt.id, owner.id);
      assert.equal((await signing.getSigningState("receipt", receipt.id)).signedBy.id, owner.id);
      throw rollback;
    }), { timeout: 30000 });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log("Signing database checks passed and rolled back: approve before sign, sign before send, signer must have a signature, signature snapshot, invoice approval request, receipts.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
