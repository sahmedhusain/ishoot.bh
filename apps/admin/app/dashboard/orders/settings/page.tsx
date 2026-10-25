import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { availablePaymentGateways, getStoreSettings, listCoupons, requireFeatureEnabled } from "@platform/database";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { StoreSettingsView } from "../../../../components/orders/StoreSettingsView";

export const dynamic = "force-dynamic";

export default async function StoreSettingsPage() {
  await requirePagePermission("settings", "read");
  await requireFeatureEnabled("store");
  const [settings, coupons, gateways, company, canEdit, canCoupons] = await Promise.all([getStoreSettings(), listCoupons(), availablePaymentGateways(), getCachedCompanySettings(), hasPermission("settings", "edit"), hasPermission("orders", "approve")]);
  return <StoreSettingsView settings={settings} coupons={coupons} gateways={gateways} currency={company.default_currency} languages={company.content_languages} canEdit={canEdit} canCoupons={canCoupons} />;
}
