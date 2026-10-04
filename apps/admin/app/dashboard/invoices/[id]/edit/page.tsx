import { requirePermission } from "../../../../../lib/auth";
import { notFound } from "next/navigation";
import {
getInvoiceById,
getCRMContactById,
getCompanySettings,
getAllServices,
} from "@ishoot/database";
import { InvoiceEditFormView } from "../../../../../components/invoices/InvoiceEditFormView";

export const dynamic = "force-dynamic";

interface InvoiceEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceEditPage({
  params,
}: InvoiceEditPageProps) {
  await requirePermission("invoices", "write");
  await requirePermission("contacts", "read");
  const { id } = await params;

  const invoicePromise = getInvoiceById(id);
  const [invoice, contacts, company, services] = await Promise.all([
    invoicePromise,
    invoicePromise.then(inv=>inv?.contact_id ? getCRMContactById(inv.contact_id).then(c=>c?[c]:[]) : []),
    getCompanySettings(),
    getAllServices({ isActive: true }),
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
    />
  );
}
