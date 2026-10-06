import { requirePagePermission, hasPermission } from "../../../lib/auth";
import { getAllUsers, db, ALL_RESOURCES, ALL_ACTIONS } from "@ishoot/database";
import { UsersManagementView } from "../../../components/users/UsersManagementView";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requirePagePermission("users", "read");
  const [canWrite, canDelete, canCreateEmployees] = await Promise.all([
    hasPermission("users", "write"),
    hasPermission("users", "delete"),
    hasPermission("employees", "create"),
  ]);
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
  const employees = await db.employee.findMany({
    where: { userId: null, status: { in: ["active", "on_leave"] } },
    select: {
      id: true,
      employeeNumber: true,
      firstNameEn: true,
      lastNameEn: true,
      email: true,
    },
    orderBy: { employeeNumber: "asc" },
  });
  return (
    <UsersManagementView
      canWrite={canWrite}
      canDelete={canDelete}
      canCreateEmployees={canCreateEmployees}
      employees={employees}
      initialUsers={users}
      roles={roles}
      resources={[...ALL_RESOURCES]}
      rolePermissions={rolePermissions}
    />
  );
}
