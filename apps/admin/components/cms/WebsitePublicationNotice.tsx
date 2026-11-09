import { getWebsitePublicationStatus, type WebsiteSnapshotSection } from "@platform/database";
import { hasPermission } from "../../lib/auth";
import { UnpublishedChangesNotice } from "./UnpublishedChangesNotice";

export async function WebsitePublicationNotice({ section }: { section: WebsiteSnapshotSection }) {
  const [status, canPublish] = await Promise.all([
    getWebsitePublicationStatus(),
    hasPermission("settings", "write"),
  ]);
  return <UnpublishedChangesNotice section={section} status={status} canPublish={canPublish} />;
}
