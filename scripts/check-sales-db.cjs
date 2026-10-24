// Run: node scripts/check-sales-db.cjs  (local database only; everything is rolled back)
// Sales credit: issuer vs credited salesperson, credit flows from quotation to invoice, reassignment history, commissions.
require("dotenv").config({ quiet: true });
require("ts-node").register({ transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", moduleResolution: "Node", esModuleInterop: true, resolveJsonModule: true } });
const assert = require("node:assert/strict");
const { db } = require("../packages/database/src/db.ts");
const { transactionContext } = require("../packages/database/src/transaction-context.ts");
const { createQuotation, convertQuotationToInvoice } = require("../packages/database/src/queries/quotations.ts");
const { updateInvoiceStatus } = require("../packages/database/src/queries/invoices.ts");
const { createPayment } = require("../packages/database/src/queries/payments.ts");
const sales = require("../packages/database/src/queries/sales-attribution.ts");

const rollback = new Error("ROLLBACK_SALES_TEST");

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(url.hostname), "Run only against a local test/development database");
  try {
    await db.$transaction((tx) => transactionContext.run(tx, async () => {
      const stamp = Date.now();
      const user = (role, extra = {}) => tx.user.create({ data: { email: `${role}-${stamp}@sales.test`, fullName: `Sales ${role}`, passwordHash: "x", role, ...extra } });
      const issuer = await user("admin", { signatureUrl: "/api/files/brand/test-signature.png" });
      const closer = await user("sales", { commissionRatePercent: 5 });
      const other = await tx.user.create({ data: { email: `other-${stamp}@sales.test`, fullName: "Other seller", passwordHash: "x", role: "sales", commissionRatePercent: 4 } });
      const finance = await tx.user.findFirstOrThrow({ where: { role: "finance_manager", isActive: true } });
      const contact = await tx.crmContact.create({ data: { firstName: "Sales", lastName: "Test" } });

      // Defaults to the issuer; can be credited to the salesperson who brought the lead.
      const own = await createQuotation({ clientId: contact.id, validUntilDate: new Date(Date.now() + 7 * 86400000), lineItems: [{ descriptionEn: "Film", quantity: 1, unitPrice: 100 }] }, issuer.id);
      assert.equal((await tx.quotation.findUniqueOrThrow({ where: { id: own.id } })).salesOwnerId, issuer.id);
      const quote = await createQuotation({ clientId: contact.id, salesOwnerId: closer.id, validUntilDate: new Date(Date.now() + 7 * 86400000), lineItems: [{ descriptionEn: "Film", quantity: 1, unitPrice: 1000 }] }, issuer.id);
      await assert.rejects(createQuotation({ clientId: contact.id, salesOwnerId: "nobody", validUntilDate: new Date(), lineItems: [{ descriptionEn: "x", quantity: 1, unitPrice: 1 }] }, issuer.id), /active team member/);

      // The invoice keeps the quotation's credit.
      await tx.quotation.update({ where: { id: quote.id }, data: { status: "accepted" } });
      const converted = await convertQuotationToInvoice(quote.id, issuer.id);
      const invoiceId = converted.invoiceId;
      assert.equal((await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } })).salesOwnerId, closer.id);
      const info = await sales.getAttribution("invoice", invoiceId);
      assert.deepEqual([info.issuedBy.id, info.salesOwner.id, info.history.length], [issuer.id, closer.id, 0]);

      // Reassignment is recorded with who, from, to and why; reassigning to the same person is a no-op.
      assert.equal((await sales.reassignSalesOwner("invoice", invoiceId, other.id, issuer.id, "Account handover")).changed, true);
      assert.equal((await sales.reassignSalesOwner("invoice", invoiceId, other.id, issuer.id)).changed, false);
      const history = (await sales.getAttribution("invoice", invoiceId)).history;
      assert.deepEqual([history.length, history[0].from, history[0].to, history[0].reason], [1, "Sales sales", "Other seller", "Account handover"]);
      await sales.reassignSalesOwner("invoice", invoiceId, closer.id, issuer.id, "Corrected");

      // Commission: collected net (VAT excluded) × rate, recorded once as an expense.
      const { signDocument, requestInvoiceApproval } = require("../packages/database/src/queries/document-signing.ts");
      await requestInvoiceApproval(invoiceId, issuer.id);
      await signDocument("invoice", invoiceId, issuer.id);
      await updateInvoiceStatus(invoiceId, "sent");
      const inv = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
      const paidOn = new Date(Date.UTC(2199, 2, 10));
      await createPayment({ invoice_id: invoiceId, amount: Number(inv.totalAmount), payment_date: paidOn.toISOString().slice(0, 10), payment_method: "bank_transfer" }, finance.id);
      const net = Number(inv.subtotal) - Number(inv.discountAmount);
      const row = (await sales.getCommissionStatement("2199-03")).find((r) => r.userId === closer.id);
      assert.ok(row, "the credited salesperson appears in the statement");
      assert.ok(Math.abs(row.collectedNet - net) < 0.01, "commission basis is net of VAT");
      assert.equal(row.commission, Math.round(net * 5 * 10) / 1000);
      const payout = await sales.recordCommissionPayout(closer.id, "2199-03", finance.id);
      const expense = await tx.expense.findUniqueOrThrow({ where: { id: payout.expenseId }, include: { category: true } });
      assert.deepEqual([Number(expense.amount), expense.status, expense.category?.slug], [row.commission, "approved", "commissions"]);
      await assert.rejects(sales.recordCommissionPayout(closer.id, "2199-03", finance.id), /already recorded/);
      assert.equal((await sales.getCommissionStatement("2199-03")).find((r) => r.userId === other.id)?.commission ?? 0, 0, "the previous owner earns nothing");
      // Invoicing an accepted quotation directly keeps its credit; crediting someone else is recorded as a reassignment.
      const { createInvoice } = require("../packages/database/src/queries/invoices.ts");
      const accepted = async () => {
        const q = await createQuotation({ clientId: contact.id, salesOwnerId: closer.id, validUntilDate: new Date(Date.now() + 7 * 86400000), lineItems: [{ descriptionEn: "Edit", quantity: 1, unitPrice: 200 }] }, issuer.id);
        await tx.quotation.update({ where: { id: q.id }, data: { status: "accepted" } });
        return q.id;
      };
      const invoiceInput = (quotationId, extra = {}) => ({ contact_id: contact.id, quotation_id: quotationId, issue_date: "2199-04-01", due_date: "2199-04-15", line_items: [{ description_en: "Edit", quantity: 1, unit_price: 200 }], created_by: issuer.id, ...extra });
      const kept = await createInvoice(invoiceInput(await accepted()));
      assert.equal((await tx.invoice.findUniqueOrThrow({ where: { id: kept.id } })).salesOwnerId, closer.id, "invoice keeps the quotation's salesperson");
      assert.equal(await tx.salesAttributionChange.count({ where: { entityType: "invoice", entityId: kept.id } }), 0);
      const moved = await createInvoice(invoiceInput(await accepted(), { sales_owner_id: other.id }));
      const change = await tx.salesAttributionChange.findFirstOrThrow({ where: { entityType: "invoice", entityId: moved.id } });
      assert.deepEqual([change.fromUserId, change.toUserId, change.changedById], [closer.id, other.id, issuer.id], "a different credit is recorded as a reassignment");
      throw rollback;
    }), { timeout: 30000 });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log("Sales database checks passed and rolled back: issuer default and chosen credit, credit kept on conversion, reassignment history, net-of-VAT commission recorded once.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
