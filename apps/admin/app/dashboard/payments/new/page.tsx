import { requirePagePermission } from "../../../../lib/auth";
import { getCRMContactById } from "@platform/database";
import { listInvoices } from "@platform/api-client";
import type { Invoice } from "@platform/database/types";
import { NewPaymentFormView } from "../../../../components/payments/NewPaymentFormView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("payments/new");

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
  const [contacts, rawInvoices] = await Promise.all([
    params?.clientId ? getCRMContactById(params.clientId).then(c => c ? [c] : []) : Promise.resolve([]),
    params?.clientId ? listInvoices().catch(() => []) : Promise.resolve([]),
  ]);

  const invoices: Invoice[] = rawInvoices
    .filter((inv) => {
      if (params?.clientId && inv.contactId !== params.clientId) return false;
      const due = Number(inv.balanceDue ?? inv.total ?? 0);
      return due > 0 && inv.status !== "void" && inv.status !== "cancelled" && inv.status !== "paid";
    })
    .map((inv) => {
      const subtotal = Number(inv.subtotal ?? 0);
      const discountAmount = Number(inv.discount ?? 0);
      const vatRate = Number(inv.vatRate ?? 0);
      const vatAmount = Number(inv.vatAmount ?? 0);
      return {
        id: inv.id,
        invoice_number: inv.invoiceNumber,
        contact_id: inv.contactId ?? undefined,
        deal_id: inv.dealId ?? undefined,
        issue_date: inv.issueDate,
        due_date: inv.dueDate,
        subtotal,
        discount_type: discountAmount > 0 ? ("fixed" as const) : ("none" as const),
        discount_value: discountAmount,
        discount_amount: discountAmount,
        after_discount: Math.max(0, subtotal - discountAmount),
        vat_enabled: vatRate > 0 || vatAmount > 0,
        vat_percentage: vatRate,
        vat_amount: vatAmount,
        total_amount: Number(inv.total ?? 0),
        amount_paid: Number(inv.amountPaid ?? 0),
        amount_due: Number(inv.balanceDue ?? 0),
        currency: inv.currency as Invoice["currency"],
        status: inv.status as Invoice["status"],
        language: "en" as const,
        notes: inv.notes ?? undefined,
        created_at: inv.createdAt,
        updated_at: inv.updatedAt,
      };
    });

  return (
    <NewPaymentFormView
      initialContacts={contacts}
      initialInvoices={invoices}
      preselectedClientId={params?.clientId}
    />
  );
}
