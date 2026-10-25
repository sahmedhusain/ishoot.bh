import { hasPermission, requirePagePermission } from "../../../lib/auth";
import { expiringBatches, getStockOverview, listWarehouses, requireFeatureEnabled } from "@platform/database";
import { getCachedCompanySettings } from "../../../lib/cached-queries";
import { InventoryStockView } from "../../../components/inventory/InventoryStockView";

export const dynamic = "force-dynamic";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePagePermission("inventory", "read");
  await requireFeatureEnabled("products");
  const query = await searchParams;
  const text = (key: string) => (typeof query[key] === "string" ? (query[key] as string) : "");
  const filters = { q: text("q"), warehouse: text("warehouse"), filter: text("filter") };
  const [stock, warehouses, expiring, company, canEdit] = await Promise.all([
    getStockOverview({ search: filters.q, warehouseId: filters.warehouse, filter: filters.filter, page: Number(text("page")) || 1 }),
    listWarehouses(),
    expiringBatches(30),
    getCachedCompanySettings(),
    hasPermission("inventory", "edit"),
  ]);
  return <InventoryStockView {...stock} filters={filters} warehouses={warehouses} expiring={expiring} currency={company.default_currency} canEdit={canEdit} />;
}
