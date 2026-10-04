import { requirePermission } from "../../../../lib/auth";
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
  await requirePermission("payments", "read");
  const { id } = await params;

  const [invoice, company, allPayments] = await Promise.all([
    getInvoiceById(id),
    getCachedCompanySettings(),
    getAllPayments({invoiceId:id}),
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
