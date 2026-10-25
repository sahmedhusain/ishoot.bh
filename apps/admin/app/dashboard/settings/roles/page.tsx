import { forbidden } from "next/navigation";
import { requirePagePermission } from "../../../../lib/auth";
import { db, ALL_RESOURCES, ALL_ACTIONS, ensureRoleTemplates, getRoleDataScopes, resolveGrant } from "@platform/database";
import { RolesManagementView } from "../../../../components/settings/RolesManagementView";
import type { RoleWithGrants } from "../../../../types/roles";

export default async function RolesSettingsPage() {
  const actor = await requirePagePermission("users", "read");
  // Role design is governance: only super administrators.
  if (actor.role !== "super_admin") forbidden();

  await ensureRoleTemplates();
  const [roles, userCounts, permissions] = await Promise.all([
    db.role.findMany({ orderBy: { createdAt: "asc" } }),
    db.user.groupBy({ by: ["role"], _count: { id: true } }),
    db.permission.findMany({ select: { role: true, resource: true, action: true, allowed: true } }),
  ]);

  const countMap = new Map(userCounts.map((u) => [u.role, u._count.id]));
  const stored = new Map(permissions.map((p) => [`${p.role}|${p.resource}:${p.action}`, p.allowed]));

  const scopes = await Promise.all(roles.map((role) => getRoleDataScopes(role.id)));
  const enrichedRoles: RoleWithGrants[] = roles.map((role, index) => {
    const grants: Record<string, boolean> = {};
    for (const resource of ALL_RESOURCES) {
      for (const action of ALL_ACTIONS) {
        // The same rule getEffectivePermissions applies.
        grants[`${resource}:${action}`] = resolveGrant(role.id, resource, action, (res, act) => stored.get(`${role.id}|${res}:${act}`));
      }
    }
    return {
      id: role.id,
      nameEn: role.nameEn,
      nameAr: role.nameAr,
      isSystem: role.isSystem,
      userCount: countMap.get(role.id) ?? 0,
      grants,
      scopes: scopes[index],
    };
  });

  return <RolesManagementView initialRoles={enrichedRoles} />;
}
