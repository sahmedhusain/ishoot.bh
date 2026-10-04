"use server";
import { measureOperation } from "@ishoot/database";
import { validateActionArguments } from "../../lib/action-input";

import { requirePermission } from "../../lib/auth";
import { db, ALL_RESOURCES, ALL_ACTIONS } from "@ishoot/database";
import { revalidatePath } from "next/cache";

export async function upsertRoleAction(data: {
  id?: string;
  nameEn: string;
  nameAr: string;
  permissions: {
    module: string;
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
    canApprove: boolean;
    canExport?: boolean;
  }[];
}) {
  return measureOperation("action:upsertRoleAction", async () => {
    const actor = await requirePermission("users", "write");
    validateActionArguments("upsertRoleAction", { data });
    if (actor.role !== "super_admin")
      throw new Error("Only super administrators can manage role permissions");
    if (
      !data ||
      typeof data.nameEn !== "string" ||
      !data.nameEn.trim() ||
      data.nameEn.length > 100 ||
      typeof data.nameAr !== "string" ||
      !data.nameAr.trim() ||
      data.nameAr.length > 100 ||
      !Array.isArray(data.permissions)
    )
      throw new Error("Invalid role");
    const actionFields: Record<string, string> = {
      read: "canRead",
      write: "canWrite",
      delete: "canDelete",
      approve: "canApprove",
      export: "canExport",
      create: "canCreate",
      edit: "canEdit",
      assign: "canAssign",
      issue_send: "canIssueSend",
      manage_permissions: "canManagePermissions",
      reset_credentials: "canResetCredentials",
    };
    const coreFields = ["canRead", "canWrite", "canDelete", "canApprove", "canExport"] as const;
    const submitted = new Map<string, (typeof data.permissions)[number]>();
    for (const permission of data.permissions) {
      if (
        !permission ||
        !ALL_RESOURCES.includes(permission.module as any) ||
        submitted.has(permission.module)
      )
        throw new Error("Invalid permission resource");
      for (const field of coreFields) {
        if (typeof (permission as any)[field] !== "boolean")
          throw new Error("Invalid permission value");
      }
      submitted.set(permission.module, permission);
    }
    await db.$transaction(async (tx) => {
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
      await tx.permission.deleteMany({ where: { role: role.id } });
      await tx.permission.createMany({
        data: ALL_RESOURCES.flatMap((resource) =>
          ALL_ACTIONS.map((action) => {
            let allowed = false;
            if (role.id === "super_admin") {
              allowed = true;
            } else if ((resource === "invoices" || resource === "quotations" || resource === "payroll") && action === "approve") {
              allowed = false;
            } else {
              const perm = submitted.get(resource) as any;
              const field = actionFields[action];
              if (perm && field && typeof perm[field] === "boolean") {
                allowed = perm[field];
              } else if (perm && (action === "create" || action === "edit")) {
                allowed = perm.canWrite === true;
              }
            }
            return {
              role: role.id,
              resource,
              action,
              allowed,
            };
          }),
        ),
      });
      await tx.activityLog.create({
        data: {
          userId: actor.id,
          action: "update",
          entityType: "role",
          entityId: role.id,
        },
      });
    });
    revalidatePath("/dashboard", "layout");
    return { success: true };
  });
}

export async function deleteRoleAction(id: string) {
  return measureOperation("action:deleteRoleAction", async () => {
    const actor = await requirePermission("users", "delete");
    validateActionArguments("deleteRoleAction", { id });
    if (actor.role !== "super_admin")
      throw new Error("Only super administrators can manage roles");
    await db.$transaction(async (tx) => {
      const role = await tx.role.findUnique({ where: { id } });
      if (!role) throw new Error("Role not found");
      if (role.isSystem || id === "super_admin")
        throw new Error("Cannot delete system roles");
      if (await tx.user.count({ where: { role: id } }))
        throw new Error("Cannot delete role currently assigned to users");
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
    revalidatePath("/dashboard", "layout");
    return { success: true };
  });
}
