import { requirePagePermission, hasPermission } from "../../../lib/auth";
import { getUsersPage, getDepartmentTree, db, ALL_RESOURCES, ALL_ACTIONS, ensureRoleTemplates, resolveGrant } from "@platform/database";
import { UsersManagementView } from "../../../components/users/UsersManagementView";

export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePagePermission("users", "read");
  const [canWrite, canDelete, canCreateEmployees] = await Promise.all([
    hasPermission("users", "write"),
    hasPermission("users", "delete"),
    hasPermission("employees", "create"),
  ]);
  await ensureRoleTemplates();
  const query = await searchParams;
  const text = (key: string) => (typeof query[key] === "string" ? (query[key] as string) : undefined);
  const [result, roles, grants, departments, people] = await Promise.all([
    getUsersPage({ q: text("q"), role: text("role"), departmentId: text("departmentId"), status: text("status"), page: Number(text("page")) || 1 }),
    db.role.findMany({
      select: { id: true, nameEn: true, nameAr: true },
      orderBy: { createdAt: "asc" },
    }),
    db.permission.findMany({
      select: { role: true, resource: true, action: true, allowed: true },
    }),
    getDepartmentTree(),
    db.user.findMany({ where: { isActive: true, archivedAt: null }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" }, take: 5000 }),
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
      initialUsers={result.items}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      filters={result.filters}
      people={people}
      roles={roles}
      resources={[...ALL_RESOURCES]}
      rolePermissions={rolePermissions}
      departments={departments.filter((d) => d.is_active)}
    />
  );
}
