import { forbidden } from "next/navigation";
import { requirePagePermission } from "../../../../lib/auth";
import { ALL_RESOURCES, ALL_ACTIONS, getStaffRoles, getRoleDataScopes, isDefaultAllowed } from "@platform/database";
import { RolesManagementView } from "../../../../components/settings/RolesManagementView";
import type { RoleWithGrants } from "../../../../types/roles";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("settings/roles");

export default async function RolesSettingsPage() {
  const actor = await requirePagePermission("users", "read");
  // Role design is governance: only super administrators.
  if (actor.role !== "super_admin") forbidden();

  const dbRoles = await getStaffRoles();
  const roles = dbRoles.map((r) => ({
    id: r.id,
    nameEn: r.nameEn || r.id,
    nameAr: r.nameAr || r.id,
    isSystem: r.isSystem,
  }));

  const scopes = await Promise.all(roles.map((role) => getRoleDataScopes(role.id).catch(() => ({}))));
  const enrichedRoles: RoleWithGrants[] = roles.map((role, index) => {
    const grants: Record<string, boolean> = {};
    for (const resource of ALL_RESOURCES) {
      for (const action of ALL_ACTIONS) {
        grants[`${resource}:${action}`] = isDefaultAllowed(role.id as any, resource as any, action as any);
      }
    }
    return {
      id: role.id,
      nameEn: role.nameEn,
      nameAr: role.nameAr,
      isSystem: role.isSystem,
      userCount: 0,
      grants,
      scopes: scopes[index],
    };
  });

  return <RolesManagementView initialRoles={enrichedRoles} />;
}
