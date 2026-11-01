import { listAgencyInvoices, listCourierAgencies, requireFeatureEnabled, unbilledAgencyShipments } from "@platform/database";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { AgenciesView } from "../../../../components/delivery/AgenciesView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("delivery/agencies");

export const dynamic = "force-dynamic";

export default async function CourierAgenciesPage() {
  await requirePagePermission("deliveries", "assign");
  await requireFeatureEnabled("delivery");
  const [agencies, invoices, company, canInvoice] = await Promise.all([listCourierAgencies(), listAgencyInvoices(), getCachedCompanySettings(), hasPermission("expenses", "create")]);
  const unbilled = Object.fromEntries(await Promise.all(agencies.map(async (a) => [a.id, await unbilledAgencyShipments(a.id)] as const)));
  return <AgenciesView agencies={agencies} unbilled={unbilled} invoices={invoices} currency={company.default_currency} canInvoice={canInvoice} />;
}
