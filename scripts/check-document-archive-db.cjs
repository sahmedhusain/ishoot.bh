// Run: node scripts/check-document-archive-db.cjs  (local database only; everything is rolled back)
// The company archive lists every file kept anywhere: attachments, company documents, permits, leave evidence,
// receipts, tax certificates and issued records, once each, only in the groups the viewer may see.
require("dotenv").config({ quiet: true });
require("ts-node").register({ transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", moduleResolution: "Node", esModuleInterop: true, resolveJsonModule: true } });
const assert = require("node:assert/strict");
const { db } = require("../packages/database/src/db.ts");
const { transactionContext } = require("../packages/database/src/transaction-context.ts");
const archive = require("../packages/database/src/queries/document-archive.ts");

const rollback = new Error("ROLLBACK_ARCHIVE_TEST");
const ALL = Object.keys(archive.ARCHIVE_KINDS);
const day = (offset) => new Date(Date.now() + offset * 86_400_000);

async function main() {
  try {
    await db.$transaction((tx) => transactionContext.run(tx, async () => {
      const tag = `arch${Date.now()}`;
      const admin = await tx.user.findFirstOrThrow({ where: { role: "super_admin", isActive: true } });
      const employee = await tx.employee.findFirstOrThrow({ where: { status: "active" } });
      const url = (name) => `/api/files/general/${tag}_${name}.pdf`;

      // A legal document expiring soon, an expired permit, leave evidence and an expense receipt kept on their records.
      await tx.companyDocument.create({ data: { titleEn: `${tag} Commercial registration`, titleAr: "السجل التجاري", category: "cr_license", documentNumber: `CR-${tag}`, fileUrl: url("cr"), validUntil: day(20), uploadedById: admin.id } });
      await tx.employeeCredential.create({ data: { employeeId: employee.id, kind: "visa", number: `V-${tag}`, expiryDate: day(-5), fileUrl: url("visa"), paidBy: "company" } });
      const leaveType = await tx.leaveType.findUniqueOrThrow({ where: { code: "annual" } });
      await tx.leaveRequest.create({ data: { employeeId: employee.id, leaveTypeId: leaveType.id, startDate: day(30), endDate: day(31), days: 2, reason: "Trip", status: "pending", attachmentUrl: url("ticket") } });
      const category = await tx.expenseCategory.findFirstOrThrow();
      const expense = await tx.expense.create({ data: { currency: "BHD", categoryId: category.id, descriptionEn: `${tag} taxi`, descriptionAr: "سيارة أجرة", amount: 5, expenseDate: new Date(), receiptUrl: url("taxi"), createdById: admin.id } });
      // The same receipt also uploaded as an attachment: listed once, as the attachment.
      await tx.attachment.create({ data: { fileName: `${tag}-taxi.pdf`, fileUrl: url("taxi"), entityType: "expense", entityId: expense.id, uploadedById: admin.id } });
      await tx.attachment.create({ data: { fileName: `${tag}-contract.pdf`, fileUrl: url("contract"), entityType: "employee", entityId: employee.id, uploadedById: admin.id } });
      await tx.attachment.create({ data: { fileName: `${tag}-banner.png`, fileUrl: url("banner"), entityType: "cms_asset", entityId: "banners", uploadedById: admin.id } });

      const all = await archive.getDocumentArchivePage({ q: tag }, ALL, 50);
      const kinds = all.items.map((d) => d.kind).sort();
      assert.deepEqual(kinds, ["company_document", "employee", "employee_credential", "expense", "leave_evidence"], "each file once, website media left out");
      const byKind = Object.fromEntries(all.items.map((d) => [d.kind, d]));
      assert.equal(byKind.expense.source, "attachment", "the attachment wins over the record's own field");
      assert.equal(byKind.employee.owner_link, `/dashboard/hr/employees/${employee.id}`);
      assert.equal(byKind.employee_credential.group, "hr");
      assert.equal(byKind.company_document.group, "legal");
      assert.equal(byKind.company_document.deletable, false, "only uploaded attachments can be removed here");
      assert.equal(byKind.employee.deletable, true);

      // Permissions: without HR access the employee files disappear.
      const noHr = ALL.filter((k) => archive.ARCHIVE_KINDS[k].group !== "hr");
      const limited = await archive.getDocumentArchivePage({ q: tag }, noHr, 50);
      assert.deepEqual(limited.items.map((d) => d.kind).sort(), ["company_document", "expense"]);
      assert.ok(!Object.keys(limited.counts.byKind).some((k) => archive.ARCHIVE_KINDS[k]?.group === "hr"), "counts follow the same access");

      // Filters and sorting.
      assert.deepEqual((await archive.getDocumentArchivePage({ q: tag, expiry: "expired" }, ALL)).items.map((d) => d.kind), ["employee_credential"]);
      assert.deepEqual((await archive.getDocumentArchivePage({ q: tag, expiry: "expiring" }, ALL)).items.map((d) => d.kind), ["company_document"]);
      assert.equal((await archive.getDocumentArchivePage({ q: tag, expiry: "none" }, ALL)).total, 3);
      assert.deepEqual((await archive.getDocumentArchivePage({ q: tag, group: "legal" }, ALL)).items.map((d) => d.kind), ["company_document"]);
      assert.deepEqual((await archive.getDocumentArchivePage({ q: tag, kind: "leave_evidence" }, ALL)).items.map((d) => d.kind), ["leave_evidence"]);
      const byExpiry = await archive.getDocumentArchivePage({ q: tag, sort: "expiry" }, ALL);
      assert.deepEqual(byExpiry.items.slice(0, 2).map((d) => d.kind), ["employee_credential", "company_document"], "soonest expiry first");
      assert.equal((await archive.getDocumentArchivePage({ q: tag, from: "2199-01-01" }, ALL)).total, 0);
      assert.equal((await archive.getDocumentArchivePage({ q: "سيارة" }, ALL)).items.some((d) => d.kind === "expense"), true, "Arabic names are searchable");
      assert.equal(archive.archiveParameters({ group: "nope", sort: "x; drop", expiry: "?" }).group, "all");

      // Export walks every match in stable batches.
      const first = await archive.getDocumentArchiveExportBatch({ q: tag }, ALL, "", 2);
      const second = await archive.getDocumentArchiveExportBatch({ q: tag }, ALL, first[1].id, 2);
      const third = await archive.getDocumentArchiveExportBatch({ q: tag }, ALL, second[second.length - 1].id, 2);
      assert.equal(new Set([...first, ...second, ...third].map((d) => d.id)).size, 5);
      throw rollback;
    }), { timeout: 60000 });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log("Archive checks passed and rolled back: every source listed once, website media left out, access by permission, expiry, group, type, date and search filters, expiry sort and batched export.");
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => db.$disconnect());
