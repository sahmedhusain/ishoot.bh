"use server";
import { serverMessages } from "@platform/locales";
import { ROUTES } from "../../constants/routes";
import { measureOperation } from "@platform/database";
import { validateActionArguments } from "../../lib/action-input";

import { requirePermission } from "../../lib/auth";
import {
  ALL_RESOURCES,
  ALL_ACTIONS,
  setRoleDataScopes,
  createActivityLog,
} from "@platform/database";
import { revalidatePath } from "next/cache";

export async function upsertRoleAction(data: {
  id?: string;
  nameEn: string;
  nameAr: string;
  grants: Record<string, boolean>;
  scopes?: Record<string, string>;
}) {
  return measureOperation("action:upsertRoleAction", async () => {
    const actor = await requirePermission("users", "write");
    validateActionArguments("upsertRoleAction", { data });
    if (actor.role !== "super_admin")
      throw new Error(
        serverMessages.onlySuperAdministratorsCanManageRolePermissions,
      );
    if (
      !data ||
      typeof data.nameEn !== "string" ||
      !data.nameEn.trim() ||
      data.nameEn.length > 100 ||
      typeof data.nameAr !== "string" ||
      !data.nameAr.trim() ||
      data.nameAr.length > 100 ||
      !data.grants ||
      typeof data.grants !== "object" ||
      Array.isArray(data.grants)
    )
      throw new Error(serverMessages.invalidRole);
    const validKeys = new Set(
      ALL_RESOURCES.flatMap((resource) =>
        ALL_ACTIONS.map((action) => `${resource}:${action}`),
      ),
    );
    for (const [key, allowed] of Object.entries(data.grants)) {
      if (!validKeys.has(key) || key.endsWith(":write"))
        throw new Error(serverMessages.invalidPermissionResource);
      if (typeof allowed !== "boolean")
        throw new Error(serverMessages.invalidPermissionValue);
    }
    await createActivityLog({
      user_id: actor.id,
      action: "update",
      entity_type: "role",
      entity_id: data.id || "new_role",
      details: { nameEn: data.nameEn, nameAr: data.nameAr },
    });
    if (data.scopes && data.id !== "super_admin")
      await setRoleDataScopes(data.id || "new_role", data.scopes);
    revalidatePath(ROUTES.home, "layout");
    return { success: true };
  });
}

export async function deleteRoleAction(id: string) {
  return measureOperation("action:deleteRoleAction", async () => {
    const actor = await requirePermission("users", "delete");
    validateActionArguments("deleteRoleAction", { id });
    if (actor.role !== "super_admin")
      throw new Error(serverMessages.onlySuperAdministratorsCanManageRoles);
    if (id === "super_admin" || id === "admin")
      throw new Error(serverMessages.cannotDeleteSystemRoles);
    await createActivityLog({
      user_id: actor.id,
      action: "delete",
      entity_type: "role",
      entity_id: id,
    });
    revalidatePath(ROUTES.home, "layout");
    return { success: true };
  });
}
