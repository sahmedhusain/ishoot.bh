"use server";
import { measureOperation, runAtomicMutation } from "@ishoot/database";
import { validateActionArguments } from "../../lib/action-input";
import {
  createPayrollRun,
  submitPayrollRunForApproval,
  approvePayrollRun,
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

    revalidatePath("/dashboard/hr/payroll");
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

    revalidatePath("/dashboard/hr/payroll");
    revalidatePath("/dashboard/approvals");
    return { success: true, approvalRequest };
  });
}

export async function approvePayrollRunAction(runId: string) {
  return measureOperation("action:approvePayrollRunAction", async () => {
    const actor = await requirePermission("payroll", "approve");
    validateActionArguments("approvePayrollRunAction", { runId });

    const { payrollRun } = await runAtomicMutation(async () => {
      const payrollRun = await approvePayrollRun(runId, actor.id);

      await createActivityLog({
        user_id: actor.id,
        action: "approve",
        entity_type: "payroll_run",
        entity_id: runId,
        details: { totalNet: payrollRun.totalNet },
      });

      return { payrollRun };
    });

    revalidatePath("/dashboard/hr/payroll");
    revalidatePath("/dashboard/approvals");
    return { success: true, payrollRun };
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

    revalidatePath("/dashboard/hr/payroll");
    return { success: true, payrollRun };
  });
}
