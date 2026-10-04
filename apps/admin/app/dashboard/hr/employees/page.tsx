import { requirePermission } from "../../../../lib/auth";
import { listEmployees, listDepartments } from "@ishoot/database";
import { EmployeesListView } from "../../../../components/hr/EmployeesListView";

export const dynamic = "force-dynamic";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("employees", "read");
  const query = await searchParams;
  const departmentId = typeof query.departmentId === "string" ? query.departmentId : undefined;
  const status = typeof query.status === "string" ? query.status : undefined;
  const search = typeof query.search === "string" ? query.search : undefined;
  const page = Math.max(1, Number(query.page) || 1);

  const [{ items: employees, total }, departments] = await Promise.all([
    listEmployees({
      departmentId,
      status,
      search,
      page,
      pageSize: 25,
    }),
    listDepartments(),
  ]);

  return (
    <EmployeesListView
      employees={employees}
      departments={departments}
      total={total}
      currentDepartment={departmentId || "all"}
      currentStatus={status || "all"}
      search={search || ""}
      page={page}
    />
  );
}
