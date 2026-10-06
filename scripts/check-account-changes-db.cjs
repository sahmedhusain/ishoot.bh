// Run: node scripts/check-account-changes-db.cjs  (local database only; everything is rolled back)
// Account settings: Super Admin accounts are protected; admins apply changes directly; HR's changes wait for an
// admin's approval and apply only when approved.
require("dotenv").config({ quiet: true });
require("ts-node").register({ transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", moduleResolution: "Node", esModuleInterop: true, resolveJsonModule: true } });
const assert = require("node:assert/strict");
const { db } = require("../packages/database/src/db.ts");
const { transactionContext } = require("../packages/database/src/transaction-context.ts");
const acc = require("../packages/database/src/queries/account-changes.ts");
const { submitForApproval, decideApprovalRequest } = require("../packages/database/src/services/approval-engine.ts");

const rollback = new Error("ROLLBACK_ACCOUNT_TEST");

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(url.hostname), "Run only against a local test/development database");
  try {
    await db.$transaction((tx) => transactionContext.run(tx, async () => {
      const stamp = Date.now();
      const user = (role, extra = {}) => tx.user.create({ data: { email: `${role}-${stamp}-${Math.random().toString(36).slice(2, 6)}@acc.test`, fullName: `Acc ${role}`, passwordHash: "x", role, ...extra } });
      const superAdmin = await tx.user.findFirstOrThrow({ where: { role: "super_admin", isActive: true } });
      const admin = await user("admin");
      const hr = await user("finance_manager");
      const seller = await user("sales", { managerId: admin.id });
      await tx.session.create({ data: { userId: seller.id, token: `t-${stamp}`, expiresAt: new Date(Date.now() + 3600000) } });
      assert.equal(await tx.session.count({ where: { userId: seller.id } }), 1);

      // Super Admin accounts cannot be changed by anyone, the Super Admin included.
      await assert.rejects(acc.applyAccountChanges(superAdmin.id, { commissionRatePercent: 5 }, superAdmin.id), /protected/);
      await assert.rejects(acc.createAccountChangeRequest(superAdmin.id, { role: "viewer" }, hr.id), /protected/);

      // Validation: nothing-changed, bounds, self-reporting, loops, own role, Super Admin grants.
      await assert.rejects(acc.applyAccountChanges(seller.id, { role: "sales" }, admin.id), /Nothing changed/);
      await assert.rejects(acc.applyAccountChanges(seller.id, { commissionRatePercent: 120 }, admin.id), /between 0 and 100/);
      await assert.rejects(acc.applyAccountChanges(seller.id, { managerId: seller.id }, admin.id), /themselves/);
      await assert.rejects(acc.applyAccountChanges(admin.id, { managerId: seller.id }, superAdmin.id), /loop/);
      await assert.rejects(acc.applyAccountChanges(admin.id, { role: "viewer" }, admin.id), /your own role/);
      await assert.rejects(acc.applyAccountChanges(seller.id, { role: "super_admin" }, admin.id), /Only a Super Admin/);
      await assert.rejects(acc.applyAccountChanges(seller.id, { status: "suspended" }, admin.id), /reason/);
      await assert.rejects(acc.createAccountChangeRequest(seller.id, { role: "super_admin" }, hr.id), /Only a Super Admin/);

      // Admin applies directly: role change ends the person's sessions; commission and discount saved; history logged.
      const applied = await acc.applyAccountChanges(seller.id, { role: "marketing", commissionRatePercent: 5, discountLimitPercent: 7.5 }, admin.id);
      assert.deepEqual(applied.before, { role: "sales", discountLimitPercent: null, commissionRatePercent: null });
      const after = await acc.accountSnapshot(seller.id);
      assert.deepEqual([after.role, after.commissionRatePercent, after.discountLimitPercent], ["marketing", 5, 7.5]);
      assert.equal(await tx.session.count({ where: { userId: seller.id } }), 0, "sessions end when the role changes");
      assert.ok(await tx.activityLog.findFirst({ where: { entityType: "user", entityId: seller.id, userId: admin.id } }));

      // HR files a change: nothing changes until an admin approves it.
      const request = await acc.createAccountChangeRequest(seller.id, { commissionRatePercent: 6, status: "suspended", statusReason: "Extended absence" }, hr.id, "Commission review");
      await assert.rejects(acc.createAccountChangeRequest(seller.id, { commissionRatePercent: 7 }, hr.id), /already has a change waiting/);
      const approval = await submitForApproval({ targetType: "account_change", targetId: request.id, requesterId: hr.id });
      assert.equal(approval.status, "pending");
      assert.ok(approval.approverIds.includes(admin.id) && !approval.approverIds.includes(hr.id), "an admin approves, never the requester");
      assert.equal((await acc.accountSnapshot(seller.id)).commissionRatePercent, 5, "not applied while pending");
      await decideApprovalRequest(approval.approvalRequestId, admin.id, "approved");
      const approved = await acc.accountSnapshot(seller.id);
      assert.deepEqual([approved.commissionRatePercent, approved.status], [6, "suspended"]);
      assert.equal((await tx.accountChangeRequest.findUniqueOrThrow({ where: { id: request.id } })).status, "approved");

      // A rejected request changes nothing.
      const second = await acc.createAccountChangeRequest(seller.id, { status: "active", commissionRatePercent: 9 }, hr.id);
      const secondApproval = await submitForApproval({ targetType: "account_change", targetId: second.id, requesterId: hr.id });
      await decideApprovalRequest(secondApproval.approvalRequestId, admin.id, "rejected", "Keep suspended for now");
      const rejected = await acc.accountSnapshot(seller.id);
      assert.deepEqual([rejected.status, rejected.commissionRatePercent], ["suspended", 6]);
      const history = await acc.listAccountChangeRequests(seller.id);
      assert.deepEqual(history.map((h) => h.status), ["rejected", "approved"]);
      throw rollback;
    }), { timeout: 60000 });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log("Account change checks passed and rolled back: Super Admin protected, validation (bounds, loops, own role, Super Admin grants), admin applies directly and ends sessions, HR changes wait for admin approval, approved changes apply, rejected ones do not, history kept.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
