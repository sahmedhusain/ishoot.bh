import { getCurrentPermissions,requirePermission } from "../../../../../lib/auth";
import { getCustomerDossier } from "@ishoot/database";
import { notFound } from "next/navigation";
import { Customer360DossierView } from "../../../../../components/crm/Customer360DossierView";

interface CustomerDossierPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}

export default async function CustomerDossierPage({
  params,
  searchParams,
}: CustomerDossierPageProps) {
  await requirePermission("contacts", "read");
  const { id } = await params;
  const grants = await getCurrentPermissions();
  const can = (resource:string)=>grants[`${resource}:read`] === true;
  const [invoices, payments, deals, leads, contracts, audit] =
    await Promise.all([
      can("invoices"),
      can("payments"),
      can("deals"),
      can("leads"),
      can("contracts"),
      can("audit_logs"),
    ]);
  const filters = await searchParams;
  const dossier = await getCustomerDossier(id, {
    invoices,
    payments,
    deals,
    leads,
    contracts,
    audit,
  }, { q: filters.q, pages: Object.fromEntries(["inquiries", "deals", "invoices", "payments", "contracts", "attachments", "activities"].map(domain => [domain, filters[domain + "Page"] || "1"])) });
  if (!dossier) notFound();
  if (!invoices) {
    dossier.invoices = [];
    dossier.metrics.totalLtv = 0;
    dossier.metrics.totalOutstanding = 0;
    dossier.metrics.invoicesCount = 0;
  }
  if (!payments) {
    dossier.payments = [];
    dossier.metrics.totalPaid = 0;
    dossier.metrics.settledReceiptsCount = 0;
  }
  if (!deals) {
    dossier.deals = [];
    dossier.metrics.activeDealsCount = 0;
    dossier.metrics.winRate = 0;
    dossier.metrics.avgDealSize = 0;
  }
  if (!leads) dossier.inquiries = [];
  if (!contracts) dossier.contracts = [];
  if (!audit) dossier.activities = [];
  if (!invoices || !payments || !audit)
    dossier.metrics.lastActivityDate = dossier.contact.updated_at;
  return <Customer360DossierView dossier={dossier} />;
}
