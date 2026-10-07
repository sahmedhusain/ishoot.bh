import { notFound } from "next/navigation";
import { canDecideApproval, findPendingApproval, getAssetHandover } from "@ishoot/database";
import { hasPermission, requireAuth } from "../../../../../lib/auth";
import { ForbiddenView } from "../../../../../components/shared/ForbiddenView";
import { HandoverDetailView } from "../../../../../components/assets/HandoverDetailView";

export const dynamic = "force-dynamic";

/** Open to staff with asset access, the employee in the handover and its approvers. */
export default async function AssetHandoverPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;
  const handover = await getAssetHandover(id);
  if (!handover) notFound();
  const [canRead, canEdit, pending] = await Promise.all([hasPermission("assets", "read"), hasPermission("assets", "edit"), findPendingApproval("asset_handover", id)]);
  const isEmployee = handover.employee.user_id === user.id;
  const canDecide = pending ? canDecideApproval(pending, user) : false;
  if (!canRead && !isEmployee && !canDecide) return <ForbiddenView />;
  return <HandoverDetailView handover={handover} isEmployee={isEmployee} canEdit={canEdit} approvalId={canDecide && pending ? pending.id : null} />;
}
