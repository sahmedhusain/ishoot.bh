import { requirePermission } from "../../../lib/auth";
import { getAllUsers,db,ALL_RESOURCES,ALL_ACTIONS } from "@ishoot/database";
import { UsersManagementView } from "../../../components/users/UsersManagementView";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requirePermission("users", "read");
  const [users, roles, grants] = await Promise.all([
    getAllUsers(),
    db.role.findMany({
      select: { id: true, nameEn: true, nameAr: true },
      orderBy: { createdAt: "asc" },
    }),
    db.permission.findMany({
      select: { role: true, resource: true, action: true, allowed: true },
    }),
  ]);
  const rolePermissions: Record<string, Record<string, boolean>> = {};
  for (const role of roles) {
    rolePermissions[role.id] = Object.fromEntries(
      ALL_RESOURCES.flatMap((resource) =>
        ALL_ACTIONS.map((action) => [
          `${resource}:${action}`,
          role.id === "super_admin",
        ]),
      ),
    );
  }
  for (const grant of grants)
    if (rolePermissions[grant.role] && grant.role !== "super_admin")
      rolePermissions[grant.role][`${grant.resource}:${grant.action}`] =
        grant.allowed;
  return (
    <UsersManagementView
      initialUsers={users}
      roles={roles}
      resources={ALL_RESOURCES}
      rolePermissions={rolePermissions}
    />
  );
}
