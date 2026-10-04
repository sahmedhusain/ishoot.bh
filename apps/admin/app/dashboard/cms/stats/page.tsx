import { requirePermission } from "../../../../lib/auth";
import { getStatistics } from "@ishoot/database";
import { StatsManagementView } from "../../../../components/cms/StatsManagementView";

export default async function StatsSettingsPage() {
  await requirePermission("stats", "read");

  const stats = await getStatistics();

  return <StatsManagementView initialStats={stats} />;
}
