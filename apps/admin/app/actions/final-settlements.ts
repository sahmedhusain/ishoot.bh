"use server";
import { revalidatePath } from "next/cache";
import {
  cancelFinalSettlement,
  createActivityLog,
  createFinalSettlement,
  measureOperation,
  payFinalSettlement,
  recalculateFinalSettlement,
  runAtomicMutation,
  setFinalSettlementManualLines,
  signFinalSettlementAsEmployee,
  submitFinalSettlement,
  updateSettlementRules,
  type FinalSettlementInput,
  type GratuityRules,
  type SettlementManualLine,
} from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { validateActionArguments } from "../../lib/action-input";
import { requirePermission } from "../../lib/auth";

const refresh = (id?: string) => {
  revalidatePath(ROUTES.hr.settlements());
  if (id) revalidatePath(ROUTES.hr.settlement(id));
  revalidatePath(ROUTES.approvals());
};

export async function createFinalSettlementAction(input: FinalSettlementInput) {
  return measureOperation("action:createFinalSettlementAction", async () => {
    const actor = await requirePermission("payroll", "create");
    validateActionArguments("createFinalSettlementAction", { input });
    const created = await runAtomicMutation(async () => {
      const created = await createFinalSettlement(input, actor.id);
      await createActivityLog({
        user_id: actor.id,
        action: "create",
        entity_type: "final_settlement",
        entity_id: created.id,
        details: {
          employeeId: input.employee_id,
          lastWorkingDay: input.last_working_day,
          reason: input.reason,
        },
      });
      return created;
    });
    refresh(created.id);
    return { success: true, id: created.id };
  });
}

export async function recalculateFinalSettlementAction(
  id: string,
  input?: { last_working_day?: string; reason?: string; notes?: string | null },
) {
  return measureOperation(
    "action:recalculateFinalSettlementAction",
    async () => {
      const actor = await requirePermission("payroll", "edit");
      validateActionArguments("recalculateFinalSettlementAction", {
        id,
        input,
      });
      await runAtomicMutation(async () => {
        await recalculateFinalSettlement(id, input);
        await createActivityLog({
          user_id: actor.id,
          action: "recalculate",
          entity_type: "final_settlement",
          entity_id: id,
          details: { ...(input ?? {}) },
        });
      });
      refresh(id);
      return { success: true };
    },
  );
}

export async function setFinalSettlementLinesAction(
  id: string,
  lines: SettlementManualLine[],
) {
  return measureOperation("action:setFinalSettlementLinesAction", async () => {
    const actor = await requirePermission("payroll", "edit");
    validateActionArguments("setFinalSettlementLinesAction", { id, lines });
    await runAtomicMutation(async () => {
      await setFinalSettlementManualLines(id, lines);
      await createActivityLog({
        user_id: actor.id,
        action: "update_lines",
        entity_type: "final_settlement",
        entity_id: id,
        details: { lines: lines.length },
      });
    });
    refresh(id);
    return { success: true };
  });
}

export async function submitFinalSettlementAction(id: string) {
  return measureOperation("action:submitFinalSettlementAction", async () => {
    const actor = await requirePermission("payroll", "edit");
    validateActionArguments("submitFinalSettlementAction", { id });
    const outcome = await runAtomicMutation(async () => {
      const outcome = await submitFinalSettlement(id, actor.id);
      await createActivityLog({
        user_id: actor.id,
        action: "submit_approval",
        entity_type: "final_settlement",
        entity_id: id,
        details: { status: outcome.status },
      });
      return outcome;
    });
    refresh(id);
    return { success: true, status: outcome.status };
  });
}

export async function cancelFinalSettlementAction(id: string) {
  return measureOperation("action:cancelFinalSettlementAction", async () => {
    const actor = await requirePermission("payroll", "edit");
    validateActionArguments("cancelFinalSettlementAction", { id });
    await runAtomicMutation(async () => {
      await cancelFinalSettlement(id);
      await createActivityLog({
        user_id: actor.id,
        action: "cancel",
        entity_type: "final_settlement",
        entity_id: id,
      });
    });
    refresh(id);
    return { success: true };
  });
}

export async function signFinalSettlementAction(
  id: string,
  input: { signature: string; signer_name: string },
) {
  return measureOperation("action:signFinalSettlementAction", async () => {
    const actor = await requirePermission("payroll", "edit");
    validateActionArguments("signFinalSettlementAction", { id, input });
    await runAtomicMutation(async () => {
      await signFinalSettlementAsEmployee(id, input);
      await createActivityLog({
        user_id: actor.id,
        action: "sign_in_person",
        entity_type: "final_settlement",
        entity_id: id,
        details: { signerName: input.signer_name },
      });
    });
    refresh(id);
    return { success: true };
  });
}

export async function payFinalSettlementAction(
  id: string,
  input: { method: string; reference?: string | null; paid_on?: string | null },
) {
  return measureOperation("action:payFinalSettlementAction", async () => {
    const actor = await requirePermission("payroll", "issue_send");
    validateActionArguments("payFinalSettlementAction", { id, input });
    await runAtomicMutation(async () => {
      await payFinalSettlement(id, input, actor.id);
      await createActivityLog({
        user_id: actor.id,
        action: "pay",
        entity_type: "final_settlement",
        entity_id: id,
        details: { method: input.method },
      });
    });
    refresh(id);
    revalidatePath(ROUTES.hr.employees);
    return { success: true };
  });
}

export async function updateSettlementRulesAction(input: {
  gratuity: GratuityRules;
  leaveEncashmentBase: "basic" | "fixed";
}) {
  return measureOperation("action:updateSettlementRulesAction", async () => {
    const actor = await requirePermission("payroll", "edit");
    validateActionArguments("updateSettlementRulesAction", { input });
    await runAtomicMutation(async () => {
      const rules = await updateSettlementRules(input, actor.id);
      await createActivityLog({
        user_id: actor.id,
        action: "update",
        entity_type: "settlement_rules",
        entity_id: "default",
        details: { ...rules },
      });
    });
    refresh();
    return { success: true };
  });
}
