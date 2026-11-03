// Run: node scripts/check-employee-handovers-db.cjs  (local database only; everything is rolled back)
// Exit and leave handovers: open cases gathered and reassigned (one person, a team in turn, or case by case),
// company assets returned through signed returns, HR's checklist, approval marking the employee as left,
// and leave types that open a handover automatically when the leave is approved.
require("dotenv").config({ quiet: true });
require("ts-node").register({
  transpileOnly: true,
  skipProject: true,
  compilerOptions: {
    module: "CommonJS",
    target: "ES2022",
    moduleResolution: "Node",
    esModuleInterop: true,
    resolveJsonModule: true,
  },
});
const assert = require("node:assert/strict");
const { db } = require("../apps/admin/lib/database/db.ts");
const {
  transactionContext,
} = require("../apps/admin/lib/database/transaction-context.ts");
const { createEmployee } = require("../apps/admin/lib/database/queries/hrms.ts");
const handovers = require("../apps/admin/lib/database/queries/employee-handovers.ts");
const assets = require("../apps/admin/lib/database/queries/assets.ts");
const {
  approveLeaveRequest,
} = require("../apps/admin/lib/database/queries/leave.ts");
const {
  decideApprovalRequest,
  findPendingApproval,
} = require("../apps/admin/lib/database/services/approval-engine.ts");

const rollback = new Error("ROLLBACK_EMPLOYEE_HANDOVERS_TEST");
const rejects = (promise, message) =>
  assert.rejects(promise, (error) => error.message === message);
const sharp = require(
  require.resolve("sharp", {
    paths: [require("node:path").resolve(__dirname, "../apps/admin")],
  }),
);

