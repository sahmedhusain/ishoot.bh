import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { listEmployees, listDepartments, listExpiringEmployeeDocuments } from "@platform/database";
import { ExpiringDocumentsCard } from "../../../../components/hr/ExpiringDocumentsCard";
import { EmployeesListView } from "../../../../components/hr/EmployeesListView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("hr/employees");

export const dynamic = "force-dynamic";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePagePermission("employees", "read");
  const query = await searchParams;
  const departmentId = typeof query.departmentId === "string" ? query.departmentId : undefined;
  const status = typeof query.status === "string" ? query.status : undefined;
  const search = typeof query.search === "string" ? query.search : undefined;
  const page = Math.max(1, Number(query.page) || 1);

  const [{ items: listed, total }, departments, canViewPay, canCreate, canEdit, expiring] = await Promise.all([
    listEmployees({
      departmentId,
      status,
      search,
      page,
      pageSize: 25,
    }),
    listDepartments(),
    hasPermission("payroll", "read"),
    hasPermission("employees", "create"),
    hasPermission("employees", "edit"),
    listExpiringEmployeeDocuments(60),
  ]);
  // Salaries leave the server only for people who can read payroll.
  const employees = canViewPay ? listed : listed.map((e) => ({ ...e, employmentRecords: [] }));

  return (
    <EmployeesListView
      notice={canEdit ? <ExpiringDocumentsCard rows={expiring} /> : null}
      employees={employees}
      departments={departments}
      total={total}
      currentDepartment={departmentId || "all"}
      currentStatus={status || "all"}
      search={search || ""}
      page={page}
      canViewPay={canViewPay}
      canCreate={canCreate}
    />
  );
}
