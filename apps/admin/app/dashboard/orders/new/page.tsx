import { requirePagePermission } from "../../../../lib/auth";
import { getStoreSettings, requireFeatureEnabled, saleProductOptions } from "@platform/database";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { NewSaleView } from "../../../../components/orders/NewSaleView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("orders/new");

export const dynamic = "force-dynamic";

export default async function NewSalePage() {
  await requirePagePermission("orders", "create");
  await requireFeatureEnabled("store");
  const [products, company, settings] = await Promise.all([saleProductOptions(), getCachedCompanySettings(), getStoreSettings()]);
  return <NewSaleView products={products} currency={company.default_currency} deliveryEnabled={settings.delivery_enabled} />;
}
