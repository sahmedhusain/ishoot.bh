import { requirePermission } from "../../../../../lib/auth";
import * as React from "react";
import { getCustomerDossier, hasPermission } from "@ishoot/database";
import { notFound } from "next/navigation";
import { Customer360DossierView } from "../../../../../components/crm/Customer360DossierView";

interface CustomerDossierPageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDossierPage({
  params,
}: CustomerDossierPageProps) {
  const user = await requirePermission("contacts", "read");
  const { id } = await params;
  const dossier = await getCustomerDossier(id);

  if (!dossier) {
    notFound();
  }

  const can = (resource: "invoices" | "payments" | "deals" | "leads" | "contracts" | "audit_logs") => hasPermission(user.role, resource, "read", user.permissions as Record<string, boolean> | undefined);
  const [invoices, payments, deals, leads, contracts, audit] = await Promise.all([can("invoices"), can("payments"), can("deals"), can("leads"), can("contracts"), can("audit_logs")]);
  if (!invoices) { dossier.invoices = []; dossier.metrics.totalLtv = 0; dossier.metrics.totalOutstanding = 0; dossier.metrics.invoicesCount = 0; }
  if (!payments) { dossier.payments = []; dossier.metrics.totalPaid = 0; dossier.metrics.settledReceiptsCount = 0; }
  if (!deals) { dossier.deals = []; dossier.metrics.activeDealsCount = 0; dossier.metrics.winRate = 0; dossier.metrics.avgDealSize = 0; }
  if (!leads) dossier.inquiries = [];
  if (!contracts) dossier.contracts = [];
  if (!audit) dossier.activities = [];
  if (!invoices || !payments || !audit) dossier.metrics.lastActivityDate = dossier.contact.updated_at;
  return <Customer360DossierView dossier={dossier} />;
}
