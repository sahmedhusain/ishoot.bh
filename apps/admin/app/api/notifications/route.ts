import { NextResponse } from "next/server";
import { getNotifications } from "@ishoot/database/queries/notifications";
import { measureOperation } from "@ishoot/database/observability";
import { getCurrentUser } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return measureOperation("admin:notifications:GET", async () => {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const notifications = await getNotifications(user.id);
    return NextResponse.json(notifications, { headers: { "Cache-Control": "no-store" } });
  });
}
