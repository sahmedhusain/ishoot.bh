import { notFound } from "next/navigation";
import { hasPermission, requirePagePermission } from "../../../../../lib/auth";
import { getStockCount, listWarehouses, requireFeatureEnabled } from "@platform/database";
import { StockCountView } from "../../../../../components/inventory/StockCountView";

export const dynamic = "force-dynamic";

export default async function StockCountPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePagePermission("inventory", "read");
  await requireFeatureEnabled("products");
  const { id } = await params;
  const [count, warehouses, canEdit, canApprove] = await Promise.all([getStockCount(id, actor.id), listWarehouses(actor.id), hasPermission("inventory", "edit"), hasPermission("inventory", "approve")]);
  if (!count) notFound();
  const locations = warehouses.find((w) => w.id === count.warehouse_id)?.locations.filter((l) => l.is_active) ?? [];
  return <StockCountView count={count} locations={locations} canEdit={canEdit} canApprove={canApprove} />;
}
