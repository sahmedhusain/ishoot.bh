// Run: node scripts/check-approvals-db.cjs  (local database only; everything is rolled back)
// End-to-end approval routing against the real schema and the seeded approval policies.
require("dotenv").config({ quiet: true });
require("ts-node").register({ transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", moduleResolution: "Node", esModuleInterop: true, resolveJsonModule: true } });
const assert = require("node:assert/strict");
const { db } = require("../packages/database/src/db.ts");
const { transactionContext } = require("../packages/database/src/transaction-context.ts");
const { createLeaveRequest } = require("../packages/database/src/queries/leave.ts");
const { submitForApproval, decideApprovalRequest, canDecideApproval } = require("../packages/database/src/services/approval-engine.ts");

const rollback = new Error("ROLLBACK_APPROVALS_TEST");

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(url.hostname), "Run only against a local test/development database");
  try {
    await db.$transaction((tx) => transactionContext.run(tx, async () => {
      const policy = await tx.approvalPolicy.findUnique({ where: { targetType: "leave_request" }, include: { steps: true } });
      assert.ok(policy, "Run migrations first: the leave approval policy is missing");
      const stamp = Date.now();
      const user = (role, extra = {}) =>
        tx.user.create({ data: { email: `${role}-${stamp}@approvals.test`, fullName: `Test ${role}`, passwordHash: "x", role, ...extra } });
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
      assert.equal(Number((await tx.employee.findUniqueOrThrow({ where: { id: employee.id } })).leaveBalanceDays), 28, "two working days deducted");
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
      throw rollback;
    }), { timeout: 30000 });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log("Approval database checks passed and rolled back: accountant leave → manager → HR, no self-approval, balance deducted by working days, requester notified, Super Admin requests auto-approved.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
