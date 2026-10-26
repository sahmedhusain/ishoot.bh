import { notFound } from "next/navigation";
import { requirePagePermission, hasPermission } from "../../../../lib/auth";
import { getQuotationById, getApprovalRequest, canDecideApproval, getAttribution, listSalesPeople, getSigningState, canSignDocument, listClientSignatures, SIGNABLE_STATUSES } from "@platform/database";
import { ClientSignaturePanel } from "../../../../components/shared/ClientSignaturePanel";
import { SigningPanel } from "../../../../components/sales/SigningPanel";
import { AttributionPanel } from "../../../../components/sales/AttributionPanel";
import { QuotationDetailView } from "../../../../components/quotations/QuotationDetailView";

export const dynamic = "force-dynamic";

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await requirePagePermission("quotations", "read");
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
  const [signing, canSign, clientSignatures] = await Promise.all([
    getSigningState("quotation", id),
    canSignDocument("quotation", id, currentUser, canIssue),
    listClientSignatures("quotation", quotation.id),
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
      <div className="max-w-6xl mx-auto mt-6 grid gap-6 lg:grid-cols-2">
        <SigningPanel type="quotation" id={id} state={signing} canSign={canSign} hasSignature={!!currentUser.signature_url} />
        <AttributionPanel entityType="quotation" entityId={id} info={attribution} salesPeople={salesPeople} canReassign={canEdit || canAssign} />
        <div className="lg:col-span-2">
          <ClientSignaturePanel
            documentType="quotation"
            documentId={quotation.id}
            signable={SIGNABLE_STATUSES.quotation.includes(quotation.status)}
            records={clientSignatures}
            canSend={canIssue}
            canRecord={canEdit}
            defaultEmail={(quotation.client as { email?: string | null } | null)?.email ?? null}
          />
        </div>
      </div>
    </>
  );
}
