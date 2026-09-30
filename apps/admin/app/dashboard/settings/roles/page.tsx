import * as React from "react";
import { requirePermission } from "../../../../lib/auth";
import { db } from "@ishoot/database";
import { RolesManagementView } from "../../../../components/settings/RolesManagementView";

export default async function RolesSettingsPage() {
  await requirePermission("settings", "read");

  const [roles, userCounts, permissions] = await Promise.all([
    db.role.findMany({
      orderBy: { createdAt: "asc" },
    }),
    db.user.groupBy({
      by: ["role"],
      _count: { id: true },
    }),
    db.permission.findMany(),
  ]);

  const countMap = new Map(userCounts.map((u) => [u.role, u._count.id]));

  const rolePermMap = new Map<
    string,
    Record<
      string,
      {
        module: string;
        canRead: boolean;
        canWrite: boolean;
        canDelete: boolean;
        canApprove: boolean;
      }
    >
  >();

  for (const p of permissions) {
    if (!rolePermMap.has(p.role)) {
      rolePermMap.set(p.role, {});
    }
    const roleRecord = rolePermMap.get(p.role)!;
    if (!roleRecord[p.resource]) {
      roleRecord[p.resource] = {
        module: p.resource,
        canRead: false,
        canWrite: false,
        canDelete: false,
        canApprove: false,
      };
    }
    if (p.action === "read" && p.allowed) roleRecord[p.resource].canRead = true;
    if (p.action === "write" && p.allowed) roleRecord[p.resource].canWrite = true;
    if (p.action === "delete" && p.allowed) roleRecord[p.resource].canDelete = true;
    if (p.action === "approve" && p.allowed) roleRecord[p.resource].canApprove = true;
  }

  const enrichedRoles = roles.map((role) => ({
    ...role,
    _count: {
      users: countMap.get(role.id) ?? 0,
    },
    permissions: Object.values(rolePermMap.get(role.id) || {}),
  }));

  return <RolesManagementView initialRoles={enrichedRoles as any} />;
}
