import { getSocialAnalytics, listSocialPlans } from "@platform/database";
import { listEmployees } from "@platform/api-client";
import { requirePagePermission } from "../../../lib/auth";
import { SocialAnalyticsView } from "../../../components/analytics/SocialAnalyticsView";
import { pageMetadata } from "../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("analytics");

export const dynamic = "force-dynamic";

export default async function SocialAnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string; platform?: string }> }) {
  await requirePagePermission("social", "read");
  const params = await searchParams;
  const [analytics, plans, rawEmployees] = await Promise.all([
    getSocialAnalytics({ days: Number(params.days) || 30, platform: params.platform ?? null }),
    listSocialPlans(),
    listEmployees().catch(() => []),
  ]);
  const team = rawEmployees.map((e) => ({
    id: e.id,
    fullName: `${e.first_name_en || ""} ${e.last_name_en || ""}`.trim() || e.id,
  }));
  return <SocialAnalyticsView analytics={analytics} plans={plans} team={team} platform={params.platform ?? null} />;
}
