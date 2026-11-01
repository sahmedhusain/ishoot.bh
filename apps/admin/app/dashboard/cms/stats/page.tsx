import { requirePagePermission } from "../../../../lib/auth";
import { getCompanySettings, getStatistics } from "@platform/database";
import { StatsManagementView } from "../../../../components/cms/StatsManagementView";
import { WebsitePublicationNotice } from "../../../../components/cms/WebsitePublicationNotice";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("cms/stats");

export default async function StatsSettingsPage() {
  await requirePagePermission("stats", "read");

  const [stats, company] = await Promise.all([getStatistics(), getCompanySettings()]);

  return (
    <div className="space-y-4">
      <WebsitePublicationNotice section="stats" />
      <StatsManagementView initialStats={stats} languages={company.content_languages} />
    </div>
  );
}
