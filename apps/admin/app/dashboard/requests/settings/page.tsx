import { getServiceSettings, listCannedReplies } from "@platform/database";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { ServiceSettingsView } from "../../../../components/requests/ServiceSettingsView";

export const dynamic = "force-dynamic";

export default async function ServiceSettingsPage() {
  await requirePagePermission("requests", "edit");
  const [settings, replies, company, canEditTimes] = await Promise.all([getServiceSettings(), listCannedReplies(), getCachedCompanySettings(), hasPermission("settings", "edit")]);
  return <ServiceSettingsView settings={settings} replies={replies} languages={company.content_languages} canEditTimes={canEditTimes} />;
}
