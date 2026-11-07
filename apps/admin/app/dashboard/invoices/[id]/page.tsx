import { requirePagePermission, hasPermission } from "../../../../lib/auth";
import { notFound } from "next/navigation";
import { getInvoiceById, getAllPayments, getAttribution, listSalesPeople, getSigningState, canSignDocument, listClientSignatures, SIGNABLE_STATUSES } from "@platform/database";
import { getQuotation, getDeal } from "@platform/api-client";
import { ClientSignaturePanel } from "../../../../components/shared/ClientSignaturePanel";
import { SigningPanel } from "../../../../components/sales/SigningPanel";
import { AttributionPanel } from "../../../../components/sales/AttributionPanel";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { InvoiceDetailView } from "../../../../components/invoices/InvoiceDetailView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("invoices/[id]");

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
  const canIssue = await hasPermission("invoices", "issue_send");
  const [signing, canSign, canWrite] = await Promise.all([
    getSigningState("invoice", id),
    canSignDocument("invoice", id, user, canIssue),
    hasPermission("invoices", "write"),
  ]);

  if (!invoice || !company) {
    notFound();
  }
  const [clientSignatures, canReadQuotations, canReadDeals] = await Promise.all([
    listClientSignatures("invoice", invoice.id),
    hasPermission("quotations", "read"),
    hasPermission("deals", "read"),
  ]);
  // Links card: the quotation this invoice came from and its deal, each shown only to those who can open it.
  const quotationId = (invoice as any).quotationId || (invoice as any).quotation_id;
  const dealId = (invoice as any).dealId || (invoice as any).deal_id;
  const [quotation, deal] = await Promise.all([
    canReadQuotations && quotationId
      ? getQuotation(quotationId).then((q: any) => (q ? { id: q.id, quotationNumber: q.quotationNumber || q.quotation_number } : null)).catch(() => null)
      : Promise.resolve(null),
    canReadDeals && dealId
      ? getDeal(dealId).then((d: any) => (d ? { id: d.id, title: d.title } : null)).catch(() => null)
      : Promise.resolve(null),
  ]);

  const invoicePayments = allPayments;

  return (
    <>
      <InvoiceDetailView invoice={invoice} company={company} payments={invoicePayments} quotation={quotation} deal={deal} signing={signing.signed ? { signatureUrl: signing.signatureUrl, signerName: signing.signedBy?.name ?? "" } : null} />
      <div className="max-w-6xl mx-auto mt-6 no-print grid gap-6 lg:grid-cols-2">
        <SigningPanel type="invoice" id={id} state={signing} canSign={canSign} canRequestApproval={canWrite} hasSignature={!!user.signature_url} />
        <AttributionPanel entityType="invoice" entityId={id} info={attribution} salesPeople={salesPeople} canReassign={canEdit || canAssign} />
        <div className="lg:col-span-2">
          <ClientSignaturePanel
            documentType="invoice"
            documentId={invoice.id}
            signable={SIGNABLE_STATUSES.invoice.includes(invoice.status)}
            records={clientSignatures}
            canSend={canIssue}
            canRecord={canEdit}
            defaultEmail={invoice.contact?.email ?? null}
          />
        </div>
      </div>
    </>
  );
}
