"use server";
import { revalidatePath } from "next/cache";
import {
  checkPeopleImport,
  createActivityLog,
  getEffectivePermissions,
  importPeople,
  measureOperation,
  PEOPLE_IMPORT_COLUMNS,
  PEOPLE_IMPORT_LIMIT,
  type PeopleImportOptions,
  type PeopleImportRow,
  getStaffRoles,
} from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { getCurrentPermissions, requirePermission } from "../../lib/auth";
import { validateActionArguments } from "../../lib/action-input";

async function importOptions(actor: {
  role: string;
}): Promise<PeopleImportOptions> {
  const own = await getCurrentPermissions();
  const dbRoles = await getStaffRoles();
  const roles = dbRoles.filter((r) => r.id !== "super_admin").map((r) => ({ id: r.id }));
  const assignable: string[] = [];
  for (const role of roles) {
    if (actor.role === "super_admin") assignable.push(role.id);
    else {
      const grants = await getEffectivePermissions(role.id);
      if (
        Object.entries(grants).every(([key, granted]) => !granted || own[key])
      )
        assignable.push(role.id);
    }
  }
  return {
    canSetPay: own["payroll:edit"] === true,
    canCreateAccounts: own["users:write"] === true,
    assignableRoles: assignable,
  };
}

const toRows = (cells: string[][]): PeopleImportRow[] =>
  cells
    .slice(0, PEOPLE_IMPORT_LIMIT)
    .map((row) =>
      Object.fromEntries(
        PEOPLE_IMPORT_COLUMNS.map((column, index) => [
          column,
          row[index] ?? "",
        ]),
      ),
    );

export async function previewPeopleImportAction(rows: string[][]) {
  return measureOperation("action:previewPeopleImportAction", async () => {
    const actor = await requirePermission("employees", "create");
    validateActionArguments("previewPeopleImportAction", { rows });
    return {
      checks: await checkPeopleImport(toRows(rows), await importOptions(actor)),
    };
  });
}

export async function importPeopleAction(rows: string[][]) {
  return measureOperation("action:importPeopleAction", async () => {
    const actor = await requirePermission("employees", "create");
    validateActionArguments("importPeopleAction", { rows });
    const options = await importOptions(actor);
    const result = await importPeople(toRows(rows), actor.id, options);
    await createActivityLog({
      user_id: actor.id,
      action: "create",
      entity_type: "employee",
      entity_id: "import",
      details: result,
    });
    revalidatePath(ROUTES.hr.employees);
    revalidatePath(ROUTES.users.list);
    revalidatePath(ROUTES.directory);
    return { success: true, ...result };
  });
}
