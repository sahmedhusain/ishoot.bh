"use server";
import { serverMessages } from "@platform/locales";
import { ROUTES } from "../../constants/routes";
import { measureOperation } from "@platform/database";
import { validateActionArguments } from "../../lib/action-input";

import { requirePermission } from "../../lib/auth";
import {
  db,
  ALL_RESOURCES,
  ALL_ACTIONS,
  setRoleDataScopes,
} from "@platform/database";
import { revalidatePath } from "next/cache";

/**
 * Saves a role and the permission cells that changed. Cells that are not submitted keep their stored value,
 * so the Roles screen can never silently revoke permissions it does not display.
 */
export async function upsertRoleAction(data: {
  id?: string;
  nameEn: string;
  nameAr: string;
  grants: Record<string, boolean>;
  /** Which records the role sees per area (constants/data-scope.ts): "own", "department" or "all". */
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
    const saved = await db.$transaction(async (tx) => {
      const role = data.id
        ? await tx.role.update({
            where: { id: data.id },
            data: { nameEn: data.nameEn.trim(), nameAr: data.nameAr.trim() },
          })
        : await tx.role.create({
            data: {
              nameEn: data.nameEn.trim(),
              nameAr: data.nameAr.trim(),
              isSystem: false,
            },
          });
      const isSuperAdmin = role.id === "super_admin";
      const stored = new Map<string, boolean>(
        (
          await tx.permission.findMany({
            where: { role: role.id },
            select: { resource: true, action: true, allowed: true },
          })
        ).map((p) => [`${p.resource}:${p.action}`, p.allowed]),
      );
      const desired = new Map<string, boolean>();
      for (const [key, allowed] of Object.entries(data.grants))
        desired.set(key, isSuperAdmin || allowed);
      // Legacy "write" grant mirrors create/edit so older checks stay consistent.
      for (const resource of ALL_RESOURCES) {
        const create =
          desired.get(`${resource}:create`) ?? stored.get(`${resource}:create`);
        const edit =
          desired.get(`${resource}:edit`) ?? stored.get(`${resource}:edit`);
        if (
          desired.has(`${resource}:create`) ||
          desired.has(`${resource}:edit`)
        )
          desired.set(
            `${resource}:write`,
            isSuperAdmin || create === true || edit === true,
          );
      }
      if (isSuperAdmin) validKeys.forEach((key) => desired.set(key, true));
      const changes: Array<{ key: string; from: boolean | null; to: boolean }> =
        [];
      for (const [key, allowed] of Array.from(desired)) {
        const before = stored.get(key);
        if (before === allowed) continue;
        const [resource, action] = key.split(":");
        await tx.permission.upsert({
          where: { role_resource_action: { role: role.id, resource, action } },
          update: { allowed },
          create: { role: role.id, resource, action, allowed },
        });
        changes.push({ key, from: before ?? null, to: allowed });
      }
      await tx.activityLog.create({
        data: {
          userId: actor.id,
          action: "update",
          entityType: "role",
          entityId: role.id,
          diffPayload: { changes, scopes: data.scopes ?? null },
        },
      });
      return role;
    });
    if (data.scopes && saved.id !== "super_admin")
      await setRoleDataScopes(saved.id, data.scopes);
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
    await db.$transaction(async (tx) => {
      const role = await tx.role.findUnique({ where: { id } });
      if (!role) throw new Error(serverMessages.roleNotFound);
      if (role.isSystem || id === "super_admin")
        throw new Error(serverMessages.cannotDeleteSystemRoles);
      if (await tx.user.count({ where: { role: id } }))
        throw new Error(
          serverMessages.cannotDeleteRoleCurrentlyAssignedToUsers,
        );
      await tx.permission.deleteMany({ where: { role: id } });
      await tx.role.delete({ where: { id } });
      await tx.activityLog.create({
        data: {
          userId: actor.id,
          action: "delete",
          entityType: "role",
          entityId: id,
        },
      });
    });
    revalidatePath(ROUTES.home, "layout");
    return { success: true };
  });
}
