import { requirePermission, hasPermission } from "../../../../lib/auth";
import { notFound } from "next/navigation";
import { getInvoiceById, getAllPayments } from "@ishoot/database";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { InvoiceDetailView } from "../../../../components/invoices/InvoiceDetailView";

export const dynamic = "force-dynamic";

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({
  params,
}: InvoiceDetailPageProps) {
  await requirePermission("invoices", "read");
  const canReadPayments = await hasPermission("payments", "read");
  const { id } = await params;

  // Invoice access alone opens the page; the payment history needs payments access.
  const [invoice, company, allPayments] = await Promise.all([
    getInvoiceById(id),
    getCachedCompanySettings(),
    canReadPayments ? getAllPayments({ invoiceId: id }) : Promise.resolve([]),
  ]);

  if (!invoice || !company) {
    notFound();
  }

  const invoicePayments = allPayments;

  return (
    <InvoiceDetailView
      invoice={invoice}
      company={company}
      payments={invoicePayments}
    />
  );
}
