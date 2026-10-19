"use server";
import { revalidatePath } from "next/cache";
import {
  createActivityLog,
  deleteEmployeeCredential,
  measureOperation,
  runAtomicMutation,
  saveEmployeeCredential,
  updateEmployeeIdentity,
  type EmployeeCredentialInput,
  type EmployeeIdentityInput,
} from "@ishoot/database";
import { ROUTES } from "../../constants/routes";
import { validateActionArguments } from "../../lib/action-input";
import { requirePermission } from "../../lib/auth";

/** Nationality, date of birth, CPR and passport details of an employee. */
export async function updateEmployeeIdentityAction(
  employeeId: string,
  data: EmployeeIdentityInput,
) {
  return measureOperation("action:updateEmployeeIdentityAction", async () => {
    const actor = await requirePermission("employees", "edit");
    validateActionArguments("updateEmployeeIdentityAction", {
      employeeId,
      data,
    });
    await runAtomicMutation(async () => {
      await updateEmployeeIdentity(employeeId, data);
      await createActivityLog({
        user_id: actor.id,
        action: "update",
        entity_type: "employee",
        entity_id: employeeId,
        details: { section: "identity", fields: Object.keys(data) },
      });
    });
    revalidatePath(ROUTES.hr.employee(employeeId));
    return { success: true };
  });
}

/** Adds or edits a visa, permit, licence, insurance or other document of an employee, with its cost. */
export async function saveEmployeeCredentialAction(
  employeeId: string,
  data: EmployeeCredentialInput,
  credentialId?: string,
) {
  return measureOperation("action:saveEmployeeCredentialAction", async () => {
    const actor = await requirePermission("employees", "edit");
    validateActionArguments("saveEmployeeCredentialAction", {
      employeeId,
      data,
      credentialId,
    });
    const saved = await runAtomicMutation(async () => {
      const saved = await saveEmployeeCredential(
        employeeId,
        { ...data, id: credentialId },
        actor.id,
      );
      await createActivityLog({
        user_id: actor.id,
        action: credentialId ? "update" : "create",
        entity_type: "employee_credential",
        entity_id: saved.id,
        details: {
          employeeId,
          kind: saved.kind,
          expiryDate: saved.expiryDate?.toISOString().slice(0, 10) ?? null,
        },
      });
      return saved;
    });
    revalidatePath(ROUTES.hr.employee(employeeId));
    return { success: true, id: saved.id };
  });
}

export async function deleteEmployeeCredentialAction(credentialId: string) {
  return measureOperation("action:deleteEmployeeCredentialAction", async () => {
    const actor = await requirePermission("employees", "edit");
    validateActionArguments("deleteEmployeeCredentialAction", { credentialId });
    const employeeId = await runAtomicMutation(async () => {
      const employeeId = await deleteEmployeeCredential(credentialId);
      await createActivityLog({
        user_id: actor.id,
        action: "delete",
        entity_type: "employee_credential",
        entity_id: credentialId,
        details: { employeeId },
      });
      return employeeId;
    });
    revalidatePath(ROUTES.hr.employee(employeeId));
    return { success: true };
  });
}
