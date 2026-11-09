import { requirePagePermission, hasPermission } from "../../../lib/auth";
import { getUsersPage, getDepartmentTree, getStaffRoles, ALL_RESOURCES, ALL_ACTIONS, isDefaultAllowed } from "@platform/database";
import { listEmployees } from "@platform/api-client";
import { UsersManagementView } from "../../../components/users/UsersManagementView";
import { pageMetadata } from "../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("users");

export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePagePermission("users", "read");
  const [canWrite, canDelete, canCreateEmployees] = await Promise.all([
    hasPermission("users", "write"),
    hasPermission("users", "delete"),
    hasPermission("employees", "create"),
  ]);
  const query = await searchParams;
  const text = (key: string) => (typeof query[key] === "string" ? (query[key] as string) : undefined);
  const [result, departments, rawEmployees, dbRoles] = await Promise.all([
    getUsersPage({ q: text("q"), role: text("role"), departmentId: text("departmentId"), status: text("status"), page: Number(text("page")) || 1 }),
    getDepartmentTree(),
    listEmployees().catch(() => []),
    getStaffRoles(),
  ]);
  const roles = dbRoles.map((r) => ({
    id: r.id,
    nameEn: r.nameEn || r.id,
    nameAr: r.nameAr || r.id,
  }));
  const people = rawEmployees.map((e) => ({
    id: e.id,
    fullName: `${e.first_name_en || ""} ${e.last_name_en || ""}`.trim() || e.id,
  }));
  const rolePermissions: Record<string, Record<string, boolean>> = Object.fromEntries(
    roles.map((role) => [
      role.id,
      Object.fromEntries(
        ALL_RESOURCES.flatMap((resource) =>
          ALL_ACTIONS.map((action) => [`${resource}:${action}`, isDefaultAllowed(role.id as any, resource as any, action as any)]),
        ),
      ),
    ]),
  );
  const employees = rawEmployees.map((e) => ({
    id: e.id,
    employeeNumber: e.employee_number || e.id,
    firstNameEn: e.first_name_en || "",
    lastNameEn: e.last_name_en || "",
    email: e.email || "",
  }));
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
