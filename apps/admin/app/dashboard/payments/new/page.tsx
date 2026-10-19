import { requirePagePermission } from "../../../../lib/auth";
import { getCRMContactById } from "@platform/database";
import { NewPaymentFormView } from "../../../../components/payments/NewPaymentFormView";

export const dynamic = "force-dynamic";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  await requirePagePermission("payments", "write");
  await requirePagePermission("invoices", "read");
  await requirePagePermission("contacts", "read");
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
