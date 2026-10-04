import {
  getCurrentPermissions,
  requirePermission,
} from "../../../../../lib/auth";
import * as React from "react";
import {
  getCRMDealById,
  getCRMContactById,
  getInvoicesPage,
} from "@ishoot/database";
import { notFound } from "next/navigation";
import { DealDossierView } from "../../../../../components/crm/DealDossierView";

export const dynamic = "force-dynamic";

interface DealDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}

export default async function DealDetailPage({
  params,
  searchParams,
}: DealDetailPageProps) {
  await requirePermission("deals", "read");
  const { id } = await params;
  const deal = await getCRMDealById(id);

  if (!deal) {
    notFound();
  }

  const grants = await getCurrentPermissions();
  const canContacts = grants["contacts:read"] === true;
  const canInvoices = grants["invoices:read"] === true;
  if (!canContacts) deal.contact = undefined;
  const [contact, invoices] = await Promise.all([
    canContacts && deal.contact_id
      ? getCRMContactById(deal.contact_id)
      : Promise.resolve(null),
    canInvoices
      ? getInvoicesPage({ ...(await searchParams), dealId: id })
      : Promise.resolve(null),
  ]);

  return (
    <DealDossierView
      deal={deal}
      contact={contact}
      invoices={invoices?.items || []}
      invoicePage={invoices || undefined}
    />
  );
}
