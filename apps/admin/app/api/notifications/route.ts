import { serverMessages } from "@platform/locales";
import { NextRequest, NextResponse } from "next/server";
import {
  getNotifications,
  notificationPreview,
} from "@platform/database/queries/notifications";
import { measureOperation } from "@platform/database/observability";
import { getCurrentUser } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return measureOperation("admin:notifications:GET", async () => {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json(
        { error: serverMessages.unauthorized },
        { status: 401 },
      );
    const notifications =
      req.nextUrl.searchParams.get("preview") === "1"
        ? await notificationPreview(
            user.id,
            req.nextUrl.searchParams.get("filter") === "unread",
          )
        : await getNotifications(user.id);
    return NextResponse.json(notifications, {
      headers: { "Cache-Control": "no-store" },
    });
  });
}
