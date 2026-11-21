import { hasPermission, requirePagePermission } from "../../../../../lib/auth";
import { listDepartments, listEmployees, getHrPolicy } from "@platform/database";
import { getUsersPage } from "../../../../../lib/queries/users";
import { NewEmployeeFormView, type OnboardingUserOption } from "../../../../../components/hr/NewEmployeeFormView";
import { pageMetadata } from "../../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("hr/employees/new");

export const dynamic = "force-dynamic";

export default async function NewEmployeePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePagePermission("employees", "create");
  const params = await searchParams;
  const [departments, hrPolicy, canSetPay, usersPage, employeesRes] = await Promise.all([
    listDepartments(),
    getHrPolicy(),
    hasPermission("payroll", "edit"),
    getUsersPage({ page: 1 }).catch(() => ({ items: [] })),
    listEmployees().catch(() => ({ items: [], total: 0 })),
  ]);

  const linkedUserIds = new Set(
    (employeesRes.items ?? [])
      .map((emp) => (emp as { userId?: string | null; user_id?: string | null }).userId ?? (emp as { user_id?: string | null }).user_id)
      .filter((id): id is string => Boolean(id)),
  );

  const existingUsers: OnboardingUserOption[] = usersPage.items.map((u) => ({
    id: u.id,
    fullName: u.full_name || u.email,
    email: u.email,
    username: (u as { username?: string | null }).username || u.email.split("@")[0],
    role: u.role || "employee",
    alreadyLinked: linkedUserIds.has(u.id),
  }));

  const preselectedUserId = typeof params.userId === "string" ? params.userId : undefined;
  const linkUser = preselectedUserId
    ? existingUsers.find((u) => u.id === preselectedUserId) ?? null
    : null;

  return (
    <NewEmployeeFormView
      visaExemptCountries={hrPolicy.visaExemptCountries}
      departments={departments}
      linkUser={linkUser ? { id: linkUser.id, fullName: linkUser.fullName, email: linkUser.email } : null}
      existingUsers={existingUsers}
      canSetPay={canSetPay}
    />
  );
}
