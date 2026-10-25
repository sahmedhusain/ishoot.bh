import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { listSupplierBills, requireFeatureEnabled } from "@platform/database";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { SupplierBillsListView } from "../../../../components/procurement/SupplierBillsListView";

export const dynamic = "force-dynamic";

export default async function SupplierBillsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePagePermission("procurement", "read");
  await requireFeatureEnabled("procurement");
  const query = await searchParams;
  const status = typeof query.status === "string" ? query.status : "";
  const [rows, company, canCreate] = await Promise.all([listSupplierBills({ status }), getCachedCompanySettings(), hasPermission("procurement", "create")]);
  return <SupplierBillsListView rows={rows} status={status} currency={company.default_currency} canCreate={canCreate} />;
}
