import { db, getCompanySettings } from "@platform/database";
import { hasPermission, requirePagePermission } from "../../../../../lib/auth";
import { ImportPeopleView } from "../../../../../components/hr/ImportPeopleView";
import { pageMetadata } from "../../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("hr/employees/import");

export const dynamic = "force-dynamic";

export default async function ImportEmployeesPage() {
  await requirePagePermission("employees", "create");
  const [departments, roles, company, canCreateAccounts] = await Promise.all([
    db.department.findMany({ where: { isActive: true }, select: { code: true, nameEn: true, nameAr: true }, orderBy: { sortOrder: "asc" } }),
    db.role.findMany({ where: { id: { not: "super_admin" } }, select: { id: true, nameEn: true, nameAr: true }, orderBy: { createdAt: "asc" } }),
    getCompanySettings(),
    hasPermission("users", "write"),
  ]);
  return <ImportPeopleView departments={departments} roles={roles} languages={company.content_languages} canCreateAccounts={canCreateAccounts} />;
}
