import * as React from "react";
import { getCRMDealById, getCRMContacts } from "@ishoot/database";
import { notFound } from "next/navigation";
import { DealEditFormView } from "../../../../../../components/crm/DealEditFormView";

export const dynamic = "force-dynamic";

interface DealEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function DealEditPage({ params }: DealEditPageProps) {
  const { id } = await params;

  const [deal, contacts] = await Promise.all([
    getCRMDealById(id),
    getCRMContacts(),
  ]);

  if (!deal) {
    notFound();
  }

  return <DealEditFormView deal={deal} contacts={contacts} />;
}
