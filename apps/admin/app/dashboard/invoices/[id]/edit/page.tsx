import { requirePagePermission } from "../../../../../lib/auth";
import { ROUTES } from "../../../../../constants/routes";
import { notFound, redirect } from "next/navigation";
import { getInvoiceById, getCRMContactById, getAllServices } from "@platform/database";
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
  const [invoice, contacts, company, services] = await Promise.all([
    invoicePromise,
    invoicePromise.then(inv => inv?.contact_id ? getCRMContactById(inv.contact_id).then(c => c ? [c] : []) : []),
    getCachedCompanySettings(),
    getAllServices({ isActive: true }),
  ]);

  if (!invoice || !company) {
    notFound();
  }

  if (invoice.currency !== company.default_currency) redirect(ROUTES.invoices.detail(invoice.id));

  return (
    <InvoiceEditFormView
      invoice={invoice}
      initialContacts={contacts}
      company={company}
      services={services}

    />
  );
}
