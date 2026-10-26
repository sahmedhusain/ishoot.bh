import { requirePagePermission } from "../../../../../lib/auth";
import { notFound } from "next/navigation";
import { getInvoiceById, getCRMContactById, getAllServices, getFxBoard } from "@platform/database";
import { getCachedCompanySettings } from "../../../../../lib/cached-queries";
import { InvoiceEditFormView } from "../../../../../components/invoices/InvoiceEditFormView";

export const dynamic = "force-dynamic";

interface InvoiceEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceEditPage({
  params,
}: InvoiceEditPageProps) {
  await requirePagePermission("invoices", "write");
  await requirePagePermission("contacts", "read");
  const { id } = await params;

  const invoicePromise = getInvoiceById(id);
  const [invoice, contacts, company, services, fxBoard] = await Promise.all([
    invoicePromise,
    invoicePromise.then(inv => inv?.contact_id ? getCRMContactById(inv.contact_id).then(c => c ? [c] : []) : []),
    getCachedCompanySettings(),
    getAllServices({ isActive: true }),
    getFxBoard(),
  ]);

  if (!invoice || !company) {
    notFound();
  }

  return (
    <InvoiceEditFormView
      invoice={invoice}
      initialContacts={contacts}
      company={company}
      services={services}
      fxRates={Object.fromEntries(fxBoard.map((row) => [row.currency, row.perBhd]))}
    />
  );
}
