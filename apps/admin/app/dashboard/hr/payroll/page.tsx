import { requirePermission } from "../../../../lib/auth";
import { listPayrollRuns, db, canDecideApproval } from "@ishoot/database";
import { PayrollManagementView } from "../../../../components/hr/PayrollManagementView";

export const dynamic = "force-dynamic";

export default async function PayrollPage() {
  const user = await requirePermission("payroll", "read");
  const runs = await listPayrollRuns();

  const submittedIds = runs.filter((run) => run.status === "submitted").map((run) => run.id);
  const pending = submittedIds.length
    ? await db.approvalRequest.findMany({
        where: { targetType: "payroll_run", targetId: { in: submittedIds }, status: "pending" },
        select: { targetId: true, status: true, requestedById: true, approverIds: true },
      })
    : [];
  const decidableRunIds = pending.filter((request) => canDecideApproval(request, user)).map((request) => request.targetId);

  return <PayrollManagementView runs={runs} currentUserId={user.id} decidableRunIds={decidableRunIds} />;
}
