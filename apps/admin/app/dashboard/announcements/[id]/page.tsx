import { notFound } from "next/navigation";
import {
  announcementRights,
  getAnnouncement,
  findPendingApproval,
  canDecideApproval,
  getSignatureMode,
} from "@ishoot/database";
import { requireAuth } from "../../../../lib/auth";
import { communicationOptions } from "../../../../lib/communication-options";
import { AnnouncementDetailView } from "../../../../components/communications/AnnouncementDetailView";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireAuth();
  const { id } = await params;
  const item = await getAnnouncement(id, actor);
  if (!item) notFound();
  const [rights, pending, mode] = await Promise.all([
    announcementRights(actor),
    findPendingApproval("announcement", id),
    getSignatureMode("announcement"),
  ]);
  return (
    <AnnouncementDetailView
      item={item}
      options={
        item.canEdit
          ? await communicationOptions()
          : { users: [], departments: [], roles: [] }
      }
      createAny={rights.createAny}
      approvalId={
        pending && canDecideApproval(pending, actor) ? pending.id : null
      }
      live={mode === "live"}
    />
  );
}
