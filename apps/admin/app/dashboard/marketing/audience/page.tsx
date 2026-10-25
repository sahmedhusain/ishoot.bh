import { listBroadcasts, listCampaigns, listSegments, requireFeatureEnabled } from "@platform/database";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { AudienceView } from "../../../../components/outreach/AudienceView";

export const dynamic = "force-dynamic";

export default async function AudiencePage() {
  await requirePagePermission("marketing", "read");
  await requireFeatureEnabled("marketing");
  const [segments, broadcasts, campaigns, company, canEdit] = await Promise.all([listSegments(), listBroadcasts(), listCampaigns(), getCachedCompanySettings(), hasPermission("marketing", "edit")]);
  return <AudienceView segments={segments} broadcasts={broadcasts} campaigns={campaigns.map((c) => ({ id: c.id, name: c.name }))} currency={company.default_currency} languages={company.content_languages} canEdit={canEdit} />;
}
