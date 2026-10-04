import { requirePermission } from "../../../../lib/auth";
import * as React from "react";
import { getCRMContactById } from "@ishoot/database";
import { NewPaymentFormView } from "../../../../components/payments/NewPaymentFormView";

export const dynamic = "force-dynamic";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  await requirePermission("payments", "write");
  await requirePermission("invoices", "read");
  await requirePermission("contacts", "read");
  const params = await searchParams;
  const [contacts, invoices] = await Promise.all([
    params?.clientId ? getCRMContactById(params.clientId).then(c=>c?[c]:[]) : Promise.resolve([]),
    Promise.resolve([]),
  ]);

  return (
    <NewPaymentFormView
      initialContacts={contacts}
      initialInvoices={invoices}
      preselectedClientId={params?.clientId}
    />
  );
}
