// Run: node scripts/check-client-signatures-db.cjs  (local database only; everything is rolled back)
// Client acceptance: one-time signing links (hashed, expiring, single use), online signing accepts a quotation,
// signed copies uploaded by staff, one signature per document, and the acceptance shown on the PDF.
require("dotenv").config({ quiet: true });
require("ts-node").register({ transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", moduleResolution: "Node", esModuleInterop: true, resolveJsonModule: true } });
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { db } = require("../packages/database/src/db.ts");
const { transactionContext } = require("../packages/database/src/transaction-context.ts");
const cs = require("../packages/database/src/queries/client-signatures.ts");
const { fixtureUpload, removeFixtureUploads } = require("./lib/upload-fixtures.cjs");
const { lookupFile } = require("../packages/api-client/src/files.ts");
const { samplePdf } = require("../packages/database/src/services/sample-files.ts");

const rollback = new Error("ROLLBACK_CLIENT_SIGNATURE_TEST");
const consent = (language, number, type) => `consent:${language}:${type}:${number}`;
// A real signature-sized PNG (drawn strokes compress to a few hundred bytes).
const sharp = require(require.resolve("sharp", { paths: [path.resolve(__dirname, "../apps/admin")] }));

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(url.hostname), "Run only against a local test/development database");
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="160"><path d="M20 120 C 80 20, 140 160, 200 60 S 320 140, 380 40" stroke="#0B2E2B" stroke-width="4" fill="none"/></svg>');
  const signaturePng = `data:image/png;base64,${(await sharp(svg).png().toBuffer()).toString("base64")}`;
  try {
    await db.$transaction((tx) => transactionContext.run(tx, async () => {
      const staff = await tx.user.findFirstOrThrow({ where: { role: "admin", isActive: true } });
      const future = new Date(Date.now() + 20 * 86_400_000);

      // ---- Quotation signed online
      const quotation = await tx.quotation.findFirstOrThrow({ where: { lineItems: { some: {} } }, orderBy: { createdAt: "desc" } });
      await tx.clientSignature.deleteMany({ where: { documentId: quotation.id } });
      await tx.quotation.update({ where: { id: quotation.id }, data: { status: "draft" } });
      await assert.rejects(cs.createSigningLink("quotation", quotation.id, staff.id), /Only issued quotations/, "drafts cannot be sent for signature");
      await tx.quotation.update({ where: { id: quotation.id }, data: { status: "issued", validUntilDate: future } });
      await assert.rejects(cs.createSigningLink("quotation", quotation.id, staff.id, { days: 45 }), /1 to 30 days/);

      const first = await cs.createSigningLink("quotation", quotation.id, staff.id, { days: 7 });
      assert.notEqual(first.record.tokenHash, first.token, "the raw token is never stored");
      assert.equal(first.record.tokenHash.length, 64);
      const second = await cs.createSigningLink("quotation", quotation.id, staff.id, { days: 30 });
      assert.equal((await cs.getSigningSession(first.token, consent)).state, "revoked", "a new link replaces the old one");
      assert.ok(second.record.expiresAt <= new Date(`${future.toISOString().slice(0, 10)}T23:59:59.999Z`), "a link never outlives the quotation's UTC validity date");

      const open = await cs.getSigningSession(second.token, consent);
      assert.equal(open.state, "open");
      assert.match(open.terms, /consent:/, "terms include the e-signature consent");
      assert.ok((await tx.clientSignature.findUniqueOrThrow({ where: { id: second.record.id } })).viewedAt, "opening the link is recorded");
      assert.equal((await cs.getSigningSession("x".repeat(43), consent)).state, "invalid");

      await assert.rejects(cs.signWithToken(second.token, { signerName: "Client Person", signatureData: signaturePng, termsAccepted: false }, consent), /Accept the terms/);
      await assert.rejects(cs.signWithToken(second.token, { signerName: "Client Person", signatureData: "data:image/png;base64,AAAA", termsAccepted: true }, consent), /Draw your signature/);
      await assert.rejects(cs.signWithToken(second.token, { signerName: "C", signatureData: signaturePng, termsAccepted: true }, consent), /full name/);

      const signed = await cs.signWithToken(second.token, { signerName: "Client Person", signerTitle: "Procurement Manager", signatureData: signaturePng, termsAccepted: true, ip: "10.0.0.1", userAgent: "check" }, consent);
      assert.equal(signed.documentType, "quotation");
      const after = await tx.quotation.findUniqueOrThrow({ where: { id: quotation.id } });
      assert.equal(after.status, "accepted", "signing online accepts the quotation");
      assert.match(after.acceptanceEvidence, /Signed online by Client Person/);
      const record = await tx.clientSignature.findUniqueOrThrow({ where: { id: second.record.id } });
      assert.equal(record.status, "signed");
      assert.ok(record.documentHash && record.termsText && record.signedIp === "10.0.0.1");
      await assert.rejects(cs.signWithToken(second.token, { signerName: "Client Person", signatureData: signaturePng, termsAccepted: true }, consent), /no longer valid/, "a link signs once");
      assert.equal((await cs.getSigningSession(second.token, consent)).state, "signed");
      await assert.rejects(cs.createSigningLink("quotation", quotation.id, staff.id), /already signed/);

      const acceptance = await cs.getClientAcceptance("quotation", quotation.id);
      assert.deepEqual([acceptance.method, acceptance.signerName, acceptance.signerTitle], ["electronic", "Client Person", "Procurement Manager"]);
      assert.ok(acceptance.signatureData.startsWith("data:image/png;base64,"));
      assert.equal(cs.documentFingerprint(await cs.loadSignableDocument("quotation", quotation.id)), record.documentHash, "fingerprint matches the signed content");
      const history = await cs.listClientSignatures("quotation", quotation.id);
      assert.deepEqual(history.map((r) => r.status).sort(), ["revoked", "signed"]);
      assert.ok(history.every((r) => !("tokenHash" in r)), "history never exposes tokens");

      // ---- Expired link
      const invoice = await tx.invoice.findFirstOrThrow({ where: { lineItems: { some: {} } }, orderBy: { createdAt: "desc" } });
      await tx.clientSignature.deleteMany({ where: { documentId: invoice.id } });
      await tx.invoice.update({ where: { id: invoice.id }, data: { status: "sent" } });
      const stale = await cs.createSigningLink("invoice", invoice.id, staff.id, { days: 1 });
      await tx.clientSignature.update({ where: { id: stale.record.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
      assert.equal((await cs.getSigningSession(stale.token, consent)).state, "expired");
      assert.equal((await tx.clientSignature.findUniqueOrThrow({ where: { id: stale.record.id } })).status, "expired");
      await assert.rejects(cs.signWithToken(stale.token, { signerName: "Late Client", signatureData: signaturePng, termsAccepted: true }, consent), /no longer valid/);

      // ---- Revoked link
      const live = await cs.createSigningLink("invoice", invoice.id, staff.id, { days: 3 });
      await cs.revokeSigningLink(live.record.id, staff.id);
      assert.equal((await cs.getSigningSession(live.token, consent)).state, "revoked");
      await assert.rejects(cs.revokeSigningLink(live.record.id, staff.id), /unused link/);

      // ---- Signed copy uploaded by staff (invoice)
      const pdf = samplePdf("Signed copy");
      const { fileUrl } = await fixtureUpload(staff.id, { folder: "invoices", fileName: "signed.pdf", mimeType: "application/pdf", bytes: pdf });
      await assert.rejects(cs.recordSignedCopy("invoice", invoice.id, staff.id, { signerName: "", signedAt: "2026-10-01", fileUrl }), /name of the person/);
      await assert.rejects(cs.recordSignedCopy("invoice", invoice.id, staff.id, { signerName: "Client Signer", signedAt: "2099-01-01", fileUrl }), /date it was signed/);
      const copy = await cs.recordSignedCopy("invoice", invoice.id, staff.id, { signerName: "Client Signer", signedAt: "2026-10-01", fileUrl, fileName: "signed.pdf" });
      assert.equal(copy.status, "signed");
      assert.ok(await tx.attachment.findFirst({ where: { entityType: "invoice", entityId: invoice.id, fileUrl } }), "the signed copy is attached to the invoice");
      assert.ok((await lookupFile(fileUrl)).claimedAt, "the upload is claimed");
      assert.equal((await cs.getClientAcceptance("invoice", invoice.id)).method, "upload");
      await assert.rejects(cs.recordSignedCopy("invoice", invoice.id, staff.id, { signerName: "Again", signedAt: "2026-10-01", fileUrl }), /already signed/);

      throw rollback;
    }), { timeout: 60000 });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log("Client signature checks passed and rolled back: hashed one-time links, expiry and replacement, validity cap, online signing accepts the quotation, signed copies, one signature per document.");
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => {
    await removeFixtureUploads();
    await db.$disconnect();
  });
