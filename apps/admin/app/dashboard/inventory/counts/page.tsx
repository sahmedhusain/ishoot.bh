import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { listProductCategories, listStockCounts, listWarehouses, requireFeatureEnabled } from "@platform/database";
import { StockCountsView } from "../../../../components/inventory/StockCountsView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("inventory/counts");

export const dynamic = "force-dynamic";

export default async function StockCountsPage() {
  const actor = await requirePagePermission("inventory", "read");
  await requireFeatureEnabled("products");
  const [counts, warehouses, categories, canCreate] = await Promise.all([listStockCounts(actor.id), listWarehouses(actor.id), listProductCategories(), hasPermission("inventory", "create")]);
  return <StockCountsView counts={counts} warehouses={warehouses} categories={categories} canCreate={canCreate} />;
}
