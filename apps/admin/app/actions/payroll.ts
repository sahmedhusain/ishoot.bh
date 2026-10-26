"use server";
import { serverMessages } from "@platform/locales";
import { ROUTES } from "../../constants/routes";
import { measureOperation, runAtomicMutation } from "@platform/database";
import { validateActionArguments } from "../../lib/action-input";
import {
  createPayrollRun,
  submitPayrollRunForApproval,
  findPendingApproval,
  decideApprovalRequest,
  markPayrollAsPaid,
  createActivityLog,
  setPayrollItemLines,
  saveRecurringPay,
  deleteRecurringPay,
  type PayLineInput,
  type RecurringPayInput,
  recalculatePayrollRun,
  payPayrollItem,
  recordSupportReimbursement,
} from "@platform/database";
import { revalidatePath } from "next/cache";
import { requireAuth, requirePermission } from "../../lib/auth";

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
  return measureOperation(
    "action:submitPayrollRunForApprovalAction",
    async () => {
      const actor = await requirePermission("payroll", "edit");
      validateActionArguments("submitPayrollRunForApprovalAction", { runId });

      const { approvalRequest } = await runAtomicMutation(async () => {
        const approvalRequest = await submitPayrollRunForApproval(
          runId,
          actor.id,
        );

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
    },
  );
}

export async function approvePayrollRunAction(runId: string) {
  return measureOperation("action:approvePayrollRunAction", async () => {
    // Eligibility comes from the payroll approval policy, enforced by the engine (which also
    // covers fallback approvers without payroll access).
    const actor = await requireAuth();
    validateActionArguments("approvePayrollRunAction", { runId });

    const outcome = await runAtomicMutation(async () => {
      const pending = await findPendingApproval("payroll_run", runId);
      if (!pending)
        throw new Error(serverMessages.thisPayrollRunHasNoPendingApproval);
      const result = await decideApprovalRequest(
        pending.id,
        actor.id,
        "approved",
      );
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

interface PaymentInput {
  method: string;
  reference?: string | null;
  paidOn?: string | null;
}

/** Pays every salary still unpaid in an approved run. */
export async function markPayrollRunPaidAction(
  runId: string,
  payment: PaymentInput = { method: "bank_transfer" },
) {
  return measureOperation("action:markPayrollRunPaidAction", async () => {
    const actor = await requirePermission("payroll", "issue_send");
    validateActionArguments("markPayrollRunPaidAction", { runId, payment });

    const { payrollRun } = await runAtomicMutation(async () => {
      const payrollRun = await markPayrollAsPaid(runId, actor.id, payment);

      await createActivityLog({
        user_id: actor.id,
        action: "mark_paid",
        entity_type: "payroll_run",
        entity_id: runId,
        details: {
          paidAt: new Date().toISOString(),
          method: payment.method,
          reference: payment.reference ?? null,
        },
      });

      return { payrollRun };
    });

    revalidatePath(ROUTES.hr.payroll());
    return { success: true, payrollRun };
  });
}

/** One employee's salary payment, from their payment page. */
export async function payPayrollItemAction(
  itemId: string,
  payment: PaymentInput,
) {
  return measureOperation("action:payPayrollItemAction", async () => {
    const actor = await requirePermission("payroll", "issue_send");
    validateActionArguments("payPayrollItemAction", { itemId, payment });
    const run = await runAtomicMutation(async () => {
      const run = await payPayrollItem(itemId, payment, actor.id);
      await createActivityLog({
        user_id: actor.id,
        action: "mark_paid",
        entity_type: "payroll_item",
        entity_id: itemId,
        details: {
          payrollRunId: run.id,
          method: payment.method,
          reference: payment.reference ?? null,
        },
      });
      return run;
    });
    revalidatePath(ROUTES.hr.payroll());
    return { success: true, runStatus: run.status };
  });
}

/** Recomputes a run that is not yet submitted, after attendance, leave or salary changes. */
export async function recalculatePayrollRunAction(runId: string) {
  return measureOperation("action:recalculatePayrollRunAction", async () => {
    const actor = await requirePermission("payroll", "edit");
    validateActionArguments("recalculatePayrollRunAction", { runId });
    const run = await runAtomicMutation(async () => {
      const run = await recalculatePayrollRun(runId, actor.id);
      await createActivityLog({
        user_id: actor.id,
        action: "recalculate",
        entity_type: "payroll_run",
        entity_id: runId,
        details: { totalNet: run.totalNet },
      });
      return run;
    });
    revalidatePath(ROUTES.hr.payroll());
    return { success: true, totalNet: run.totalNet };
  });
}

/** Add a bonus or deduction (with a reason) to one employee's salary before the run is submitted. */
/** Sets one employee's manual additions and deductions for the month, as separate named lines. */
export async function setPayrollLinesAction(
  itemId: string,
  data: {
    additions: PayLineInput[];
    deductions: PayLineInput[];
    note?: string | null;
  },
) {
  return measureOperation("action:setPayrollLinesAction", async () => {
    const actor = await requirePermission("payroll", "edit");
    validateActionArguments("setPayrollLinesAction", { itemId, data });
    const { item } = await runAtomicMutation(async () => {
      const { item, before, lines } = await setPayrollItemLines(
        itemId,
        data,
        actor.id,
      );
      await createActivityLog({
        user_id: actor.id,
        action: "update",
        entity_type: "payroll_item",
        entity_id: itemId,
        details: {
          payrollRunId: item.payrollRunId,
          employeeId: item.employeeId,
          lines,
          bonus: { from: before.bonus, to: item.bonus },
          otherDeductions: {
            from: before.otherDeductions,
            to: item.otherDeductions,
          },
        },
      });
      return { item };
    });
    revalidatePath(ROUTES.hr.payroll());
    revalidatePath(ROUTES.hr.payrollItem(itemId));
    return { success: true, item };
  });
}

/** Adds or edits a custom addition or deduction an employee receives every month. */
export async function saveRecurringPayAction(
  employeeId: string,
  data: RecurringPayInput,
  recurringId?: string,
) {
  return measureOperation("action:saveRecurringPayAction", async () => {
    const actor = await requirePermission("payroll", "edit");
    validateActionArguments("saveRecurringPayAction", {
      employeeId,
      data,
      recurringId,
    });
    const saved = await runAtomicMutation(async () => {
      const saved = await saveRecurringPay(employeeId, data, recurringId);
      await createActivityLog({
        user_id: actor.id,
        action: recurringId ? "update" : "create",
        entity_type: "recurring_pay",
        entity_id: saved.id,
        details: {
          employeeId,
          kind: saved.kind,
          label: saved.label,
          amount: Number(saved.amount),
        },
      });
      return saved;
    });
    revalidatePath(ROUTES.hr.employee(employeeId));
    return { success: true, id: saved.id };
  });
}

export async function deleteRecurringPayAction(recurringId: string) {
  return measureOperation("action:deleteRecurringPayAction", async () => {
    const actor = await requirePermission("payroll", "edit");
    validateActionArguments("deleteRecurringPayAction", { recurringId });
    const employeeId = await runAtomicMutation(async () => {
      const employeeId = await deleteRecurringPay(recurringId);
      await createActivityLog({
        user_id: actor.id,
        action: "delete",
        entity_type: "recurring_pay",
        entity_id: recurringId,
        details: { employeeId },
      });
      return employeeId;
    });
    revalidatePath(ROUTES.hr.employee(employeeId));
    return { success: true };
  });
}

/** Record money received from a wage-support programme (e.g. Tamkeen) for a six-month claim. */
export async function recordSupportReimbursementAction(input: {
  employeeId: string;
  provider: string;
  periodStart: string;
  receivedAmount: number;
  receivedOn: string;
  reference?: string | null;
}) {
  return measureOperation(
    "action:recordSupportReimbursementAction",
    async () => {
      const actor = await requirePermission("payroll", "edit");
      validateActionArguments("recordSupportReimbursementAction", { input });
      const receipt = await runAtomicMutation(async () => {
        const receipt = await recordSupportReimbursement(input, actor.id);
        await createActivityLog({
          user_id: actor.id,
          action: "create",
          entity_type: "support_reimbursement",
          entity_id: receipt.id,
          details: { ...input },
        });
        return receipt;
      });
      revalidatePath(ROUTES.hr.payroll());
      return { success: true, id: receipt.id };
    },
  );
}
