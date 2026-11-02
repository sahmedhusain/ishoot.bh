import { hasPermission, requirePagePermission } from "../../../lib/auth";
import { listOrders, requireFeatureEnabled } from "@platform/database";
import { getCachedCompanySettings } from "../../../lib/cached-queries";
import { OrdersListView } from "../../../components/orders/OrdersListView";
import { pageMetadata } from "../../../lib/company-metadata";
import { LiveRefresh } from "../../../components/live/LiveRefresh";

export const generateMetadata = () => pageMetadata("orders");

export const dynamic = "force-dynamic";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePagePermission("orders", "read");
  await requireFeatureEnabled("store");
  const query = await searchParams;
  const text = (key: string) => (typeof query[key] === "string" ? (query[key] as string) : "");
  const filters = { q: text("q"), status: text("status"), channel: text("channel") };
  const [result, company, canCreate] = await Promise.all([listOrders({ search: filters.q, status: filters.status, channel: filters.channel, page: Number(text("page")) || 1 }), getCachedCompanySettings(), hasPermission("orders", "create")]);
  return (
    <>
      <LiveRefresh resources={["orders"]} notificationCategories={["sales"]} />
      <OrdersListView {...result} filters={filters} currency={company.default_currency} canCreate={canCreate} />
    </>
  );
}
