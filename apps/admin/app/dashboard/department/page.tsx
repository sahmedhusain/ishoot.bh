import { forbidden } from "next/navigation";
import { dashboardDepartments, departmentDashboard, departmentSubtree } from "@platform/database";
import { getCurrentPermissions, requireAuth } from "../../../lib/auth";
import { DepartmentDashboardView } from "../../../components/dashboard/DepartmentDashboardView";
import { pageMetadata } from "../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("department");

export const dynamic = "force-dynamic";

export default async function DepartmentDashboardPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const user = await requireAuth();
  const grants = await getCurrentPermissions();
  const all = grants["employees:read"] === true && grants["settings:read"] === true;
  const departments = await dashboardDepartments(user.id, all);
  if (!departments.length) forbidden();
  const { d } = await searchParams;
  const chosen = departments.find((dep) => dep.id === d) ?? departments[0];
  const summary = await departmentDashboard(await departmentSubtree([chosen.id]));
  return <DepartmentDashboardView departments={departments} chosenId={chosen.id} summary={summary} canSeeLeave={grants["employees:read"] === true} />;
}
