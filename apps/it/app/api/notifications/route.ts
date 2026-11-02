import {
  getITStatus,
  getMyInboxItem,
  getMyNotificationPreferences,
  isApiError,
  listMyInbox,
  listMyMutedRecords,
  type InboxFilter,
} from "@platform/api-client";
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "../../../lib/session";

export const dynamic = "force-dynamic";

const FILTERS: InboxFilter[] = ["all", "unread", "read", "archived", "muted"];
const noStore = { "Cache-Control": "no-store" };

/**
 * The signed-in IT account's notifications (docs/adr/0012), read with their own token:
 *   ?view=preview[&filter=unread]   the latest ten and the unread count
 *   ?id=<id>                        one notification (for a live pop-up)
 *   ?view=settings                  their settings, muted records and status
 */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json(null, { status: 401 });
  const q = req.nextUrl.searchParams;
  try {
    const id = q.get("id");
    if (id) return NextResponse.json(await getMyInboxItem(user.token, id), { headers: noStore });
    if (q.get("view") === "settings") {
      const [preferences, mutes, status] = await Promise.all([
        getMyNotificationPreferences(user.token),
        listMyMutedRecords(user.token),
        getITStatus(user.token).catch(() => null),
      ]);
      return NextResponse.json({ preferences, mutes, status }, { headers: noStore });
    }
    const filter = FILTERS.find((f) => f === q.get("filter")) ?? "all";
    const page = await listMyInbox(user.token, { filter, limit: 10 });
    return NextResponse.json({ items: page.items, unreadCount: page.unread }, { headers: noStore });
  } catch (error) {
    if (isApiError(error) && error.status === 401) return NextResponse.json(null, { status: 401 });
    if (isApiError(error, "notification_not_found")) return NextResponse.json(null, { status: 404 });
    return NextResponse.json(null, { status: 503 });
  }
}
