import { requirePermission } from "../../../../../../lib/auth";
import * as React from "react";
import { getCRMDealById, getCRMContacts, db } from "@ishoot/database";
import { notFound } from "next/navigation";
import { DealEditFormView } from "../../../../../../components/crm/DealEditFormView";

export const dynamic = "force-dynamic";

interface DealEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function DealEditPage({ params }: DealEditPageProps) {
  await requirePermission("deals", "write");
  await requirePermission("contacts", "read");
  const { id } = await params;

  const [deal, contacts, owners] = await Promise.all([
    getCRMDealById(id),
    getCRMContacts(),
    db.user.findMany({ where: { isActive: true }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }),
  ]);

  if (!deal) {
    notFound();
  }

  return <DealEditFormView deal={deal} contacts={contacts} owners={owners} />;
}
