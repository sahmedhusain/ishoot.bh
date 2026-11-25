import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { requireAdminSettingAllowed } from "../../../../lib/admin-governance";
import {
  availablePaymentGateways,
  getStoreSettings,
  listCoupons,
  listGiftCards,
  listOrderReturnRequests,
  listStoreCustomCategories,
  listStoreCustomers,
  requireFeatureEnabled,
} from "@platform/database";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { StoreSettingsView } from "../../../../components/orders/StoreSettingsView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("orders/settings");

export const dynamic = "force-dynamic";

export default async function StoreSettingsPage() {
  await requirePagePermission("settings", "read");
  await requireAdminSettingAllowed("storeSettings");
  await requireFeatureEnabled("store");
  const [
    settings,
    coupons,
    gateways,
    company,
    canEdit,
    canCoupons,
    giftCards,
    storeCustomers,
    returnRequests,
    customCategories,
  ] = await Promise.all([
    getStoreSettings(),
    listCoupons(),
    availablePaymentGateways(),
    getCachedCompanySettings(),
    hasPermission("settings", "edit"),
    hasPermission("orders", "approve"),
    listGiftCards().catch(() => []),
    listStoreCustomers().catch(() => []),
    listOrderReturnRequests().catch(() => []),
    listStoreCustomCategories().catch(() => []),
  ]);
  return (
    <StoreSettingsView
      settings={settings}
      coupons={coupons}
      gateways={gateways}
      currency={company.default_currency}
      languages={company.content_languages}
      canEdit={canEdit}
      canCoupons={canCoupons}
      giftCards={giftCards}
      storeCustomers={storeCustomers}
      returnRequests={returnRequests}
      customCategories={customCategories}
    />
  );
}
