"use server";
import { ROUTES } from "../../constants/routes";
import { measureOperation, runAtomicMutation } from "@ishoot/database";
import { validateActionArguments } from "../../lib/action-input";
import {
  createPayrollRun,
  submitPayrollRunForApproval,
  findPendingApproval,
  decideApprovalRequest,
  markPayrollAsPaid,
  createActivityLog,
} from "@ishoot/database";
import { revalidatePath } from "next/cache";
import { requirePermission } from "../../lib/auth";

export async function generatePayrollRunAction(month: number, year: number) {
  return measureOperation("action:generatePayrollRunAction", async () => {
    const actor = await requirePermission("payroll", "create");
    validateActionArguments("generatePayrollRunAction", { month, year });

    const { payrollRun } = await runAtomicMutation(async () => {
      const payrollRun = await createPayrollRun(month, year, actor.id);

      await createActivityLog({
        user_id: actor.id,
        action: "create",
        entity_type: "payroll_run",
        entity_id: payrollRun.id,
        details: { month, year, totalNet: payrollRun.totalNet },
      });

      return { payrollRun };
    });

    revalidatePath(ROUTES.hr.payroll());
    return { success: true, payrollRun };
  });
}

export async function submitPayrollRunForApprovalAction(runId: string) {
  return measureOperation("action:submitPayrollRunForApprovalAction", async () => {
    const actor = await requirePermission("payroll", "edit");
    validateActionArguments("submitPayrollRunForApprovalAction", { runId });

    const { approvalRequest } = await runAtomicMutation(async () => {
      const approvalRequest = await submitPayrollRunForApproval(runId, actor.id);

      await createActivityLog({
        user_id: actor.id,
        action: "submit_approval",
        entity_type: "payroll_run",
        entity_id: runId,
        details: { approvalRequestId: approvalRequest.approvalRequestId },
      });

      return { approvalRequest };
    });

    revalidatePath(ROUTES.hr.payroll());
    revalidatePath(ROUTES.approvals());
    return { success: true, approvalRequest };
  });
}

export async function approvePayrollRunAction(runId: string) {
  return measureOperation("action:approvePayrollRunAction", async () => {
    // Eligibility comes from the payroll approval policy, enforced by the engine.
    const actor = await requirePermission("payroll", "read");
    validateActionArguments("approvePayrollRunAction", { runId });

    const outcome = await runAtomicMutation(async () => {
      const pending = await findPendingApproval("payroll_run", runId);
      if (!pending) throw new Error("This payroll run has no pending approval");
      const result = await decideApprovalRequest(pending.id, actor.id, "approved");
      await createActivityLog({
        user_id: actor.id,
        action: "approve",
        entity_type: "payroll_run",
        entity_id: runId,
        details: { approvalRequestId: pending.id, status: result.status },
      });
      return result;
    });

    revalidatePath(ROUTES.hr.payroll());
    revalidatePath(ROUTES.approvals());
    return { success: true, status: outcome.status };
  });
}

export async function markPayrollRunPaidAction(runId: string) {
  return measureOperation("action:markPayrollRunPaidAction", async () => {
    const actor = await requirePermission("payroll", "edit");
    validateActionArguments("markPayrollRunPaidAction", { runId });

    const { payrollRun } = await runAtomicMutation(async () => {
      const payrollRun = await markPayrollAsPaid(runId, actor.id);

      await createActivityLog({
        user_id: actor.id,
        action: "mark_paid",
        entity_type: "payroll_run",
        entity_id: runId,
        details: { paidAt: new Date().toISOString() },
      });

      return { payrollRun };
    });

    revalidatePath(ROUTES.hr.payroll());
    return { success: true, payrollRun };
  });
}
