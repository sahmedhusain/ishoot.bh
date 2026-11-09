import { serverMessages } from "@platform/locales";
import {
  getInboxItem,
  getNotificationPreferences,
  isApiError,
  listInbox,
  listMutedRecords,
  type InboxFilter,
} from "@platform/api-client";
import { NextRequest, NextResponse } from "next/server";
import { measureOperation } from "@platform/database/observability";
import { getCurrentUser } from "../../../lib/auth";
import { myInboxOwner } from "../../../lib/inbox";

export const dynamic = "force-dynamic";

const FILTERS: InboxFilter[] = ["all", "unread", "read", "archived", "muted"];
const noStore = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  return measureOperation("admin:notifications:GET", async () => {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: serverMessages.unauthorized }, { status: 401 });
    const owner = await myInboxOwner();
    const q = req.nextUrl.searchParams;
    try {
      const id = q.get("id");
      if (id) return NextResponse.json(await getInboxItem(owner, id), { headers: noStore });
      const view = q.get("view") ?? "preview";
      if (view === "settings") {
        const [preferences, mutes] = await Promise.all([getNotificationPreferences(owner), listMutedRecords(owner)]);
        return NextResponse.json({ preferences, mutes, categories: owner.categories }, { headers: noStore });
      }
      const filter = FILTERS.find((f) => f === q.get("filter")) ?? "all";
      const category = q.get("category") || undefined;
      if (view === "page") {
        const limit = Math.min(100, Math.max(1, Number(q.get("limit")) || 30));
        const page = await listInbox(owner, { filter, category, limit, cursor: q.get("cursor") || undefined });
        return NextResponse.json(page, { headers: noStore });
      }
      const page = await listInbox(owner, { filter: filter === "unread" ? "unread" : "all", limit: 8 });
      return NextResponse.json({ items: page.items, unreadCount: page.unread }, { headers: noStore });
    } catch (error) {
      if (isApiError(error, "notification_not_found")) return NextResponse.json(null, { status: 404 });
      if (isApiError(error) && error.status === 422) return NextResponse.json(null, { status: 400 });
      console.error("Reading notifications from notify failed:", error);
      return NextResponse.json({ error: serverMessages.notificationNotFound }, { status: 503 });
    }
  });
}