async function signature() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="200"><path d="M20 150 C 120 20, 220 180, 320 60 S 520 160, 580 40" stroke="#111" stroke-width="5" fill="none"/></svg>`;
  return `data:image/png;base64,${(await sharp(Buffer.from(svg)).png().toBuffer()).toString("base64")}`;
}

async function approveAll(type, id, admin) {
  for (let i = 0; i < 6; i++) {
    const pending = await findPendingApproval(type, id);
    if (!pending) return;
    // Handovers are signed on the spot: approvers draw their signature when approving.
    await decideApprovalRequest(
      pending.id,
      pending.approverIds[0] ?? admin.id,
      "approved",
      "checked",
      await signature(),
    );
  }
}

async function main() {
  const sig = await signature();
  try {
    await db.$transaction(
      (tx) =>
        transactionContext.run(tx, async () => {
          const stamp = Date.now();
          const admin = await tx.user.findFirstOrThrow({
            where: {
              role: "super_admin",
              isActive: true,
              NOT: { email: { startsWith: "claude-preview@" } },
            },
          });
          const leaver = await tx.user.create({
            data: {
              email: `eho-leaver-${stamp}@handovers.test`,
              fullName: "Leaving Person",
              passwordHash: "x",
              role: "project_lead",
            },
          });
          const [mate1, mate2] = await Promise.all(
            [1, 2].map((n) =>
              tx.user.create({
                data: {
                  email: `eho-mate${n}-${stamp}@handovers.test`,
                  fullName: `Team Mate ${n}`,
                  passwordHash: "x",
                  role: "project_lead",
                },
              }),
            ),
          );
          const employee = await createEmployee(
            {
              firstNameEn: "Leaving",
              lastNameEn: "Person",
              firstNameAr: "موظف",
              lastNameAr: "مغادر",
              jobTitleEn: "Producer",
              jobTitleAr: "منتج",
              hireDate: new Date("2020-01-01"),
              basicSalary: 900,
              payrollSettings: {
                employee: { mode: "percentage", value: 7 },
                employer: { mode: "percentage", value: 12 },
                supports: [],
              },
            },
            admin.id,
          );
          await tx.employee.update({
            where: { id: employee.id },
            data: { userId: leaver.id },
          });

          // Open work the employee owns: two requests, a deal and an approval waiting for them.
          const inquiries = await tx.inquiry.findMany({
            where: {
              workflowStatus: { notIn: ["resolved", "archived", "rejected"] },
            },
            take: 3,
            select: { id: true },
          });
          assert.ok(inquiries.length >= 3, "seed has open requests");
          await tx.inquiry.updateMany({
            where: { id: { in: inquiries.map((i) => i.id) } },
            data: { assignedToId: leaver.id },
          });
          const deal = await tx.crmDeal.findFirstOrThrow({
            where: {
              dealStage: {
                notIn: ["won", "lost", "closed_won", "closed_lost"],
              },
            },
            select: { id: true },
          });
          await tx.crmDeal.update({
            where: { id: deal.id },
            data: { assignedTo: leaver.id },
          });
          const approval = await tx.approvalRequest.create({
            data: {
              targetType: "expense",
              targetId: `eho-${stamp}`,
              contentHash: "x",
              requestedById: admin.id,
              policySnapshot: {},
              approverIds: [leaver.id],
            },
          });

          // ---- open an exit handover
          await rejects(
            handovers.openEmployeeHandover(
              {
                employee_id: employee.id,
                kind: "leave",
                effective_date: "2199-05-10",
                return_date: "2199-05-01",
              },
              admin.id,
            ),
            "The return date cannot be before the start date",
          );
          const exit = await handovers.openEmployeeHandover(
            {
              employee_id: employee.id,
              kind: "exit",
              effective_date: "2199-05-31",
              reason: "Resignation",
            },
            admin.id,
          );
          assert.match(exit.reference, /^EHO-\d{4}-\d+$/);
          await rejects(
            handovers.openEmployeeHandover(
              {
                employee_id: employee.id,
                kind: "exit",
                effective_date: "2199-05-31",
              },
              admin.id,
            ),
            "This employee already has an exit handover in progress",
          );
          let detail = await handovers.getEmployeeHandover(exit.id);
          assert.deepEqual(
            detail.cases.map((c) => c.type).sort(),
            ["approval", "deal", "request", "request", "request"],
            "every open case is gathered",
          );
          assert.equal(
            detail.checklist.length,
            handovers.HANDOVER_CHECKLIST.exit.length,
          );

          // ---- case mode guards
          await rejects(
            handovers.setHandoverCaseMode(exit.id, { mode: "delegate" }),
            "Choose who takes over the cases",
          );
          await rejects(
            handovers.setHandoverCaseMode(exit.id, {
              mode: "spread",
              team_user_ids: [leaver.id],
            }),
            "Choose the team members who share the cases",
          );
          await rejects(
            handovers.setHandoverCaseMode(exit.id, {
              mode: "delegate",
              delegate_user_id: leaver.id,
            }),
            "Choose someone other than the employee",
          );
          const inactive = await tx.user.create({
            data: {
              email: `eho-off-${stamp}@handovers.test`,
              fullName: "Gone",
              passwordHash: "x",
              role: "project_lead",
              isActive: false,
            },
          });
          await rejects(
            handovers.setHandoverCaseMode(exit.id, {
              mode: "delegate",
              delegate_user_id: inactive.id,
            }),
            "Choose active team members",
          );

          // ---- manual: one request by hand; the approval cannot go back to the person who asked for it
          await handovers.setHandoverCaseMode(exit.id, { mode: "manual" });
          const firstRequest = detail.cases.find((c) => c.type === "request");
          const approvalCase = detail.cases.find((c) => c.type === "approval");
          await rejects(
            handovers.applyHandoverCases(exit.id, admin.id, {
              [approvalCase.id]: admin.id,
            }),
            "An approval cannot go to the person who requested it",
          );
          assert.equal(
            await handovers.applyHandoverCases(exit.id, admin.id, {
              [firstRequest.id]: mate1.id,
            }),
            1,
          );
          assert.equal(
            (
              await tx.inquiry.findUniqueOrThrow({
                where: { id: firstRequest.case_id },
              })
            ).assignedToId,
            mate1.id,
          );

          // ---- spread: the rest shared in turn across the team
          await handovers.setHandoverCaseMode(exit.id, {
            mode: "spread",
            team_user_ids: [mate1.id, mate2.id, leaver.id],
          });
          assert.equal(
            await handovers.applyHandoverCases(exit.id, admin.id),
            4,
          );
          detail = await handovers.getEmployeeHandover(exit.id);
          assert.ok(detail.cases.every((c) => c.status === "reassigned"));
          const owners = detail.cases.slice(1).map((c) => c.to);
          assert.ok(
            owners.includes("Team Mate 1") && owners.includes("Team Mate 2"),
            "both team members get cases",
          );
          assert.equal(
            (await tx.crmDeal.findUniqueOrThrow({ where: { id: deal.id } }))
              .assignedTo !== leaver.id,
            true,
          );
          const moved = await tx.approvalRequest.findUniqueOrThrow({
            where: { id: approval.id },
          });
          assert.ok(
            !moved.approverIds.includes(leaver.id) &&
            moved.approverIds.length === 1,
            "the approval now waits for a colleague",
          );

          // ---- assets must come back before submitting
          const category = await tx.assetCategory.findUniqueOrThrow({
            where: { code: "other" },
          });
          const laptop = await tx.asset.create({
            data: { currency: "BHD",
              assetTag: `AST-EHO-${stamp}`,
              categoryId: category.id,
              name: "Work laptop",
              condition: "good",
              status: "assigned",
              holderEmployeeId: employee.id,
            },
          });
          for (const item of handovers.HANDOVER_CHECKLIST.exit)
            await handovers.updateHandoverChecklist(
              exit.id,
              item,
              { done: true, not_applicable: false },
              admin.id,
            );
          await rejects(
            handovers.updateHandoverChecklist(
              exit.id,
              "exit_interview",
              { done: false, not_applicable: true },
              admin.id,
            ),
            "Say why the item does not apply",
          );
          await handovers.updateHandoverChecklist(
            exit.id,
            "exit_interview",
            {
              done: false,
              not_applicable: true,
              note: "Declined by the employee",
            },
            admin.id,
          );
          assert.deepEqual(await handovers.handoverBlockers(exit.id), {
            assetsHeld: 1,
            returnsInProgress: 0,
            casesPending: 0,
            checklistOpen: 0,
          });
          await rejects(
            handovers.submitEmployeeHandover(exit.id, admin.id),
            "Every company asset must be returned first",
          );
          const back = await assets.startAssetHandover(
            {
              asset_id: laptop.id,
              employee_id: employee.id,
              kind: "return",
              handover_date: "2199-05-30",
              condition: "good",
              checklist: [],
              offboarding_id: exit.id,
            },
            admin.id,
            { signature: sig, signer_name: "Leaving Person" },
            sig,
          );
          await rejects(
            handovers.submitEmployeeHandover(exit.id, admin.id),
            "Every company asset must be returned first",
          );
          await approveAll("asset_handover", back.id, admin);
          assert.equal(
            (await tx.asset.findUniqueOrThrow({ where: { id: laptop.id } }))
              .holderEmployeeId,
            null,
          );
          assert.equal(
            (await handovers.getEmployeeHandover(exit.id)).returns.length,
            1,
            "the return shows in the handover",
          );

          // ---- a case that appears later blocks submitting until it is reassigned
          const late = await tx.inquiry.findFirstOrThrow({
            where: {
              workflowStatus: { notIn: ["resolved", "archived", "rejected"] },
              id: { notIn: inquiries.map((i) => i.id) },
            },
            select: { id: true },
          });
          await tx.inquiry.update({
            where: { id: late.id },
            data: { assignedToId: leaver.id },
          });
          await rejects(
            handovers.submitEmployeeHandover(exit.id, admin.id),
            "Reassign every open case first",
          );
          await handovers.setHandoverCaseMode(exit.id, {
            mode: "delegate",
            delegate_user_id: mate2.id,
          });
          assert.equal(
            await handovers.applyHandoverCases(exit.id, admin.id),
            1,
          );

          // ---- approval: rejected back to HR, then approved and the employee is marked as left
          await handovers.submitEmployeeHandover(exit.id, mate1.id);
          await rejects(
            handovers.updateHandoverChecklist(
              exit.id,
              "clearance_letter",
              { done: true, not_applicable: false },
              admin.id,
            ),
            "This handover can no longer be changed",
          );
          let pending = await findPendingApproval("employee_handover", exit.id);
          await decideApprovalRequest(
            pending.id,
            pending.approverIds[0] ?? admin.id,
            "rejected",
            "Settlement missing",
          );
          const reopened = await tx.employeeHandover.findUniqueOrThrow({
            where: { id: exit.id },
          });
          assert.deepEqual(
            [reopened.status, reopened.decisionNotes],
            ["open", "Settlement missing"],
          );
          await handovers.submitEmployeeHandover(exit.id, mate1.id);
          await approveAll("employee_handover", exit.id, admin);
          assert.equal(
            (
              await tx.employeeHandover.findUniqueOrThrow({
                where: { id: exit.id },
              })
            ).status,
            "completed",
          );
          assert.equal(
            (
              await tx.employee.findUniqueOrThrow({
                where: { id: employee.id },
              })
            ).status,
            "terminated",
          );
          await rejects(
            handovers.openEmployeeHandover(
              {
                employee_id: employee.id,
                kind: "leave",
                effective_date: "2199-06-01",
              },
              admin.id,
            ),
            "This employee has already left",
          );

          // ---- leave types that need a handover open one when the leave is approved
          const other = await tx.employee.findFirstOrThrow({
            where: { status: "active", id: { not: employee.id } },
          });
          const leaveType = await tx.leaveType.create({
            data: {
              code: `eho_${stamp}`,
              nameEn: "Long leave",
              nameAr: "إجازة طويلة",
              requiresHandover: true,
            },
          });
          const leave = await tx.leaveRequest.create({
            data: {
              employeeId: other.id,
              leaveTypeId: leaveType.id,
              startDate: new Date("2199-07-01"),
              endDate: new Date("2199-07-20"),
              days: 14,
              reason: "Long leave",
              status: "pending",
            },
          });
          // Approving the leave opens the handover through the leave-approved hook.
          await approveLeaveRequest(leave.id, admin.id);
          const opened = await tx.employeeHandover.findUniqueOrThrow({
            where: { leaveRequestId: leave.id },
          });
          assert.equal(opened.kind, "leave");
          assert.equal(
            opened.returnDate.toISOString().slice(0, 10),
            "2199-07-20",
          );
          assert.equal(
            await handovers.openLeaveHandoverIfNeeded(leave.id, admin.id),
            null,
            "only once per leave",
          );
          const notice = await tx.notification.findFirstOrThrow({
            where: {
              entityId: opened.id,
              messageKey: "employeeHandovers.notifications.leaveOpened",
            },
          });
          assert.equal(notice.messageParams.date, "2199-07-01");
          const plain = await tx.leaveRequest.create({
            data: {
              employeeId: other.id,
              leaveTypeId: (
                await tx.leaveType.findUniqueOrThrow({
                  where: { code: "annual" },
                })
              ).id,
              startDate: new Date("2199-08-01"),
              endDate: new Date("2199-08-01"),
              days: 1,
              reason: "Day off",
              status: "approved",
            },
          });
          assert.equal(
            await handovers.openLeaveHandoverIfNeeded(plain.id, admin.id),
            null,
            "ordinary leave needs no handover",
          );
          await handovers.cancelEmployeeHandover(opened.id);
          await rejects(
            handovers.cancelEmployeeHandover(opened.id),
            "This handover can no longer be changed",
          );
          throw rollback;
        }),
      { timeout: 120000 },
    );
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log(
    "Employee handover checks passed and rolled back: cases gathered and reassigned by hand, across a team and to one person, assets returned before submitting, the checklist, rejection back to HR, approval marking the employee as left, and leave handovers opened automatically.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
