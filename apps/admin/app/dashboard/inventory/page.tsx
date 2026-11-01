import { hasPermission, requirePagePermission } from "../../../lib/auth";
import { expiringBatches, getStockOverview, listWarehouses, requireFeatureEnabled } from "@platform/database";
import { getCachedCompanySettings } from "../../../lib/cached-queries";
import { InventoryStockView } from "../../../components/inventory/InventoryStockView";
import { pageMetadata } from "../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("inventory");

export const dynamic = "force-dynamic";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await requirePagePermission("inventory", "read");
  await requireFeatureEnabled("products");
  const query = await searchParams;
  const text = (key: string) => (typeof query[key] === "string" ? (query[key] as string) : "");
  const filters = { q: text("q"), warehouse: text("warehouse"), filter: text("filter") };
  const [stock, warehouses, expiring, company, canEdit] = await Promise.all([
    getStockOverview({ search: filters.q, warehouseId: filters.warehouse, filter: filters.filter, page: Number(text("page")) || 1 }, actor.id),
    listWarehouses(actor.id),
    expiringBatches(30, actor.id),
    getCachedCompanySettings(),
    hasPermission("inventory", "edit"),
  ]);
  return <InventoryStockView {...stock} filters={filters} warehouses={warehouses} expiring={expiring} currency={company.default_currency} canEdit={canEdit} />;
}
