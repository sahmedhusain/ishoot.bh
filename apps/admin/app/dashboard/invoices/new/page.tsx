import { requirePermission } from "../../../../lib/auth";
import * as React from "react";
import { getCRMContacts, getCompanySettings, getAllServices } from "@ishoot/database";
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
    getCRMContacts(),
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
