// Run: node scripts/check-taxes-db.cjs  (local database only; everything is rolled back)
// Taxes besides VAT: the registry, totals with several taxes, the snapshot on quotations and invoices,
// quotation → invoice carrying the accepted taxes, drafts following the registry while issued invoices
// keep theirs, used taxes protected from deletion, and the certificate lookup behind the QR codes.
require("dotenv").config({ quiet: true });
require("ts-node").register({ transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", moduleResolution: "Node", esModuleInterop: true, resolveJsonModule: true } });
const assert = require("node:assert/strict");
const { db } = require("../packages/database/src/db.ts");
const { transactionContext } = require("../packages/database/src/transaction-context.ts");
const { calculateInvoiceTotals } = require("../packages/database/src/types.ts");
const taxes = require("../packages/database/src/queries/taxes.ts");
const quotations = require("../packages/database/src/queries/quotations.ts");
const invoices = require("../packages/database/src/queries/invoices.ts");

const rollback = new Error("ROLLBACK_TAXES_TEST");
const rejects = (promise, message) => assert.rejects(promise, (error) => error.message === message);

async function main() {
  // Pure arithmetic: each tax on the amount after discount, rounded per currency.
  const lines = [{ description_en: "Shoot", quantity: 2, unit_price: 500, line_total: 1000 }];
  const t = calculateInvoiceTotals(lines, "fixed", 100, true, 10, "BHD", [{ code: "a", rate: 5 }, { code: "b", rate: 2.5 }]);
  assert.deepEqual([t.afterDiscount, t.vatAmount, t.otherTaxAmount, t.totalAmount], [900, 90, 67.5, 1057.5]);
  assert.deepEqual(t.taxes, [{ code: "a", amount: 45 }, { code: "b", amount: 22.5 }]);
  assert.throws(() => calculateInvoiceTotals(lines, "none", 0, false, 0, "BHD", [{ code: "x", rate: 0 }]), /Invalid tax rate/);

  try {
    await db.$transaction((tx) => transactionContext.run(tx, async () => {
      const admin = await tx.user.findFirstOrThrow({ where: { role: "super_admin", isActive: true } });
      const client = await tx.crmContact.findFirstOrThrow();
      await tx.taxRate.updateMany({ data: { isActive: false } });
      const vat = await tx.companySetting.findFirstOrThrow({ select: { vatEnabled: true, vatPercentage: true } });
      const vatRate = vat.vatEnabled ? Number(vat.vatPercentage) : 0;

      // ---- registry validation
      await rejects(taxes.saveTaxRate({ name_en: "Levy", name_ar: "", rate: 5, applies_to_invoices: true, applies_to_quotations: true, is_active: true }), "Enter the tax name in English and Arabic");
      await rejects(taxes.saveTaxRate({ name_en: "VAT", name_ar: "ضريبة", rate: 5, applies_to_invoices: true, applies_to_quotations: true, is_active: true }), "VAT is set up in the VAT section above");
      await rejects(taxes.saveTaxRate({ name_en: "Levy", name_ar: "رسوم", rate: 0, applies_to_invoices: true, applies_to_quotations: true, is_active: true }), "Enter a tax rate between 0.01% and 100%");
      await rejects(taxes.saveTaxRate({ name_en: "Levy", name_ar: "رسوم", rate: 5, applies_to_invoices: false, applies_to_quotations: false, is_active: true }), "Choose where the tax applies: invoices, quotations or both");
      const levy = await taxes.saveTaxRate({ name_en: "Tourism Levy", name_ar: "رسوم السياحة", rate: 5, registration_number: "TL-001", certificate_url: "/api/files/certificates/test-levy.pdf", applies_to_invoices: true, applies_to_quotations: true, is_active: true });
      assert.equal(levy.code, "tourism-levy");
      const second = await taxes.saveTaxRate({ name_en: "Tourism levy", name_ar: "رسوم 2", rate: 1, applies_to_invoices: true, applies_to_quotations: false, is_active: true });
      assert.equal(second.code, "tourism-levy-2", "codes stay unique");

      // ---- quotation: both taxes? only the quotation one
      const q = await quotations.createQuotation({
        clientId: client.id, validUntilDate: new Date(Date.now() + 10 * 86400000), currency: "BHD", language: "en",
        discountType: "none", lineItems: [{ descriptionEn: "Film", quantity: 1, unitPrice: 1000 }],
      }, admin.id);
      assert.equal(q.otherTaxAmount, 50);
      assert.equal(q.taxes.length, 1);
      assert.equal(q.taxes[0].registration_number, "TL-001");
      assert.equal(Number(q.totalAmount), 1000 + 1000 * vatRate / 100 + 50);
      const updated = await quotations.updateQuotation(q.id, { lineItems: [{ descriptionEn: "Film", quantity: 2, unitPrice: 1000 }], discountType: "percentage", discountValue: 10 }, admin.id);
      assert.equal(updated.otherTaxAmount, 90, "recalculated on the amount after discount");
      assert.equal((await tx.documentTax.count({ where: { quotationId: q.id } })), 1);

      // ---- conversion keeps exactly what the client accepted, even if the registry changed since
      await tx.quotation.update({ where: { id: q.id }, data: { status: "accepted" } });
      await taxes.saveTaxRate({ id: levy.id, name_en: "Tourism Levy", name_ar: "رسوم السياحة", rate: 7, registration_number: "TL-001", certificate_url: "/api/files/certificates/test-levy.pdf", applies_to_invoices: true, applies_to_quotations: true, is_active: true });
      const converted = await quotations.convertQuotationToInvoice(q.id, admin.id);
      const fromQuote = await tx.invoice.findUniqueOrThrow({ where: { id: converted.invoiceId }, include: { taxes: true } });
      assert.equal(Number(fromQuote.otherTaxAmount), 90);
      assert.equal(Number(fromQuote.totalAmount), Number(updated.totalAmount));
      assert.deepEqual(fromQuote.taxes.map((x) => [x.code, Number(x.ratePercent), Number(x.amount)]), [["tourism-levy", 5, 90]]);

      // ---- invoice: drafts follow the registry (both invoice taxes), issued ones keep theirs
      const inv = await invoices.createInvoice({
        contact_id: client.id, issue_date: new Date().toISOString().slice(0, 10), due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        currency: "BHD", line_items: [{ description_en: "Edit", quantity: 1, unit_price: 200 }], created_by: admin.id,
      });
      assert.deepEqual(inv.other_taxes.map((x) => [x.code, x.rate, x.amount]), [["tourism-levy", 7, 14], ["tourism-levy-2", 1, 2]]);
      assert.equal(inv.other_tax_amount, 16);
      assert.equal(inv.total_amount, 200 + 200 * vatRate / 100 + 16);
      await taxes.saveTaxRate({ id: second.id, name_en: "Tourism levy", name_ar: "رسوم 2", rate: 1, applies_to_invoices: true, applies_to_quotations: false, is_active: false });
      const draftAgain = await invoices.updateInvoice(inv.id, { line_items: [{ description_en: "Edit", quantity: 1, unit_price: 300 }] });
      assert.deepEqual(draftAgain.other_taxes.map((x) => [x.code, x.amount]), [["tourism-levy", 21]], "a deactivated tax leaves drafts");
      await tx.invoice.update({ where: { id: inv.id }, data: { status: "sent" } });
      await taxes.saveTaxRate({ id: levy.id, name_en: "Tourism Levy", name_ar: "رسوم السياحة", rate: 9, registration_number: "TL-001", certificate_url: "/api/files/certificates/test-levy.pdf", applies_to_invoices: true, applies_to_quotations: true, is_active: true });
      const issuedAgain = await invoices.updateInvoice(inv.id, { notes_en: "Updated note" });
      assert.deepEqual(issuedAgain.other_taxes.map((x) => [x.code, x.rate, x.amount]), [["tourism-levy", 7, 21]], "issued invoices keep their frozen rate");

      // ---- deletion and certificates
      await rejects(taxes.deleteTaxRate(levy.id), "This tax is on existing documents. Deactivate it instead.");
      const unused = await taxes.saveTaxRate({ name_en: "Unused", name_ar: "غير مستخدمة", rate: 3, applies_to_invoices: true, applies_to_quotations: true, is_active: false });
      await taxes.deleteTaxRate(unused.id);
      assert.equal(await tx.taxRate.count({ where: { id: unused.id } }), 0);
      const cert = await taxes.getTaxCertificate("tourism-levy");
      assert.equal(cert.registrationNumber, "TL-001");
      assert.equal(cert.certificateUrl, "/api/files/certificates/test-levy.pdf");
      assert.equal(await taxes.getTaxCertificate("../etc"), null);
      assert.equal(await taxes.getTaxCertificate("no-such-tax"), null);

      throw rollback;
    }), { timeout: 60000 });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log("Tax checks passed and rolled back: totals with several taxes, registry validation, quotation and invoice snapshots, conversion keeps the accepted taxes, drafts follow the registry, issued invoices keep theirs, used taxes cannot be deleted, certificate lookup.");
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => db.$disconnect());
