import { requirePermission, getCurrentUser } from "../../../../lib/auth";
import { listPayrollRuns } from "@ishoot/database";
import { PayrollManagementView } from "../../../../components/hr/PayrollManagementView";

export const dynamic = "force-dynamic";

export default async function PayrollPage() {
  await requirePermission("payroll", "read");
  const user = await getCurrentUser();

  const runs = await listPayrollRuns();
  const isSuperAdmin = user?.role === "super_admin";

  return (
    <PayrollManagementView
      runs={runs}
      currentUserId={user?.id || ""}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
