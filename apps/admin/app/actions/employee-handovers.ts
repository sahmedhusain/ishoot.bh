"use server";
import { revalidatePath } from "next/cache";
import {
  applyHandoverCases,
  cancelEmployeeHandover,
  createActivityLog,
  measureOperation,
  openEmployeeHandover,
  refreshHandoverCases,
  runAtomicMutation,
  setHandoverCaseMode,
  submitEmployeeHandover,
  updateHandoverChecklist,
  type EmployeeHandoverInput,
} from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { validateActionArguments } from "../../lib/action-input";
import { requirePermission } from "../../lib/auth";

const refresh = (id: string) => {
  revalidatePath(ROUTES.hr.handovers());
  revalidatePath(ROUTES.hr.handover(id));
  revalidatePath(ROUTES.approvals());
};
const log = (
  userId: string,
  id: string,
  action: string,
  details: Record<string, unknown> = {},
) =>
  createActivityLog({
    user_id: userId,
    action,
    entity_type: "employee_handover",
    entity_id: id,
    details,
  });

/** Opens an exit or leave handover for an employee. */
export async function openEmployeeHandoverAction(data: EmployeeHandoverInput) {
  return measureOperation("action:openEmployeeHandoverAction", async () => {
    const user = await requirePermission("employees", "edit");
    validateActionArguments("openEmployeeHandoverAction", { data });
    const handover = await runAtomicMutation(async () => {
      const handover = await openEmployeeHandover(data, user.id);
      await log(user.id, handover.id, "create", {
        reference: handover.reference,
        kind: data.kind,
        employeeId: data.employee_id,
      });
      return handover;
    });
    refresh(handover.id);
    revalidatePath(ROUTES.hr.employee(data.employee_id));
    return { success: true, id: handover.id };
  });
}

export async function setHandoverCaseModeAction(
  handoverId: string,
  data: { mode: string; delegate_user_id?: string; team_user_ids?: string[] },
) {
  return measureOperation("action:setHandoverCaseModeAction", async () => {
    const user = await requirePermission("employees", "edit");
    validateActionArguments("setHandoverCaseModeAction", { handoverId, data });
    await runAtomicMutation(async () => {
      await setHandoverCaseMode(handoverId, data);
      await log(user.id, handoverId, "update", { casesMode: data.mode });
    });
    refresh(handoverId);
    return { success: true };
  });
}

/** Reassigns the pending cases (by the chosen mode, or by the person chosen for each case in manual mode). */
export async function applyHandoverCasesAction(
  handoverId: string,
  choices: Record<string, string> = {},
) {
  return measureOperation("action:applyHandoverCasesAction", async () => {
    const user = await requirePermission("employees", "edit");
    validateActionArguments("applyHandoverCasesAction", {
      handoverId,
      choices,
    });
    const moved = await runAtomicMutation(async () => {
      const moved = await applyHandoverCases(handoverId, user.id, choices);
      await log(user.id, handoverId, "reassign", { moved });
      return moved;
    });
    refresh(handoverId);
    revalidatePath(ROUTES.requests.list);
    return { success: true, moved };
  });
}

export async function refreshHandoverCasesAction(handoverId: string) {
  return measureOperation("action:refreshHandoverCasesAction", async () => {
    await requirePermission("employees", "edit");
    validateActionArguments("refreshHandoverCasesAction", { handoverId });
    await refreshHandoverCases(handoverId);
    refresh(handoverId);
    return { success: true };
  });
}

export async function updateHandoverChecklistAction(
  handoverId: string,
  key: string,
  data: { done: boolean; not_applicable: boolean; note?: string },
) {
  return measureOperation("action:updateHandoverChecklistAction", async () => {
    const user = await requirePermission("employees", "edit");
    validateActionArguments("updateHandoverChecklistAction", {
      handoverId,
      key,
      data,
    });
    await updateHandoverChecklist(handoverId, key, data, user.id);
    refresh(handoverId);
    return { success: true };
  });
}

export async function submitEmployeeHandoverAction(handoverId: string) {
  return measureOperation("action:submitEmployeeHandoverAction", async () => {
    const user = await requirePermission("employees", "edit");
    validateActionArguments("submitEmployeeHandoverAction", { handoverId });
    await runAtomicMutation(async () => {
      await submitEmployeeHandover(handoverId, user.id);
      await log(user.id, handoverId, "submit");
    });
    refresh(handoverId);
    return { success: true };
  });
}

export async function cancelEmployeeHandoverAction(handoverId: string) {
  return measureOperation("action:cancelEmployeeHandoverAction", async () => {
    const user = await requirePermission("employees", "edit");
    validateActionArguments("cancelEmployeeHandoverAction", { handoverId });
    await runAtomicMutation(async () => {
      await cancelEmployeeHandover(handoverId);
      await log(user.id, handoverId, "cancel");
    });
    refresh(handoverId);
    return { success: true };
  });
}
