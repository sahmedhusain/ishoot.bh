import { getCompanySettings, getDepartmentTree } from "@platform/database";
import { listEmployees } from "@platform/api-client";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { DepartmentsSettingsView } from "../../../../components/settings/DepartmentsSettingsView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("settings/departments");

export const dynamic = "force-dynamic";

export default async function DepartmentsSettingsPage() {
  await requirePagePermission("settings", "read");
  const [departments, employees, company, canEdit] = await Promise.all([
    getDepartmentTree(),
    listEmployees().catch(() => []),
    getCompanySettings(),
    hasPermission("settings", "edit"),
  ]);
  const people = employees.map((e) => ({
    id: e.id,
    fullName: `${e.first_name_en || ""} ${e.last_name_en || ""}`.trim() || e.id,
  }));
  return <DepartmentsSettingsView departments={departments} people={people} languages={company.content_languages} canEdit={canEdit} />;
}
