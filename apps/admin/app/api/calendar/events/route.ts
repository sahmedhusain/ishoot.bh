import { serverMessages } from "@ishoot/locales";

import { NextRequest, NextResponse } from "next/server";
import {
  CALENDAR_LAYERS,
  getCalendarFor,
  measureOperation,
  type CalendarLayer,
} from "@ishoot/database";
import { getCurrentUser, hasPermission } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

/** The signed-in user's calendar between two dates: what they may see, by layer. */
export async function GET(request: NextRequest) {
  return measureOperation("admin:calendar/events:GET", async () => {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: serverMessages.unauthorized }, { status: 401 });
    if (!(await hasPermission("calendar", "read")))
      return NextResponse.json({ error: serverMessages.runtimeForbidden }, { status: 403 });
    const params = request.nextUrl.searchParams;
    const day = (value: string | null) =>
      value && /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? new Date(`${value}T00:00:00Z`)
        : null;
    const start = day(params.get("start"));
    const end = day(params.get("end"));
    if (
      !start ||
      !end ||
      end < start ||
      end.getTime() - start.getTime() > 400 * 86_400_000
    )
      return NextResponse.json({ error: serverMessages.runtimeInvalidRange }, { status: 400 });
    end.setUTCHours(23, 59, 59, 999);
    const layers = (
      params.get("layers")?.split(",") ?? [...CALENDAR_LAYERS]
    ).filter((l): l is CalendarLayer =>
      (CALENDAR_LAYERS as readonly string[]).includes(l),
    );
    const events = await getCalendarFor(user.id, start, end, layers);
    return NextResponse.json(events, {
      headers: { "Cache-Control": "private, no-store" },
    });
  });
}
