import { requirePagePermission, hasPermission } from "../../../../lib/auth";
import { notFound } from "next/navigation";
import { getInvoiceById, getAllPayments, getAttribution, listSalesPeople, getSigningState, canSignDocument } from "@ishoot/database";
import { SigningPanel } from "../../../../components/sales/SigningPanel";
import { AttributionPanel } from "../../../../components/sales/AttributionPanel";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { InvoiceDetailView } from "../../../../components/invoices/InvoiceDetailView";

export const dynamic = "force-dynamic";

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({
  params,
}: InvoiceDetailPageProps) {
  const user = await requirePagePermission("invoices", "read");
  const canReadPayments = await hasPermission("payments", "read");
  const { id } = await params;

  // Invoice access alone opens the page; the payment history needs payments access.
  const [invoice, company, allPayments, attribution, salesPeople, canEdit, canAssign] = await Promise.all([
    getInvoiceById(id),
    getCachedCompanySettings(),
    canReadPayments ? getAllPayments({ invoiceId: id }) : Promise.resolve([]),
    getAttribution("invoice", id),
    listSalesPeople(),
    hasPermission("invoices", "edit"),
    hasPermission("invoices", "assign"),
  ]);
  const [signing, canSign, canWrite] = await Promise.all([
    getSigningState("invoice", id),
    canSignDocument("invoice", id, user, await hasPermission("invoices", "issue_send")),
    hasPermission("invoices", "write"),
  ]);

  if (!invoice || !company) {
    notFound();
  }

  const invoicePayments = allPayments;

  return (
    <>
      <InvoiceDetailView invoice={invoice} company={company} payments={invoicePayments} signing={signing.signed ? { signatureUrl: signing.signatureUrl, signerName: signing.signedBy?.name ?? "" } : null} />
      <div className="max-w-6xl mx-auto mt-6 no-print grid gap-6 lg:grid-cols-2">
        <SigningPanel type="invoice" id={id} state={signing} canSign={canSign} canRequestApproval={canWrite} hasSignature={!!user.signature_url} />
        <AttributionPanel entityType="invoice" entityId={id} info={attribution} salesPeople={salesPeople} canReassign={canEdit || canAssign} />
      </div>
    </>
  );
}
