import { getCompanySettings, getDepartmentTree, getStaffRoles } from "@platform/database";
import { hasPermission, requirePagePermission } from "../../../../../lib/auth";
import { ImportPeopleView } from "../../../../../components/hr/ImportPeopleView";
import { pageMetadata } from "../../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("hr/employees/import");

export const dynamic = "force-dynamic";

export default async function ImportEmployeesPage() {
  await requirePagePermission("employees", "create");
  const [departmentTree, company, canCreateAccounts, dbRoles] = await Promise.all([
    getDepartmentTree(),
    getCompanySettings(),
    hasPermission("users", "write"),
    getStaffRoles(),
  ]);
  const departments = departmentTree.map((d) => ({ code: d.code, nameEn: d.name_en, nameAr: d.name_ar }));
  const roles = dbRoles.filter((r) => r.id !== "super_admin").map((r) => ({ id: r.id, nameEn: r.nameEn || r.id, nameAr: r.nameAr || r.id }));
  return <ImportPeopleView departments={departments} roles={roles} languages={company.content_languages} canCreateAccounts={canCreateAccounts} />;
}
