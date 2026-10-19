import { notificationInbox } from "@ishoot/database";
import { requireAuth } from "../../../lib/auth";
import { NotificationInboxView } from "../../../components/communications/NotificationInboxView";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  const user = await requireAuth();
  const query = await searchParams;
  const filter = ["hidden", "unread"].includes(query.filter ?? "")
    ? query.filter!
    : "all";
  const page = Math.max(
    1,
    Math.min(10000, Number.parseInt(query.page ?? "1", 10) || 1),
  );
  return (
    <NotificationInboxView
      {...await notificationInbox(user.id, filter, page)}
      filter={filter}
      page={page}
    />
  );
}
