import * as React from "react";
import { getCRMContacts, getCompanySettings } from "@ishoot/database";
import { NewInvoiceFormView } from "../../../../components/invoices/NewInvoiceFormView";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const [contacts, company] = await Promise.all([
    getCRMContacts(),
    getCompanySettings(),
  ]);

  return <NewInvoiceFormView initialContacts={contacts} company={company} />;
}
