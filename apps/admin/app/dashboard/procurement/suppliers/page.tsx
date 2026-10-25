import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { listSuppliers, requireFeatureEnabled, supplierPerformance } from "@platform/database";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { SuppliersView } from "../../../../components/procurement/SuppliersView";

export const dynamic = "force-dynamic";

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePagePermission("procurement", "read");
  await requireFeatureEnabled("procurement");
  const query = await searchParams;
  const search = typeof query.q === "string" ? query.q : "";
  const [suppliers, performance, company, canEdit] = await Promise.all([listSuppliers(search), supplierPerformance(), getCachedCompanySettings(), hasPermission("procurement", "edit")]);
  return <SuppliersView suppliers={suppliers} performance={performance} currency={company.default_currency} search={search} canEdit={canEdit} />;
}
