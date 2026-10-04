import { requirePermission } from "../../../../lib/auth";
import { getCompanySettings,getCompanyAssets } from "@ishoot/database";
import { CompanySettingsView } from "../../../../components/settings/CompanySettingsView";

export const dynamic = "force-dynamic";

export default async function CompanySettingsPage() {
  await requirePermission("settings", "read");
  const [settings, assets] = await Promise.all([
    getCompanySettings(),
    getCompanyAssets(),
  ]);

  return (
    <CompanySettingsView initialSettings={settings} initialAssets={assets} />
  );
}
