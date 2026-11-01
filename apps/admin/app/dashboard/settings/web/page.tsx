import { requirePagePermission } from "../../../../lib/auth";
import { getCmsCounts, getSocialLinks } from "@platform/database";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { WebSettingsView } from "../../../../components/settings/WebSettingsView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("settings/web");

export const dynamic = "force-dynamic";

export default async function WebSettingsPage() {
  await requirePagePermission("settings", "read");

  const [company, cmsCounts, socialLinks] = await Promise.all([
    getCachedCompanySettings(),
    getCmsCounts(),
    getSocialLinks(false),
  ]);

  return <WebSettingsView initialSettings={company} socialLinks={socialLinks} cmsCounts={cmsCounts} />;
}
