import { getDeliverySettings, listDeliveryZones, listSharedSlots, requireFeatureEnabled } from "@platform/database";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { DeliverySettingsView } from "../../../../components/delivery/DeliverySettingsView";

export const dynamic = "force-dynamic";

export default async function DeliverySettingsPage() {
  await requirePagePermission("settings", "read");
  await requireFeatureEnabled("delivery");
  const [settings, zones, shared, company, canEdit] = await Promise.all([getDeliverySettings(), listDeliveryZones(), listSharedSlots(), getCachedCompanySettings(), hasPermission("settings", "edit")]);
  return <DeliverySettingsView settings={settings} zones={zones} sharedSlots={shared} currency={company.default_currency} languages={company.content_languages} canEdit={canEdit} />;
}
