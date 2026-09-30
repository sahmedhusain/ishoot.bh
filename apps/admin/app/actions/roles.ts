"use server";

import { requireAuth, requirePermission } from "../../lib/auth";
import { db } from "@ishoot/database";
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
  }[];
}) {
  await requirePermission("users", "write");

  const { id, nameEn, nameAr, permissions } = data;
  let roleId = id;

  if (id) {
    const existing = await db.role.findUnique({ where: { id } });
    if (!existing) throw new Error("Role not found");

    await db.role.update({
      where: { id },
      data: { nameEn, nameAr },
    });
  } else {
    // Basic ID generation for custom roles
    const newId = `custom_${Date.now()}`;
    roleId = newId;
    await db.role.create({
      data: {
        id: newId,
        nameEn,
        nameAr,
        isSystem: false,
      },
    });
  }

  // Replace permissions in the Permission table which requires (role, resource, action, allowed)
  if (roleId) {
    await db.permission.deleteMany({ where: { role: roleId } });

    if (permissions.length > 0) {
      const dbPerms = permissions.flatMap((p) => {
        const rules: { role: string; resource: string; action: string; allowed: boolean }[] = [];
        if (p.canRead) rules.push({ role: roleId!, resource: p.module, action: "read", allowed: true });
        if (p.canWrite) rules.push({ role: roleId!, resource: p.module, action: "write", allowed: true });
        if (p.canDelete) rules.push({ role: roleId!, resource: p.module, action: "delete", allowed: true });
        if (p.canApprove) rules.push({ role: roleId!, resource: p.module, action: "approve", allowed: true });
        return rules;
      });

      if (dbPerms.length > 0) {
        await db.permission.createMany({ data: dbPerms });
      }
    }
  }

  revalidatePath("/dashboard/settings/roles");
  return { success: true };
}

export async function deleteRoleAction(id: string) {
  await requirePermission("users", "delete");

  const role = await db.role.findUnique({ where: { id } });
  if (!role) throw new Error("Role not found");
  if (role.isSystem) throw new Error("Cannot delete system roles");

  const assignedUsersCount = await db.user.count({ where: { role: id } });
  if (assignedUsersCount > 0) {
    throw new Error("Cannot delete role currently assigned to users");
  }

  await db.permission.deleteMany({ where: { role: id } });
  await db.role.delete({ where: { id } });

  revalidatePath("/dashboard/settings/roles");
  return { success: true };
}
