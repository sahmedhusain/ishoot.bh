import { notFound } from "next/navigation";
import { requirePermission, hasPermission } from "../../../../lib/auth";
import { getQuotationById, getApprovalRequest, canDecideApproval, getAttribution, listSalesPeople } from "@ishoot/database";
import { AttributionPanel } from "../../../../components/sales/AttributionPanel";
import { QuotationDetailView } from "../../../../components/quotations/QuotationDetailView";

export const dynamic = "force-dynamic";

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await requirePermission("quotations", "read");
  const { id } = await params;

  const quotation = await getQuotationById(id);
  if (!quotation) {
    notFound();
  }

  const [approvalRequest, canIssue, canEdit, canAssign, attribution, salesPeople] = await Promise.all([
    // Latest approval round; rounds are numbered independently of the quotation revision.
    getApprovalRequest("quotation", id),
    hasPermission("quotations", "issue_send"),
    hasPermission("quotations", "edit"),
    hasPermission("quotations", "assign"),
    getAttribution("quotation", id),
    listSalesPeople(),
  ]);

  return (
    <>
    <QuotationDetailView
      quotation={quotation}
      approvalRequest={approvalRequest}
      currentUserId={currentUser.id}
      currentUserRole={currentUser.role}
      canApprove={!!approvalRequest && canDecideApproval(approvalRequest, currentUser)}
      canIssue={canIssue}
      canEdit={canEdit}
    />
    <div className="max-w-6xl mx-auto mt-6">
      <AttributionPanel entityType="quotation" entityId={id} info={attribution} salesPeople={salesPeople} canReassign={canEdit || canAssign} />
    </div>
    </>
  );
}
