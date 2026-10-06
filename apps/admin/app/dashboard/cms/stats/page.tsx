import { requirePagePermission } from "../../../../lib/auth";
import { getStatistics } from "@ishoot/database";
import { StatsManagementView } from "../../../../components/cms/StatsManagementView";
import { WebsitePublicationNotice } from "../../../../components/cms/WebsitePublicationNotice";

export default async function StatsSettingsPage() {
  await requirePagePermission("stats", "read");

  const stats = await getStatistics();

  return (
    <div className="space-y-4">
      <WebsitePublicationNotice section="stats" />
      <StatsManagementView initialStats={stats} />
    </div>
  );
}
