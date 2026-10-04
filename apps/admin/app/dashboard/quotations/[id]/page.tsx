import { notFound } from "next/navigation";
import { requirePermission, getCurrentUser, hasPermission } from "../../../../lib/auth";
import { getQuotationById, getApprovalRequest } from "@ishoot/database";
import { QuotationDetailView } from "../../../../components/quotations/QuotationDetailView";

export const dynamic = "force-dynamic";

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("quotations", "read");
  const { id } = await params;
  const currentUser = await getCurrentUser();

  const quotation = await getQuotationById(id);
  if (!quotation) {
    notFound();
  }

  const [approvalRequest, canIssue, canEdit] = await Promise.all([
    getApprovalRequest("quotation", id, quotation.revision),
    hasPermission("quotations", "issue_send"),
    hasPermission("quotations", "edit"),
  ]);

  const isSuperAdmin = currentUser?.role === "super_admin";

  return (
    <QuotationDetailView
      quotation={quotation}
      approvalRequest={approvalRequest}
      currentUserId={currentUser?.id || ""}
      currentUserRole={currentUser?.role || "viewer"}
      canApprove={isSuperAdmin}
      canIssue={canIssue || isSuperAdmin}
      canEdit={canEdit}
    />
  );
}
