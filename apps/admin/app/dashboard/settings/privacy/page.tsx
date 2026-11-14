import { requirePagePermission } from "../../../../lib/auth";
import { requireAdminSettingAllowed } from "../../../../lib/admin-governance";
import { DataPrivacyView } from "../../../../components/settings/DataPrivacyView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("settings/privacy");
export const dynamic = "force-dynamic";

export default async function DataPrivacyPage() {
  await requirePagePermission("contacts", "delete");
  await requireAdminSettingAllowed("privacy");
  return <DataPrivacyView />;
}
