import { getCurrentUser, hasPermission, requirePagePermission } from "../../../../lib/auth";
import { listRequisitions, requireFeatureEnabled } from "@platform/database";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { RequisitionsListView } from "../../../../components/procurement/RequisitionsListView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("procurement/requisitions");

export const dynamic = "force-dynamic";

export default async function RequisitionsPage() {
  await requirePagePermission("procurement", "create");
  await requireFeatureEnabled("procurement");
  const [user, canReadAll, company] = await Promise.all([getCurrentUser(), hasPermission("procurement", "read"), getCachedCompanySettings()]);
  // People who may only ask to buy see their own requisitions.
  const rows = await listRequisitions(canReadAll ? {} : { requestedById: user!.id });
  return <RequisitionsListView rows={rows} currency={company.default_currency} />;
}
