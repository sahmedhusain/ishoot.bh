// Run: node scripts/check-approval-flows-db.cjs  (local database only; everything is rolled back)
// Every approval type end to end: submitted by a regular user, routed by its policy, approved or rejected by
// the eligible approvers, and the decision applied to the record. Requesters are notified either way.
require("dotenv").config({ quiet: true });
require("ts-node").register({ transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", moduleResolution: "Node", esModuleInterop: true, resolveJsonModule: true } });
const assert = require("node:assert/strict");
const { db } = require("../packages/database/src/db.ts");
const { transactionContext } = require("../packages/database/src/transaction-context.ts");
const { createEmployee } = require("../packages/database/src/queries/hrms.ts");
const { submitForApproval, decideApprovalRequest } = require("../packages/database/src/services/approval-engine.ts");
const { APPROVAL_TARGET_TYPES } = require("../packages/database/src/constants/approvals.ts");
require("../packages/database/src/queries/assets.ts"); // registers the asset handover decision handler
require("../packages/database/src/queries/employee-handovers.ts"); // and the employee handover one

const rollback = new Error("ROLLBACK_APPROVAL_FLOWS_TEST");

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(url.hostname), "Run only against a local test/development database");
  const results = [];
  try {
    await db.$transaction((tx) => transactionContext.run(tx, async () => {
      const stamp = Date.now();
      const superAdmin = await tx.user.findFirstOrThrow({ where: { role: "super_admin", isActive: true }, select: { id: true } });
      const manager = await tx.user.create({ data: { email: `flow-mgr-${stamp}@flows.test`, fullName: "Flow Manager", passwordHash: "x", role: "production_manager" } });
      const requester = await tx.user.create({ data: { email: `flow-req-${stamp}@flows.test`, fullName: "Flow Requester", passwordHash: "x", role: "producer", managerId: manager.id } });
      const employee = await createEmployee({ firstNameEn: "Flow", lastNameEn: "Tester", firstNameAr: "اختبار", lastNameAr: "المسار", jobTitleEn: "Producer", jobTitleAr: "منتج", hireDate: new Date("2020-01-01"), basicSalary: 1000, payrollSettings: { employee: { mode: "percentage", value: 7 }, employer: { mode: "percentage", value: 12 }, supports: [] } }, superAdmin.id);
      await tx.employee.update({ where: { id: employee.id }, data: { userId: requester.id } });
      const annual = await tx.leaveType.findUniqueOrThrow({ where: { code: "annual" } });
      let runMonth = 0;

      // Each type: create a record awaiting a decision, and read back the state the decision should produce.
      const flows = {
        leave_request: {
          make: async () => (await tx.leaveRequest.create({ data: { employeeId: employee.id, leaveTypeId: annual.id, startDate: new Date(`2199-0${3 + runMonth}-02`), endDate: new Date(`2199-0${3 + runMonth}-02`), days: 1, reason: "flow", status: "pending" } })).id,
          state: async (id) => (await tx.leaveRequest.findUniqueOrThrow({ where: { id } })).status,
          approved: "approved", rejected: "rejected",
        },
        salary_document: {
          make: async () => (await tx.salaryDocument.create({ data: { employeeId: employee.id, kind: "salary_certificate", months: [], status: "pending", requestedById: requester.id } })).id,
          state: async (id) => (await tx.salaryDocument.findUniqueOrThrow({ where: { id } })).status,
          approved: "issued", rejected: "rejected",
        },
        profile_change: {
          make: async () => (await tx.profileChangeRequest.create({ data: { userId: requester.id, requestedById: requester.id, managerId: manager.id, oldValues: { fullName: "Flow Requester" }, newValues: { fullName: "Flow Requester Updated" } } })).id,
          state: async (id) => (await tx.profileChangeRequest.findUniqueOrThrow({ where: { id } })).status,
          approved: "approved", rejected: "rejected",
        },
        service_request: {
          make: async () => {
            const inquiry = await tx.inquiry.findFirstOrThrow({ where: { workflowStatus: { not: "approved" } }, select: { id: true } });
            await tx.inquiry.update({ where: { id: inquiry.id }, data: { workflowStatus: "pending_approval" } });
            return inquiry.id;
          },
          state: async (id) => (await tx.inquiry.findUniqueOrThrow({ where: { id } })).workflowStatus,
          approved: "approved", rejected: "returned",
        },
        quotation: {
          make: async () => {
            // Any quotation will do: it is put back to awaiting approval inside the rolled-back transaction.
            const q = await tx.quotation.findFirstOrThrow({ where: { status: { in: ["draft", "pending_approval", "submitted"] } }, select: { id: true } }).catch(() => tx.quotation.findFirstOrThrow({ select: { id: true } }));
            await tx.quotation.update({ where: { id: q.id }, data: { status: "pending_approval" } });
            return q.id;
          },
          state: async (id) => (await tx.quotation.findUniqueOrThrow({ where: { id } })).status,
          approved: "approved", rejected: "draft",
        },
        payroll_run: {
          make: async () => (await tx.payrollRun.create({ data: { year: 2198, month: ++runMonth, periodStart: new Date("2198-01-01"), periodEnd: new Date("2198-01-31"), status: "submitted" } })).id,
          state: async (id) => (await tx.payrollRun.findUniqueOrThrow({ where: { id } })).status,
          approved: "approved", rejected: "draft",
        },
        expense: {
          make: async () => {
            const e = await tx.expense.findFirstOrThrow({ select: { id: true } });
            await tx.expense.update({ where: { id: e.id }, data: { status: "pending" } });
            return e.id;
          },
          state: async (id) => (await tx.expense.findUniqueOrThrow({ where: { id } })).status,
          approved: "approved", rejected: "rejected",
        },
        invoice: {
          make: async () => {
            const i = await tx.invoice.findFirstOrThrow({ where: { status: "draft" }, select: { id: true } }).catch(() => tx.invoice.findFirstOrThrow({ select: { id: true } }));
            await tx.invoice.update({ where: { id: i.id }, data: { approvalStatus: "pending" } });
            return i.id;
          },
          state: async (id) => (await tx.invoice.findUniqueOrThrow({ where: { id } })).approvalStatus,
          approved: "approved", rejected: "rejected",
        },
        expense_claim: {
          make: async () => (await tx.expenseClaim.create({ data: { claimNumber: `FLOW-${stamp}-${Math.random().toString(36).slice(2, 7)}`, claimantId: requester.id, amount: 25, expenseDate: new Date("2199-01-05"), reason: "Taxi", receiptUrl: "/uploads/r.pdf" } })).id,
          state: async (id) => (await tx.expenseClaim.findUniqueOrThrow({ where: { id } })).status,
          approved: "approved", rejected: "rejected",
        },
        account_change: {
          make: async () => {
            const target = await tx.user.create({ data: { email: `flow-acc-${stamp}-${Math.random().toString(36).slice(2, 7)}@flows.test`, fullName: "Flow Account", passwordHash: "x", role: "viewer" } });
            return (await tx.accountChangeRequest.create({ data: { userId: target.id, requestedById: requester.id, changes: { commissionRatePercent: 4 }, before: { commissionRatePercent: null } } })).id;
          },
          state: async (id) => (await tx.accountChangeRequest.findUniqueOrThrow({ where: { id } })).status,
          approved: "approved", rejected: "rejected",
        },
        asset_handover: {
          make: async () => {
            const category = await tx.assetCategory.findUniqueOrThrow({ where: { code: "other" } });
            const asset = await tx.asset.create({ data: { assetTag: `AST-FLOW-${stamp}-${Math.random().toString(36).slice(2, 7)}`, categoryId: category.id, name: "Flow asset", condition: "good" } });
            return (await tx.assetHandover.create({ data: { reference: `AHO-FLOW-${asset.id.slice(0, 8)}`, assetId: asset.id, employeeId: employee.id, kind: "issue", status: "pending_approval", handoverDate: new Date(), condition: "good", createdById: superAdmin.id, employeeSignature: "data:image/png;base64,x", employeeSignerName: "Flow", employeeSignedAt: new Date() } })).id;
          },
          state: async (id) => (await tx.assetHandover.findUniqueOrThrow({ where: { id } })).status,
          approved: "completed", rejected: "rejected",
        },
        employee_handover: {
          make: async () => (await tx.employeeHandover.create({ data: { reference: `EHO-FLOW-${stamp}-${Math.random().toString(36).slice(2, 7)}`, employeeId: employee.id, kind: "leave", status: "pending_approval", effectiveDate: new Date("2199-02-01"), checklist: [], createdById: superAdmin.id } })).id,
          state: async (id) => (await tx.employeeHandover.findUniqueOrThrow({ where: { id } })).status,
          approved: "completed", rejected: "open",
        },
        signature_change: {
          make: async () => (await tx.signatureChange.create({ data: { userId: requester.id, signatureUrl: "/brand/signatures/guest.svg" } })).id,
          state: async (id) => (await tx.signatureChange.findUniqueOrThrow({ where: { id } })).status,
          approved: "approved", rejected: "rejected",
        },
      };
      assert.deepEqual(Object.keys(flows).sort(), [...APPROVAL_TARGET_TYPES].sort(), "every approval type is covered");

      for (const targetType of APPROVAL_TARGET_TYPES) {
        const flow = flows[targetType];
        for (const decision of ["approved", "rejected"]) {
          const targetId = await flow.make();
          const submitted = await submitForApproval({ targetType, targetId, requesterId: requester.id });
          const policy = await tx.approvalPolicy.findUnique({ where: { targetType } });
          if (policy && !policy.enabled) {
            // Approval switched off for this type: approved on submit, recorded as policy_auto.
            assert.equal(submitted.status, "approved", `${targetType}: approved on submit when the policy is off`);
            assert.equal(await flow.state(targetId), flow.approved);
            assert.equal((await tx.approvalDecision.findFirstOrThrow({ where: { approvalRequestId: submitted.approvalRequestId } })).reason, "policy_auto");
            results.push(`${targetType}:auto-approved(policy off)`);
            break;
          }
          let outcome = submitted;
          const deciders = [];
          // Walk the policy's steps: each step's first eligible approver decides; a rejection ends it at once.
          for (let guard = 0; outcome.status === "pending" && guard < 6; guard++) {
            const pending = await tx.approvalRequest.findUniqueOrThrow({ where: { id: submitted.approvalRequestId } });
            assert.ok(!pending.approverIds.includes(requester.id), `${targetType}: the requester is never their own approver`);
            const decider = pending.approverIds[0] ?? superAdmin.id;
            deciders.push(decider);
            if (decision === "rejected") await assert.rejects(decideApprovalRequest(submitted.approvalRequestId, decider, "rejected"), /reason is required/);
            outcome = await decideApprovalRequest(submitted.approvalRequestId, decider, decision, decision === "rejected" ? "Not this time" : undefined);
          }
          assert.equal(outcome.status, decision, `${targetType}: ${decision}`);
          assert.equal(await flow.state(targetId), flow[decision], `${targetType}: record is ${flow[decision]} after ${decision}`);
          const notified = await tx.notification.count({ where: { userId: requester.id, entityId: targetId, messageKey: `approvals.notifications.${decision}` } });
          assert.equal(notified, 1, `${targetType}: requester told about the ${decision} decision`);
          await assert.rejects(decideApprovalRequest(submitted.approvalRequestId, superAdmin.id, "approved"), /already/);
          results.push(`${targetType}:${decision}(${deciders.length} step${deciders.length === 1 ? "" : "s"})`);
        }
      }
      throw rollback;
    }), { timeout: 120000 });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log(`Approval flow checks passed and rolled back for every type: ${results.join(", ")}.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
