import * as React from "react";
import { getCRMContacts, getCompanySettings } from "@ishoot/database";
import { NewInvoiceFormView } from "../../../../components/invoices/NewInvoiceFormView";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const params = await searchParams;
  const [contacts, company] = await Promise.all([
    getCRMContacts(),
    getCompanySettings(),
  ]);

  return (
    <NewInvoiceFormView
      initialContacts={contacts}
      company={company}
      preselectedClientId={params?.clientId}
    />
  );
}
