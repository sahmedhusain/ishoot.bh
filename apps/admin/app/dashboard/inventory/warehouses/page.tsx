import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { listWarehouses, requireFeatureEnabled } from "@platform/database";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { WarehousesView } from "../../../../components/inventory/WarehousesView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("inventory/warehouses");

export const dynamic = "force-dynamic";

export default async function WarehousesPage() {
  const actor = await requirePagePermission("inventory", "read");
  await requireFeatureEnabled("products");
  const [warehouses, company, canEdit] = await Promise.all([listWarehouses(actor.id), getCachedCompanySettings(), hasPermission("inventory", "edit")]);
  return <WarehousesView warehouses={warehouses} languages={company.content_languages} canEdit={canEdit} />;
}
