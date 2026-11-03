// Run: node scripts/check-approvals-db.cjs  (local database only; everything is rolled back)
// End-to-end approval routing against the real schema and the seeded approval policies.
require("dotenv").config({ quiet: true });
require("ts-node").register({ transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", moduleResolution: "Node", esModuleInterop: true, resolveJsonModule: true } });
const assert = require("node:assert/strict");
const { db } = require("../apps/admin/lib/database/db.ts");
const { transactionContext } = require("../apps/admin/lib/database/transaction-context.ts");
const { createLeaveRequest } = require("../apps/admin/lib/database/queries/leave.ts");
const { submitForApproval, decideApprovalRequest, canDecideApproval, processApprovalTimeouts } = require("../apps/admin/lib/database/services/approval-engine.ts");
const { updateApprovalPolicy } = require("../apps/admin/lib/database/queries/approval-policies.ts");

const rollback = new Error("ROLLBACK_APPROVALS_TEST");

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(url.hostname), "Run only against a local test/development database");
  try {
    await db.$transaction((tx) => transactionContext.run(tx, async () => {
      const policy = await tx.approvalPolicy.findUnique({ where: { targetType: "leave_request" }, include: { steps: true } });
      assert.ok(policy, "Run migrations first: the leave approval policy is missing");
      const stamp = Date.now();
      let seq = 0;
      const user = (role, extra = {}) =>
        tx.user.create({ data: { email: `${role}-${stamp}-${++seq}@approvals.test`, fullName: `Test ${role}`, passwordHash: "x", role, ...extra } });
      const manager = await user("finance_manager");
      const accountant = await user("accountant", { managerId: manager.id });
      const superAdmin = await user("super_admin");
      const employee = await tx.employee.create({
        data: {
          employeeNumber: `T-${stamp}`, userId: accountant.id, firstNameEn: "Acc", lastNameEn: "Test", firstNameAr: "اختبار", lastNameAr: "محاسب",
          jobTitleEn: "Accountant", jobTitleAr: "محاسب", hireDate: new Date("2020-01-01"), leaveBalanceDays: 30,
        },
      });
      const leaveType = await tx.leaveType.create({ data: { code: `appr-${stamp}`, nameEn: "Annual", nameAr: "سنوية", isPaid: true } });

      // Accountant files leave → manager first.
      const leave = await createLeaveRequest({ employeeId: employee.id, leaveTypeId: leaveType.id, startDate: new Date("2199-05-06"), endDate: new Date("2199-05-07"), reason: "Family" });
      const submitted = await submitForApproval({ targetType: "leave_request", targetId: leave.id, requesterId: accountant.id });
      assert.equal(submitted.status, "pending");
      assert.deepEqual(submitted.approverIds, [manager.id], "leave goes to the accountant's manager first");
      await assert.rejects(decideApprovalRequest(submitted.approvalRequestId, accountant.id, "approved"), /your own request/);
      const step2 = await decideApprovalRequest(submitted.approvalRequestId, manager.id, "approved");
      if (step2.status === "pending") {
        assert.ok(!step2.approverIds.includes(accountant.id) && !step2.approverIds.includes(manager.id));
        await decideApprovalRequest(submitted.approvalRequestId, step2.approverIds[0], "approved");
      }
      assert.equal((await tx.leaveRequest.findUniqueOrThrow({ where: { id: leave.id } })).status, "approved");
      const { getLeaveBalance } = require("../apps/admin/lib/database/queries/leave-balances.ts");
      assert.equal((await getLeaveBalance(employee.id, leaveType.id, 2199)).available, 28, "two working days deducted");
      assert.ok(await tx.notification.count({ where: { userId: accountant.id, entityId: leave.id } }), "the accountant is notified");

      // Super Admin's own request is approved at once and the decision says why.
      const ownLeave = await tx.leaveRequest.create({
        data: { employeeId: employee.id, leaveTypeId: leaveType.id, startDate: new Date("2199-06-01"), endDate: new Date("2199-06-01"), reason: "x", status: "pending" },
      });
      const own = await submitForApproval({ targetType: "leave_request", targetId: ownLeave.id, requesterId: superAdmin.id });
      assert.equal(own.status, "approved", "Super Admin requests are auto-approved");
      const ownDecision = await tx.approvalDecision.findFirstOrThrow({ where: { approvalRequestId: own.approvalRequestId } });
      assert.equal(ownDecision.reason, "super_admin");
      assert.equal((await tx.leaveRequest.findUniqueOrThrow({ where: { id: ownLeave.id } })).status, "approved");

      // Thresholds: claims always go to the manager; only claims of 500 BHD or more also need a finance manager.
      const finance = await user("finance_manager");
      const admin = await user("admin");
      await updateApprovalPolicy("expense_claim", {
        enabled: true, allowSelfApproval: false, autoApproveRoles: [], reminderAfterHours: 4,
        steps: [
          { approverMode: "manager" },
          { approverMode: "user", userId: finance.id, minAmount: 500, escalateAfterHours: 2, escalateMode: "role", escalateRoleKey: "admin" },
        ],
      });
      await assert.rejects(updateApprovalPolicy("expense_claim", { enabled: true, allowSelfApproval: false, autoApproveRoles: [], steps: [{ approverMode: "manager", minDays: 2 }] }), /does not apply/);
      const claim = (amount) => tx.expenseClaim.create({ data: { currency: "BHD", claimNumber: `CLM-T-${stamp}-${amount}`, claimantId: accountant.id, amount, expenseDate: new Date("2199-05-01"), reason: "Taxi", receiptUrl: "/uploads/x.pdf" } });
      const small = await claim(120);
      const smallReq = await submitForApproval({ targetType: "expense_claim", targetId: small.id, requesterId: accountant.id });
      assert.deepEqual(smallReq.approverIds, [manager.id]);
      assert.equal((await decideApprovalRequest(smallReq.approvalRequestId, manager.id, "approved")).status, "approved", "a small claim skips the finance step");
      const big = await claim(800);
      const bigReq = await submitForApproval({ targetType: "expense_claim", targetId: big.id, requesterId: accountant.id });
      assert.deepEqual((await tx.approvalRequest.findUniqueOrThrow({ where: { id: bigReq.approvalRequestId } })).metrics, { amount: 800 });
      const bigStep2 = await decideApprovalRequest(bigReq.approvalRequestId, manager.id, "approved");
      assert.equal(bigStep2.status, "pending");
      assert.deepEqual(bigStep2.approverIds, [finance.id], "a large claim also needs the finance manager");

      // Escalation: after two hours at the finance step, admins are added and notified once.
      await tx.approvalRequest.update({ where: { id: bigReq.approvalRequestId }, data: { stepStartedAt: new Date(Date.now() - 3 * 3600_000) } });
      await processApprovalTimeouts();
      const escalated = await tx.approvalRequest.findUniqueOrThrow({ where: { id: bigReq.approvalRequestId } });
      assert.ok(escalated.escalatedAt && escalated.approverIds.includes(admin.id) && escalated.approverIds.includes(finance.id));
      assert.equal(await tx.notification.count({ where: { userId: admin.id, entityId: big.id, messageKey: "approvals.notifications.escalated" } }), 1);
      await processApprovalTimeouts();
      assert.equal(await tx.notification.count({ where: { userId: admin.id, entityId: big.id } }), 1, "escalation happens once");
      assert.equal((await decideApprovalRequest(bigReq.approvalRequestId, admin.id, "approved")).status, "approved", "the escalation approver can decide");

      // Reminder: approvers are re-notified once after the policy's reminder delay.
      const late = await claim(90);
      const lateReq = await submitForApproval({ targetType: "expense_claim", targetId: late.id, requesterId: accountant.id });
      await tx.approvalRequest.update({ where: { id: lateReq.approvalRequestId }, data: { stepStartedAt: new Date(Date.now() - 5 * 3600_000) } });
      await processApprovalTimeouts();
      await processApprovalTimeouts();
      assert.equal(await tx.notification.count({ where: { userId: manager.id, entityId: late.id, messageKey: "approvals.notifications.reminder" } }), 1);

      // A policy whose only step is conditional approves records below the threshold on submit.
      await updateApprovalPolicy("expense_claim", { enabled: true, allowSelfApproval: false, autoApproveRoles: [], steps: [{ approverMode: "user", userId: finance.id, minAmount: 500 }] });
      const tiny = await claim(40);
      const tinyReq = await submitForApproval({ targetType: "expense_claim", targetId: tiny.id, requesterId: accountant.id });
      assert.equal(tinyReq.status, "approved");
      assert.equal((await tx.approvalDecision.findFirstOrThrow({ where: { approvalRequestId: tinyReq.approvalRequestId } })).reason, "below_threshold");
      assert.equal((await tx.expenseClaim.findUniqueOrThrow({ where: { id: tiny.id } })).status, "approved");
      throw rollback;
    }), { timeout: 30000 });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log("Approval database checks passed and rolled back: accountant leave → manager → HR, no self-approval, balance deducted by working days, requester notified, Super Admin requests auto-approved, amount thresholds skip steps, escalation and reminders fire once, below-threshold claims auto-approve.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
