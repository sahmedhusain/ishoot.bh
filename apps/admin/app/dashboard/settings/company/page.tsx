import { requirePermission } from "../../../../lib/auth";
import { getCompanyAssets } from "@ishoot/database";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { CompanySettingsView } from "../../../../components/settings/CompanySettingsView";

export const dynamic = "force-dynamic";

export default async function CompanySettingsPage() {
  await requirePermission("settings", "read");
  const [settings, assets] = await Promise.all([
    getCachedCompanySettings(),
    getCompanyAssets(),
  ]);

  return (
    <CompanySettingsView initialSettings={settings} initialAssets={assets} />
  );
}
