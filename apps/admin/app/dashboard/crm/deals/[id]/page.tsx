import { requirePermission } from "../../../../../lib/auth";
import * as React from "react";
import {
  getCRMDealById,
  getCRMContactById,
  getInvoicesByDealId,
  hasPermission,
} from "@ishoot/database";
import { notFound } from "next/navigation";
import { DealDossierView } from "../../../../../components/crm/DealDossierView";

export const dynamic = "force-dynamic";

interface DealDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function DealDetailPage({ params }: DealDetailPageProps) {
  const user = await requirePermission("deals", "read");
  const { id } = await params;
  const deal = await getCRMDealById(id);

  if (!deal) {
    notFound();
  }

  const canContacts = await hasPermission(user.role, "contacts", "read", user.permissions as Record<string, boolean> | undefined);
  const canInvoices = await hasPermission(user.role, "invoices", "read", user.permissions as Record<string, boolean> | undefined);
  if (!canContacts) deal.contact = undefined;
  const [contact, invoices] = await Promise.all([
    canContacts && deal.contact_id
      ? getCRMContactById(deal.contact_id)
      : Promise.resolve(null),
    canInvoices ? getInvoicesByDealId(id) : Promise.resolve([]),
  ]);

  return <DealDossierView deal={deal} contact={contact} invoices={invoices} />;
}
