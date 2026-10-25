import { requirePagePermission } from "../../../../lib/auth";
import { listMovements, listWarehouses, requireFeatureEnabled } from "@platform/database";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { StockMovementsView } from "../../../../components/inventory/StockMovementsView";

export const dynamic = "force-dynamic";

export default async function StockMovementsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePagePermission("inventory", "read");
  await requireFeatureEnabled("products");
  const query = await searchParams;
  const text = (key: string) => (typeof query[key] === "string" ? (query[key] as string) : "");
  const filters = { productId: text("productId"), warehouse: text("warehouse"), type: text("type"), from: text("from"), to: text("to") };
  const [result, warehouses, company] = await Promise.all([
    listMovements({ productId: filters.productId, warehouseId: filters.warehouse, type: filters.type, from: filters.from, to: filters.to, page: Number(text("page")) || 1 }),
    listWarehouses(),
    getCachedCompanySettings(),
  ]);
  return <StockMovementsView {...result} filters={filters} warehouses={warehouses} currency={company.default_currency} />;
}
