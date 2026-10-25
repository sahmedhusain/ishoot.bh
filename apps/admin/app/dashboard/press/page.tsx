import { coverageSummary, listCoverage, listMediaContacts, listPressReleases, requireFeatureEnabled } from "@platform/database";
import { hasPermission, requirePagePermission } from "../../../lib/auth";
import { PressView } from "../../../components/outreach/PressView";

export const dynamic = "force-dynamic";

export default async function PressPage() {
  await requirePagePermission("press", "read");
  await requireFeatureEnabled("pr");
  const [releases, contacts, coverage, summary, canEdit, canWrite] = await Promise.all([listPressReleases(), listMediaContacts(), listCoverage(), coverageSummary(), hasPermission("press", "edit"), hasPermission("articles", "create")]);
  return <PressView releases={releases} contacts={contacts} coverage={coverage} summary={summary} canEdit={canEdit} canWriteRelease={canWrite} />;
}
