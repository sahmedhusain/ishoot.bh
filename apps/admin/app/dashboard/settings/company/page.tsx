import { requirePagePermission } from "../../../../lib/auth";
import { requireAdminSettingAllowed } from "../../../../lib/admin-governance";
import { getCompanyAssets } from "@platform/database";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { CompanySettingsView } from "../../../../components/settings/CompanySettingsView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("settings/company");

export const dynamic = "force-dynamic";

export default async function CompanySettingsPage() {
  await requirePagePermission("settings", "read");
  await requireAdminSettingAllowed("company");
  const [settings, assets] = await Promise.all([
    getCachedCompanySettings(),
    getCompanyAssets(),
  ]);

  return (
    <CompanySettingsView initialSettings={settings} initialAssets={assets} />
  );
}
