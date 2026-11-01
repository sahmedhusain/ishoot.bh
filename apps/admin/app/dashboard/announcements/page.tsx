import {
  announcementRights,
  listAnnouncements,
  getCommunicationSettings,
  type AnnouncementView,
} from "@platform/database";
import { requireAuth, hasPermission } from "../../../lib/auth";
import { AnnouncementsListView } from "../../../components/communications/AnnouncementsListView";
import { pageMetadata } from "../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("announcements");

export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const actor = await requireAuth();
  const query = await searchParams;
  const view: AnnouncementView = ["unread", "hidden", "manage"].includes(
    query.view ?? "",
  )
    ? (query.view as AnnouncementView)
    : "inbox";
  const [rights, settings, canSettings, items] = await Promise.all([
    announcementRights(actor),
    getCommunicationSettings(),
    hasPermission("settings", "edit"),
    listAnnouncements(actor, view),
  ]);
  return (
    <AnnouncementsListView
      items={items}
      view={view}
      canCreate={rights.createTeam}
      canSettings={canSettings}
      managersAnnounce={settings.managersAnnounceToTeam}
    />
  );
}
