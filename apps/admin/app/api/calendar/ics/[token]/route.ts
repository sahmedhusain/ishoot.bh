import { getTranslations, formatMessage } from "@platform/locales";
import { getCompanySettings } from "@platform/database";
import { NextRequest, NextResponse } from "next/server";
import {
  getCalendarFor,
  hasPermission,
  isCalendarSyncEnabled,
  measureOperation,
  resolveCalendarFeedToken,
} from "@platform/database";
import {
  consumeAbuseLimit,
  trustedClientIp,
} from "@platform/database/services/abuse-limits";
import { buildIcs } from "../../../../../lib/ics";
import { publicOrigin } from "../../../../../lib/public-origin";

export const dynamic = "force-dynamic";

/**
 * Public: a person's calendar subscription (Google Calendar "From URL", Outlook, Apple Calendar). The secret token
 * identifies them; the feed lists only what they may see, in the layers they chose.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  return measureOperation("admin:calendar/ics/[token]:GET", async () => {
    const { token } = await params;
    try {
      await consumeAbuseLimit(
        "calendar-ics",
        `${token.slice(0, 16)}:${trustedClientIp(request.headers) ?? "unknown"}`,
        120,
        3600,
      );
    } catch {
      return new NextResponse(null, {
        status: 429,
        headers: { "Retry-After": "3600" },
      });
    }
    if (!(await isCalendarSyncEnabled()))
      return new NextResponse(null, { status: 403 });
    const feed = await resolveCalendarFeedToken(token);
    if (
      !feed ||
      !(await hasPermission(feed.role, "calendar", "read", feed.permissions))
    )
      return new NextResponse(null, { status: 404 });
    const now = Date.now();
    const events = await getCalendarFor(
      feed.userId,
      new Date(now - 60 * 86_400_000),
      new Date(now + 365 * 86_400_000),
      feed.layers,
    );
    const language =
      request.nextUrl.searchParams.get("lang") === "en" ? "en" : "ar";
    const company = await getCompanySettings();
    const body = buildIcs(events, {
      name: formatMessage(getTranslations(language).admin.copy.calendarName, {
        companyName:
          language === "ar" ? company.company_name_ar : company.company_name_en,
      }),
      language,
      origin: await publicOrigin(),
    });
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="company-calendar.ics"',
        "Cache-Control": "private, max-age=900",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  });
}
