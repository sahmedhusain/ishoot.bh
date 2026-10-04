import { getLatestSocialMetrics } from "@ishoot/database";
import { requirePermission } from "../../../lib/auth";
import { SocialAnalyticsView } from "../../../components/analytics/SocialAnalyticsView";

export const dynamic = "force-dynamic";

export default async function SocialAnalyticsPage() {
  await requirePermission("reports", "read");
  const metrics = await getLatestSocialMetrics();
  return <SocialAnalyticsView metrics={metrics} />;
}
