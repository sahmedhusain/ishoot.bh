// Run: node scripts/check-signature-db.cjs  (local database only; everything is rolled back)
// Drawn signatures: PNG uploaded by the owner, one pending change at a time, applied only on approval, logged.
require("dotenv").config({ quiet: true });
require("ts-node").register({ transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", moduleResolution: "Node", esModuleInterop: true, resolveJsonModule: true } });
const assert = require("node:assert/strict");
const { db } = require("../packages/database/src/db.ts");
const { transactionContext } = require("../packages/database/src/transaction-context.ts");
const sig = require("../packages/database/src/queries/signature-changes.ts");
const { submitForApproval, decideApprovalRequest } = require("../packages/database/src/services/approval-engine.ts");

const rollback = new Error("ROLLBACK_SIGNATURE_TEST");

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(url.hostname), "Run only against a local test/development database");
  try {
    await db.$transaction((tx) => transactionContext.run(tx, async () => {
      const stamp = Date.now();
      const manager = await tx.user.create({ data: { email: `mgr-${stamp}@sig.test`, fullName: "Sig Manager", passwordHash: "x", role: "production_manager" } });
      const user = await tx.user.create({ data: { email: `usr-${stamp}@sig.test`, fullName: "Sig User", passwordHash: "x", role: "producer", managerId: manager.id, signatureUrl: "/api/files/general/old_sig.png" } });
      const upload = (name, owner = user.id, mimeType = "image/png") =>
        tx.uploadObject.create({ data: { fileUrl: `/api/files/general/${name}_${stamp}.png`, ownerId: owner, fileName: "signature.png", fileSize: 900, mimeType, expiresAt: new Date(Date.now() + 3600000) } });

      const jpeg = await upload("jpeg", user.id, "image/jpeg");
      await assert.rejects(sig.requestSignatureChange(user.id, jpeg.fileUrl), /Draw your signature/);
      const foreign = await upload("foreign", manager.id);
      await assert.rejects(sig.requestSignatureChange(user.id, foreign.fileUrl), /Draw your signature/);

      const drawn = await upload("drawn");
      const change = await sig.requestSignatureChange(user.id, drawn.fileUrl);
      assert.deepEqual([change.status, change.previousUrl], ["pending", "/api/files/general/old_sig.png"]);
      const second = await upload("second");
      await assert.rejects(sig.requestSignatureChange(user.id, second.fileUrl), /already have a signature change/);

      const approval = await submitForApproval({ targetType: "signature_change", targetId: change.id, requesterId: user.id });
      assert.deepEqual(approval.approverIds, [manager.id], "the user's manager approves first");
      assert.equal((await tx.user.findUniqueOrThrow({ where: { id: user.id } })).signatureUrl, "/api/files/general/old_sig.png", "not applied before approval");
      let step = await decideApprovalRequest(approval.approvalRequestId, manager.id, "approved", "Matches ID");
      while (step.status === "pending") step = await decideApprovalRequest(approval.approvalRequestId, step.approverIds[0], "approved");
      assert.equal((await tx.user.findUniqueOrThrow({ where: { id: user.id } })).signatureUrl, drawn.fileUrl, "applied once approved");

      // A rejected change leaves the signature alone; withdrawal closes the approval request.
      const next = await sig.requestSignatureChange(user.id, second.fileUrl);
      const nextApproval = await submitForApproval({ targetType: "signature_change", targetId: next.id, requesterId: user.id });
      await decideApprovalRequest(nextApproval.approvalRequestId, manager.id, "rejected", "Too faint");
      assert.equal((await tx.user.findUniqueOrThrow({ where: { id: user.id } })).signatureUrl, drawn.fileUrl);
      const third = await upload("third");
      const withdrawn = await sig.requestSignatureChange(user.id, third.fileUrl);
      const withdrawnApproval = await submitForApproval({ targetType: "signature_change", targetId: withdrawn.id, requesterId: user.id });
      await assert.rejects(sig.cancelSignatureChange(withdrawn.id, manager.id), /Only the owner/);
      await sig.cancelSignatureChange(withdrawn.id, user.id);
      assert.equal((await tx.approvalRequest.findUniqueOrThrow({ where: { id: withdrawnApproval.approvalRequestId } })).status, "cancelled");

      const log = await sig.listSignatureChanges(user.id);
      assert.deepEqual(log.map((c) => c.status), ["cancelled", "rejected", "approved"]);
      assert.equal(log[1].reviewNotes, "Too faint");
      throw rollback;
    }), { timeout: 30000 });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log("Signature database checks passed and rolled back: own PNG only, one pending change, manager approval applies it, rejection keeps the old one, withdrawal, full log.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
