import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { listWarehouses, requireFeatureEnabled } from "@platform/database";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { WarehousesView } from "../../../../components/inventory/WarehousesView";

export const dynamic = "force-dynamic";

export default async function WarehousesPage() {
  await requirePagePermission("inventory", "read");
  await requireFeatureEnabled("products");
  const [warehouses, company, canEdit] = await Promise.all([listWarehouses(), getCachedCompanySettings(), hasPermission("inventory", "edit")]);
  return <WarehousesView warehouses={warehouses} languages={company.content_languages} canEdit={canEdit} />;
}
