import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { getCompanyAssets, listTaxRates } from "@platform/database";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { CompanySettingsView } from "../../../../components/settings/CompanySettingsView";

export const dynamic = "force-dynamic";

export default async function CompanySettingsPage() {
  await requirePagePermission("settings", "read");
  const [settings, assets, taxes, canEditTaxes] = await Promise.all([
    getCachedCompanySettings(),
    getCompanyAssets(),
    listTaxRates(),
    hasPermission("settings", "write"),
  ]);

  return (
    <CompanySettingsView initialSettings={settings} initialAssets={assets} taxes={taxes} canEditTaxes={canEditTaxes} />
  );
}
