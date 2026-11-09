"use server";
import { revalidatePath } from "next/cache";
import {
  applyActivityDepartments,
  createActivityLog,
  deleteDepartment,
  getCompanySettings,
  measureOperation,
  runAtomicMutation,
  saveDepartment,
  type DepartmentInput,
} from "@platform/database";
import {
  isDepartmentKey,
  type DepartmentKey,
} from "@platform/database/constants/departments";
import { ROUTES } from "../../constants/routes";
import { requirePermission } from "../../lib/auth";
import { validateActionArguments } from "../../lib/action-input";

function revalidateDepartments() {
  revalidatePath(ROUTES.settings.departments);
  revalidatePath(ROUTES.users.list);
  revalidatePath(ROUTES.hr.employees);
  revalidatePath(ROUTES.directory);
}

export async function saveDepartmentAction(input: DepartmentInput) {
  return measureOperation("action:saveDepartmentAction", async () => {
    const user = await requirePermission("settings", "edit");
    validateActionArguments("saveDepartmentAction", { input });
    const department = await runAtomicMutation(async () => {
      const saved = await saveDepartment(input);
      await createActivityLog({
        user_id: user.id,
        action: input.id ? "update" : "create",
        entity_type: "department",
        entity_id: saved.id,
        details: { code: saved.code, parentId: saved.parentId },
      });
      return saved;
    });
    revalidateDepartments();
    return { success: true, id: department.id };
  });
}

export async function deleteDepartmentAction(id: string) {
  return measureOperation("action:deleteDepartmentAction", async () => {
    const user = await requirePermission("settings", "edit");
    validateActionArguments("deleteDepartmentAction", { id });
    await runAtomicMutation(async () => {
      await deleteDepartment(id);
      await createActivityLog({
        user_id: user.id,
        action: "delete",
        entity_type: "department",
        entity_id: id,
        details: {},
      });
    });
    revalidateDepartments();
    return { success: true };
  });
}

export async function addCatalogueDepartmentsAction(keys: string[]) {
  return measureOperation("action:addCatalogueDepartmentsAction", async () => {
    const user = await requirePermission("settings", "edit");
    validateActionArguments("addCatalogueDepartmentsAction", { keys });
    const company = await getCompanySettings();
    const picked = keys.filter(isDepartmentKey) as DepartmentKey[];
    await runAtomicMutation(async () => {
      await applyActivityDepartments(
        company.business_activity,
        keys.length ? picked : undefined,
      );
      await createActivityLog({
        user_id: user.id,
        action: "create",
        entity_type: "department",
        entity_id: "catalogue",
        details: { keys: picked },
      });
    });
    revalidateDepartments();
    return { success: true };
  });
}
