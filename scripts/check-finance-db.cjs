// Run: node scripts/check-finance-db.cjs  (local database only; everything is rolled back)
// Finance flows against the real schema: numbering, quotation → invoice, payments, expenses, reports, overdue.
require("dotenv").config({ quiet: true });
require("ts-node").register({ transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", moduleResolution: "Node", esModuleInterop: true, resolveJsonModule: true } });
const assert = require("node:assert/strict");
const { db } = require("../packages/database/src/db.ts");
const { transactionContext } = require("../packages/database/src/transaction-context.ts");
const { createInvoice, updateInvoiceStatus, markOverdueInvoices } = require("../packages/database/src/queries/invoices.ts");
const { createPayment } = require("../packages/database/src/queries/payments.ts");
const { createQuotation, convertQuotationToInvoice } = require("../packages/database/src/queries/quotations.ts");
const { createExpense } = require("../packages/database/src/queries/expenses.ts");
const { signDocument, requestInvoiceApproval } = require("../packages/database/src/queries/document-signing.ts");
const { getFinancialSummaryReport, getFinancialReportDetail } = require("../packages/database/src/queries/finance-reports.ts");

const rollback = new Error("ROLLBACK_FINANCE_TEST");
const line = (unit_price, quantity = 1) => ({ description_en: "Shoot day", quantity, unit_price });

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(url.hostname), "Run only against a local test/development database");
  try {
    await db.$transaction((tx) => transactionContext.run(tx, async () => {
      const actor = await tx.user.findFirstOrThrow({ where: { role: "super_admin", isActive: true }, select: { id: true } });
      const contact = await tx.crmContact.create({ data: { firstName: "Finance", lastName: "Test", vatNumber: "VAT-123" } });
      const company = await tx.companySetting.findFirstOrThrow();
      const issue = new Date().toISOString().slice(0, 10);

      // 1. Manual invoices and quotation conversions share one counter and format.
      const first = await createInvoice({ contact_id: contact.id, issue_date: issue, due_date: issue, line_items: [line(0.8)] });
      const quotation = await createQuotation({ clientId: contact.id, validUntilDate: new Date(Date.now() + 7 * 86400000), lineItems: [{ descriptionEn: "Edit", quantity: 1, unitPrice: 100 }] }, actor.id);
      await tx.quotation.update({ where: { id: quotation.id }, data: { status: "accepted" } });
      const converted = await convertQuotationToInvoice(quotation.id, actor.id);
      const seq = (n) => Number(n.split("-").pop());
      assert.equal(seq(converted.invoiceNumber), seq(first.invoice_number) + 1, "conversion takes the next number from the same counter");
      assert.ok(converted.invoiceNumber.startsWith(`${company.invoicePrefix}-`), "conversion uses the configured prefix");
      const again = await convertQuotationToInvoice(quotation.id, actor.id);
      assert.equal(again.isExisting, true);

      // 2. Importing an accepted quotation into a new invoice marks it converted; a second import is refused.
      const q2 = await createQuotation({ clientId: contact.id, validUntilDate: new Date(Date.now() + 7 * 86400000), lineItems: [{ descriptionEn: "Grade", quantity: 1, unitPrice: 50 }] }, actor.id);
      await tx.quotation.update({ where: { id: q2.id }, data: { status: "accepted" } });
      await createInvoice({ contact_id: contact.id, quotation_id: q2.id, issue_date: issue, due_date: issue, line_items: [line(50)] });
      assert.equal((await tx.quotation.findUniqueOrThrow({ where: { id: q2.id } })).status, "converted");
      await assert.rejects(createInvoice({ contact_id: contact.id, quotation_id: q2.id, issue_date: issue, due_date: issue, line_items: [line(50)] }), /already been invoiced/);
      await assert.rejects(createInvoice({ contact_id: contact.id, issue_date: issue, due_date: "2000-01-01", line_items: [line(1)] }), /due date/);

      // 3. Drafts take no payments; 0.7 + 0.1 settles 0.8 exactly.
      await assert.rejects(createPayment({ invoice_id: first.id, amount: 0.7 }), /Mark the invoice as sent/);
      await assert.rejects(updateInvoiceStatus(first.id, "sent"), /approved/, "an unapproved invoice cannot be sent");
      await assert.rejects(signDocument("invoice", first.id, actor.id), /must be approved before/);
      await requestInvoiceApproval(first.id, actor.id);
      await assert.rejects(updateInvoiceStatus(first.id, "sent"), /Sign and stamp/, "approved but unsigned cannot be sent");
      await signDocument("invoice", first.id, actor.id);
      await assert.rejects(signDocument("invoice", first.id, actor.id), /already signed/);
      await updateInvoiceStatus(first.id, "sent");
      await createPayment({ invoice_id: first.id, amount: 0.7 });
      assert.equal((await tx.invoice.findUniqueOrThrow({ where: { id: first.id } })).status, "partially_paid");
      await createPayment({ invoice_id: first.id, amount: 0.1 });
      assert.equal((await tx.invoice.findUniqueOrThrow({ where: { id: first.id } })).status, "paid");
      await assert.rejects(updateInvoiceStatus(first.id, "draft"), /cannot move/);

      // 4. Overdue sweep moves issued, unpaid invoices past their due date.
      const late = await createInvoice({ contact_id: contact.id, issue_date: "2020-01-01", due_date: "2020-01-31", line_items: [line(10)] });
      await requestInvoiceApproval(late.id, actor.id);
      await signDocument("invoice", late.id, actor.id);
      await updateInvoiceStatus(late.id, "sent");
      assert.ok((await markOverdueInvoices()) >= 1);
      assert.equal((await tx.invoice.findUniqueOrThrow({ where: { id: late.id } })).status, "overdue");

      // 5. Approved expenses count at their net amount in the report.
      const before = await getFinancialSummaryReport({ basis: "accrual" });
      const expense = await createExpense({ description_en: "Lens rental", amount: 110, input_vat_amount: 10, currency: "BHD" }, actor.id);
      assert.equal(Number((await tx.expense.findUniqueOrThrow({ where: { id: expense.id } })).netAmount), 100);
      await tx.expense.update({ where: { id: expense.id }, data: { status: "approved" } });
      const after = await getFinancialSummaryReport({ basis: "accrual" });
      assert.equal(Math.round((after.expensesNet - before.expensesNet) * 1000) / 1000, 100, "net expense, not zero and not VAT-inclusive");
      // Discounts within the issuer's limit are approved on submit; above it a reason is required and it waits.
      const { submitQuotationForApproval } = require("../packages/database/src/queries/quotations.ts");
      await tx.companySetting.updateMany({ data: { defaultDiscountLimitPercent: 5, quotationsAlwaysNeedApproval: false } });
      const seller = await tx.user.create({ data: { email: `seller-${Date.now()}@finance.test`, fullName: "Seller", passwordHash: "x", role: "sales" } });
      const small = await createQuotation({ clientId: contact.id, validUntilDate: new Date(Date.now() + 7 * 86400000), discountType: "percentage", discountValue: 4, lineItems: [{ descriptionEn: "Shoot", quantity: 1, unitPrice: 200 }] }, seller.id);
      await submitQuotationForApproval(small.id, seller.id);
      assert.equal((await tx.quotation.findUniqueOrThrow({ where: { id: small.id } })).status, "approved", "a 4% discount within the 5% default is approved on submit");
      const big = await createQuotation({ clientId: contact.id, validUntilDate: new Date(Date.now() + 7 * 86400000), discountType: "percentage", discountValue: 12, lineItems: [{ descriptionEn: "Shoot", quantity: 1, unitPrice: 200 }] }, seller.id);
      await assert.rejects(submitQuotationForApproval(big.id, seller.id), /above your 5% limit/);
      await submitQuotationForApproval(big.id, seller.id, "Long-term client, volume deal");
      assert.equal((await tx.quotation.findUniqueOrThrow({ where: { id: big.id } })).status, "submitted", "a 12% discount waits for approval");
      await tx.user.update({ where: { id: seller.id }, data: { discountLimitPercent: 15 } });
      const personal = await createQuotation({ clientId: contact.id, validUntilDate: new Date(Date.now() + 7 * 86400000), discountType: "percentage", discountValue: 12, lineItems: [{ descriptionEn: "Shoot", quantity: 1, unitPrice: 200 }] }, seller.id);
      await submitQuotationForApproval(personal.id, seller.id);
      assert.equal((await tx.quotation.findUniqueOrThrow({ where: { id: personal.id } })).status, "approved", "a personal 15% limit overrides the company default");

      // The detailed report reconciles with the summary on both bases.
      for (const basis of ["accrual", "cash"]) {
        const [summary, detail] = await Promise.all([getFinancialSummaryReport({ basis }), getFinancialReportDetail({ basis })]);
        const revenue = detail.monthly.reduce((sum, m) => sum + m.revenueNet, 0);
        assert.ok(Math.abs(revenue - (basis === "cash" ? summary.cashNetReceipts : summary.invoicedNet)) < 0.05, `${basis} monthly revenue matches the summary`);
        const costs = detail.expensesByKind.cost_of_sales + detail.expensesByKind.operating + detail.expensesByKind.payroll;
        assert.ok(Math.abs(costs - (summary.expensesNet + summary.inputVatNonRecoverable)) < 0.05, "category costs match net expenses plus non-recoverable VAT");
        const bhd = detail.invoiceTotals.find((t) => t.currency === "BHD");
        if (bhd) assert.ok(Math.abs(bhd.withVat.gross + bhd.withoutVat.gross - summary.invoicedGross) < 0.05, "invoice register splits BHD sales into with/without VAT");
        assert.ok(Math.abs(detail.vat.netPayable - (detail.vat.output - detail.vat.inputRecoverable)) < 0.001);
      }
      throw rollback;
    }), { timeout: 30000 });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log("Finance database checks passed and rolled back: one invoice counter for manual and converted invoices, quotation double-billing blocked, due-date validation, draft payments blocked, minor-unit settlement, status transitions, overdue sweep, net expenses in reports, detailed report reconciles with the summary, per-user discount limits, approve → sign → send.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
