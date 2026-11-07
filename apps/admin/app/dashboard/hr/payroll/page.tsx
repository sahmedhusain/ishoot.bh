import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { listPayrollRuns, canDecideApproval, getSupportClaims } from "@platform/database";
import { SupportClaimsPanel } from "../../../../components/hr/SupportClaimsPanel";
import { PayrollManagementView } from "../../../../components/hr/PayrollManagementView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("hr/payroll");

export const dynamic = "force-dynamic";

export default async function PayrollPage() {
  const user = await requirePagePermission("payroll", "read");
  const runs = await listPayrollRuns();
  const decidableRunIds: string[] = [];

  const [canEdit, canCreate, canPay, supportClaims] = await Promise.all([hasPermission("payroll", "edit"), hasPermission("payroll", "create"), hasPermission("payroll", "issue_send"), getSupportClaims()]);
  return (
    <>
      <PayrollManagementView runs={runs} currentUserId={user.id} decidableRunIds={decidableRunIds} canEdit={canEdit} canCreate={canCreate} canPay={canPay} />
      <div className="max-w-7xl mx-auto mt-8">
        <SupportClaimsPanel claims={supportClaims} canRecord={canEdit} />
      </div>
    </>
  );
}
