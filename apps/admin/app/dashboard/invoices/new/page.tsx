import { requirePermission } from "../../../../lib/auth";
import * as React from "react";
import { getCRMContactById, getCompanySettings, getAllServices } from "@ishoot/database";
import { NewInvoiceFormView } from "../../../../components/invoices/NewInvoiceFormView";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  await requirePermission("invoices", "write");
  await requirePermission("contacts", "read");
  const params = await searchParams;
  const [contacts, company, services] = await Promise.all([
    params?.clientId ? getCRMContactById(params.clientId).then(c=>c?[c]:[]) : Promise.resolve([]),
    getCompanySettings(),
    getAllServices({ isActive: true }),
  ]);

  return (
    <NewInvoiceFormView
      initialContacts={contacts}
      company={company}
      services={services}
      preselectedClientId={params?.clientId}
    />
  );
}
