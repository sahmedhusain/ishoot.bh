import { listCampaigns, requireFeatureEnabled } from "@platform/database";
import { hasPermission, requirePagePermission } from "../../../lib/auth";
import { getCachedCompanySettings } from "../../../lib/cached-queries";
import { CampaignsView } from "../../../components/outreach/CampaignsView";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  await requirePagePermission("marketing", "read");
  await requireFeatureEnabled("marketing");
  const [campaigns, company, canEdit] = await Promise.all([listCampaigns(), getCachedCompanySettings(), hasPermission("marketing", "edit")]);
  const web = (process.env.WEB_URL || process.env.NEXT_PUBLIC_WEB_URL || "").replace(/\/$/, "");
  return <CampaignsView campaigns={campaigns} currency={company.default_currency} canEdit={canEdit} websiteUrl={web} />;
}
