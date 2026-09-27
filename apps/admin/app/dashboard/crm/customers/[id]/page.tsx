import * as React from "react";
import { getCustomerDossier } from "@ishoot/database";
import { notFound } from "next/navigation";
import { Customer360DossierView } from "../../../../../components/crm/Customer360DossierView";

interface CustomerDossierPageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDossierPage({
  params,
}: CustomerDossierPageProps) {
  const { id } = await params;
  const dossier = await getCustomerDossier(id);

  if (!dossier) {
    notFound();
  }

  return <Customer360DossierView dossier={dossier} />;
}
