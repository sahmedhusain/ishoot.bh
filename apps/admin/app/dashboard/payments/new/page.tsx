import * as React from "react";
import { getCRMContacts, getAllInvoices } from "@ishoot/database";
import { NewPaymentFormView } from "../../../../components/payments/NewPaymentFormView";

export const dynamic = "force-dynamic";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const params = await searchParams;
  const [contacts, invoices] = await Promise.all([
    getCRMContacts(),
    getAllInvoices(),
  ]);

  return (
    <NewPaymentFormView
      initialContacts={contacts}
      initialInvoices={invoices}
      preselectedClientId={params?.clientId}
    />
  );
}
