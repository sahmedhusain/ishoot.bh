import { requirePagePermission, hasPermission } from "../../../lib/auth";
import { getAllUsers, getDepartmentTree, db, ALL_RESOURCES, ALL_ACTIONS, ensureRoleTemplates, resolveGrant } from "@platform/database";
import { UsersManagementView } from "../../../components/users/UsersManagementView";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requirePagePermission("users", "read");
  const [canWrite, canDelete, canCreateEmployees] = await Promise.all([
    hasPermission("users", "write"),
    hasPermission("users", "delete"),
    hasPermission("employees", "create"),
  ]);
  await ensureRoleTemplates();
  const [users, roles, grants, departments] = await Promise.all([
    getAllUsers(),
    db.role.findMany({
      select: { id: true, nameEn: true, nameAr: true },
      orderBy: { createdAt: "asc" },
    }),
    db.permission.findMany({
      select: { role: true, resource: true, action: true, allowed: true },
    }),
    getDepartmentTree(),
  ]);
  const stored = new Map(grants.map((g) => [`${g.role}|${g.resource}:${g.action}`, g.allowed]));
  const rolePermissions: Record<string, Record<string, boolean>> = Object.fromEntries(
    roles.map((role) => [
      role.id,
      Object.fromEntries(
        ALL_RESOURCES.flatMap((resource) =>
          ALL_ACTIONS.map((action) => [`${resource}:${action}`, resolveGrant(role.id, resource, action, (res, act) => stored.get(`${role.id}|${res}:${act}`))]),
        ),
      ),
    ]),
  );
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
      departments={departments.filter((d) => d.is_active)}
    />
  );
}
