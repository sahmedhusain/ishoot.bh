import { notFound } from "next/navigation";
import {
  canDecideApproval,
  findPendingApproval,
  getFinalSettlement,
  getSignatureMode,
} from "@ishoot/database";
import { hasPermission, requireAuth } from "../../../../../lib/auth";
import { ForbiddenView } from "../../../../../components/shared/ForbiddenView";
import { SettlementDetailView } from "../../../../../components/settlements/SettlementDetailView";

export const dynamic = "force-dynamic";

/** One final settlement: every line, the approval, the employee's acknowledgement and the payment. Open to payroll staff and its approvers. */
export default async function SettlementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;
  const settlement = await getFinalSettlement(id);
  if (!settlement) notFound();
  const [canRead, canEdit, canPay, pending, mode] = await Promise.all([
    hasPermission("payroll", "read"),
    hasPermission("payroll", "edit"),
    hasPermission("payroll", "issue_send"),
    findPendingApproval("final_settlement", id),
    getSignatureMode("final_settlement"),
  ]);
  const canDecide = pending ? canDecideApproval(pending, user) : false;
  if (!canRead && !canDecide) return <ForbiddenView />;
  return (
    <SettlementDetailView
      settlement={settlement}
      canEdit={canEdit}
      canPay={canPay}
      approvalId={canDecide && pending ? pending.id : null}
      signatureRequired={mode === "live"}
    />
  );
}
