import { getWebsitePublicationStatus, listCmsPages, requireFeatureEnabled } from "@platform/database";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { PagesListView } from "../../../../components/cms/PagesListView";

export const dynamic = "force-dynamic";

export default async function CmsPagesPage() {
  await requirePagePermission("pages", "read");
  await requireFeatureEnabled("cms");
  const [pages, publication, canEdit, canCreate, canDelete, canPublish] = await Promise.all([
    listCmsPages(),
    getWebsitePublicationStatus(),
    hasPermission("pages", "edit"),
    hasPermission("pages", "create"),
    hasPermission("pages", "delete"),
    hasPermission("settings", "write"),
  ]);
  return <PagesListView pages={pages} canEdit={canEdit} canCreate={canCreate} canDelete={canDelete} canPublish={canPublish} publication={publication} />;
}
