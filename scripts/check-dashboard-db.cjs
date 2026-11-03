// Run: node scripts/check-dashboard-db.cjs  (local database only; everything is rolled back)
// Role dashboards: approvals waiting, request/SR workload and complaint privacy.
require("dotenv").config({ quiet: true });
require("ts-node").register({ transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", moduleResolution: "Node", esModuleInterop: true, resolveJsonModule: true } });
const assert = require("node:assert/strict");
const { db } = require("../apps/admin/lib/database/db.ts");
const { transactionContext } = require("../apps/admin/lib/database/transaction-context.ts");
const w = require("../apps/admin/lib/database/queries/dashboard-workload.ts");

const rollback = new Error("ROLLBACK_DASHBOARD_TEST");
const DAY = 86400000;

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(url.hostname), "Run only against a local test/development database");
  try {
    await db.$transaction((tx) => transactionContext.run(tx, async () => {
      const stamp = Date.now();
      const now = new Date();
      const user = (name) => tx.user.create({ data: { email: `${name}-${stamp}@dash.test`, fullName: name, passwordHash: "x", role: "sales" } });
      const [boss, staff] = await Promise.all([user("Boss"), user("Staff")]);

      // Approvals: the queue holds only what this user can decide, oldest first.
      const before = await w.getApprovalWorkload(boss.id, ["quotation", "invoice"], now);
      const approval = (targetType, status, approverIds, ageDays, n) =>
        tx.approvalRequest.create({ data: { targetType, targetId: `t-${stamp}-${n}`, contentHash: "h", status, requestedById: staff.id, policySnapshot: {}, approverIds, createdAt: new Date(now.getTime() - ageDays * DAY) } });
      await approval("quotation", "pending", [boss.id], 5, 1);
      await approval("invoice", "pending", [boss.id], 1, 2);
      await approval("invoice", "pending", [staff.id], 0, 3);
      await approval("leave_request", "pending", [staff.id], 9, 4);
      const decided = await approval("quotation", "approved", [], 2, 5);
      await tx.approvalDecision.create({ data: { approvalRequestId: decided.id, decision: "approved", decidedById: boss.id, decidedAt: new Date(decided.createdAt.getTime() + 6 * 3600000) } });
      const a = await w.getApprovalWorkload(boss.id, ["quotation", "invoice"], now);
      assert.equal(a.awaitingMe, 2);
      assert.deepEqual(a.awaitingMeByType, { quotation: 1, invoice: 1 });
      assert.equal(a.queue[0].targetType, "quotation", "oldest first");
      assert.equal(a.queue[0].requester, "Staff");
      assert.equal(a.myDecidedLast30, 1);
      assert.equal(a.org.pending - before.org.pending, 3, "org view counts readable types only (leave hidden)");
      assert.equal(a.org.stale - before.org.stale, 1, "pending over three days is stale");
      const none = await w.getApprovalWorkload(staff.id, [], now);
      assert.equal(none.org, null, "no readable types, no company view");
      assert.equal(none.mySubmittedPending, 4);

      // Requests: complaints hidden without support access; SLA and kinds counted.
      const inq = (data) => tx.inquiry.create({ data: { reference: `TST-${require("node:crypto").randomUUID()}`, name: "C", email: "c@dash.test", message: "m", ...data } });
      const r0 = await w.getRequestWorkload(staff.id, { includeComplaints: false }, now);
      const r0all = await w.getRequestWorkload(staff.id, { includeComplaints: true }, now);
      await inq({ requestType: "SR", assignedToId: staff.id, slaDueDate: new Date(now.getTime() - DAY), priority: "urgent", team: "production" });
      await inq({ intent: "complaint", workflowStatus: "received" });
      await inq({ requestType: "SR", workflowStatus: "resolved", createdAt: new Date(now.getTime() - 2 * DAY), resolvedAt: new Date(now.getTime() - DAY), slaDueDate: now });
      const r1 = await w.getRequestWorkload(staff.id, { includeComplaints: false }, now);
      const r1all = await w.getRequestWorkload(staff.id, { includeComplaints: true }, now);
      assert.equal(r1.open - r0.open, 1, "the complaint is not counted without support access");
      assert.equal(r1all.open - r0all.open, 2);
      assert.equal(r1.byKind.service - r0.byKind.service, 1);
      assert.equal(r1.overdue - r0.overdue, 1);
      assert.equal(r1.mine.open, 1);
      assert.equal(r1.mine.overdue, 1);
      assert.equal(r1.mine.items[0].overdue, true);
      assert.equal(r1.resolvedLast30 - r0.resolvedLast30, 1);
      assert.ok(r1.slaMetPct !== null && r1.avgResolutionHours !== null);

      // Complaints.
      const c = await w.getComplaintWorkload(now);
      assert.ok(c.open >= 1 && c.latest.some((row) => row.kind === "feedback" && row.assignee === null));
      throw rollback;
    }), { timeout: 30000 });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log("Dashboard database checks passed and rolled back: approval queue and company view, readable types, complaint privacy, SLA and resolution stats.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
