import { db, getSocialAnalytics, listSocialPlans } from "@platform/database";
import { requirePagePermission } from "../../../lib/auth";
import { SocialAnalyticsView } from "../../../components/analytics/SocialAnalyticsView";
import { pageMetadata } from "../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("analytics");

export const dynamic = "force-dynamic";

export default async function SocialAnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string; platform?: string }> }) {
  await requirePagePermission("social", "read");
  const params = await searchParams;
  const [analytics, plans, team] = await Promise.all([
    getSocialAnalytics({ days: Number(params.days) || 30, platform: params.platform ?? null }),
    listSocialPlans(),
    db.user.findMany({ where: { isActive: true }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }),
  ]);
  return <SocialAnalyticsView analytics={analytics} plans={plans} team={team} platform={params.platform ?? null} />;
}
