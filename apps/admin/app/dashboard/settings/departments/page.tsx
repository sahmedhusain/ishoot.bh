import { db, getCompanySettings, getDepartmentTree } from "@platform/database";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { DepartmentsSettingsView } from "../../../../components/settings/DepartmentsSettingsView";

export const dynamic = "force-dynamic";

export default async function DepartmentsSettingsPage() {
  await requirePagePermission("settings", "read");
  const [departments, people, company, canEdit] = await Promise.all([
    getDepartmentTree(),
    db.user.findMany({ where: { isActive: true, archivedAt: null }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" }, take: 2000 }),
    getCompanySettings(),
    hasPermission("settings", "edit"),
  ]);
  return <DepartmentsSettingsView departments={departments} people={people} languages={company.content_languages} canEdit={canEdit} />;
}
