import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { listPurchaseOrders, requireFeatureEnabled } from "@platform/database";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { PurchaseOrdersListView } from "../../../../components/procurement/PurchaseOrdersListView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("procurement/orders");

export const dynamic = "force-dynamic";

export default async function PurchaseOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePagePermission("procurement", "read");
  await requireFeatureEnabled("procurement");
  const query = await searchParams;
  const text = (key: string) => (typeof query[key] === "string" ? (query[key] as string) : "");
  const filters = { q: text("q"), status: text("status") };
  const [result, company, canCreate] = await Promise.all([listPurchaseOrders({ search: filters.q, status: filters.status, page: Number(text("page")) || 1 }), getCachedCompanySettings(), hasPermission("procurement", "create")]);
  return <PurchaseOrdersListView page={Number(text("page")) || 1} pageSize={25} {...(result as any)} filters={filters} currency={company.default_currency} canCreate={canCreate} />;
}
