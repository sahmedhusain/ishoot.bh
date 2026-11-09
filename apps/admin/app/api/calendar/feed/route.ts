import {
  serverMessages,
  getTranslations,
  formatMessage,
} from "@platform/locales";

import { getCompanySettings } from "@platform/database";
import { measureOperation, getCalendarFor } from "@platform/database";
import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "../../../../lib/auth";
import { buildIcs } from "../../../../lib/ics";
import { publicOrigin } from "../../../../lib/public-origin";

export async function GET() {
  return measureOperation("admin:calendar/feed:GET", async () => {
    const user = await getCurrentUser();
    if (!user)
      return new NextResponse(serverMessages.unauthorized, { status: 401 });
    if (!(await hasPermission("calendar", "read")))
      return new NextResponse(serverMessages.runtimeForbidden, { status: 403 });
    try {
      const now = Date.now();
      const events = await getCalendarFor(
        user.id,
        new Date(now - 60 * 86_400_000),
        new Date(now + 365 * 86_400_000),
      );
      const company = await getCompanySettings();
      return new NextResponse(
        buildIcs(events, {
          name: formatMessage(getTranslations("en").admin.copy.calendarName, {
            companyName: company.company_name_en,
          }),
          language: "en",
          origin: await publicOrigin(),
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": 'inline; filename="company-calendar.ics"',
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
          },
        },
      );
    } catch (error) {
      console.error("Failed to generate iCal feed:", error);
      return new NextResponse("Error generating calendar feed", {
        status: 500,
      });
    }
  });
}
