import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { listPayrollRuns, db, canDecideApproval, getSupportClaims } from "@platform/database";
import { SupportClaimsPanel } from "../../../../components/hr/SupportClaimsPanel";
import { PayrollManagementView } from "../../../../components/hr/PayrollManagementView";

export const dynamic = "force-dynamic";

export default async function PayrollPage() {
  const user = await requirePagePermission("payroll", "read");
  const runs = await listPayrollRuns();

  const submittedIds = runs.filter((run) => run.status === "submitted").map((run) => run.id);
  const pending = submittedIds.length
    ? await db.approvalRequest.findMany({
      where: { targetType: "payroll_run", targetId: { in: submittedIds }, status: "pending" },
      select: { targetId: true, status: true, requestedById: true, approverIds: true },
    })
    : [];
  const decidableRunIds = pending.filter((request) => canDecideApproval(request, user)).map((request) => request.targetId);

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
