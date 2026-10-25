import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { listProductCategories, listStockCounts, listWarehouses, requireFeatureEnabled } from "@platform/database";
import { StockCountsView } from "../../../../components/inventory/StockCountsView";

export const dynamic = "force-dynamic";

export default async function StockCountsPage() {
  await requirePagePermission("inventory", "read");
  await requireFeatureEnabled("products");
  const [counts, warehouses, categories, canCreate] = await Promise.all([listStockCounts(), listWarehouses(), listProductCategories(), hasPermission("inventory", "create")]);
  return <StockCountsView counts={counts} warehouses={warehouses} categories={categories} canCreate={canCreate} />;
}
