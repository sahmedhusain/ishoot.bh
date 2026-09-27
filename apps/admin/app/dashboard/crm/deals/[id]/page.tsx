import * as React from "react";
import {
  getCRMDealById,
  getCRMContactById,
  getInvoicesByDealId,
} from "@ishoot/database";
import { notFound } from "next/navigation";
import { DealDossierView } from "../../../../../components/crm/DealDossierView";

export const dynamic = "force-dynamic";

interface DealDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function DealDetailPage({ params }: DealDetailPageProps) {
  const { id } = await params;
  const deal = await getCRMDealById(id);

  if (!deal) {
    notFound();
  }

  const [contact, invoices] = await Promise.all([
    deal.contact_id
      ? getCRMContactById(deal.contact_id)
      : Promise.resolve(null),
    getInvoicesByDealId(id),
  ]);

  return <DealDossierView deal={deal} contact={contact} invoices={invoices} />;
}
