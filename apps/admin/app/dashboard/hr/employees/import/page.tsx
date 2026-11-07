import { getCompanySettings, getDepartmentTree, ALL_ROLES } from "@platform/database";
import { hasPermission, requirePagePermission } from "../../../../../lib/auth";
import { ImportPeopleView } from "../../../../../components/hr/ImportPeopleView";
import { pageMetadata } from "../../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("hr/employees/import");

export const dynamic = "force-dynamic";

export default async function ImportEmployeesPage() {
  await requirePagePermission("employees", "create");
  const [departmentTree, company, canCreateAccounts] = await Promise.all([
    getDepartmentTree(),
    getCompanySettings(),
    hasPermission("users", "write"),
  ]);
  const departments = departmentTree.map((d) => ({ code: d.code, nameEn: d.name_en, nameAr: d.name_ar }));
  const roles = ALL_ROLES.filter((r) => r !== "super_admin").map((r) => ({ id: r, nameEn: r, nameAr: r }));
  return <ImportPeopleView departments={departments} roles={roles} languages={company.content_languages} canCreateAccounts={canCreateAccounts} />;
}
