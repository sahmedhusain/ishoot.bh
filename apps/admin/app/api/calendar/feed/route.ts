import { measureOperation } from "@ishoot/database";
import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";
import { hasPermission } from "@ishoot/database";
import { getCalendarEvents } from "@ishoot/database";

function formatIcsDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

export async function GET(request: Request) {
  return measureOperation("admin:calendar/feed:GET", async () => {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (
    !(await hasPermission(
      user.role,
      "calendar",
      "read",
      user.permissions as Record<string, boolean> | undefined,
    ))
  )
    return new NextResponse("Forbidden", { status: 403 });
  try {
    const events = await getCalendarEvents();

    let icsLines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ishoot.bh//Production Calendar//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:ishoot Production Calendar",
      "X-WR-TIMEZONE:Asia/Bahrain",
    ];

    for (const ev of events) {
      const dtStart = formatIcsDate(ev.start_date);
      const dtEnd = formatIcsDate(ev.end_date);
      const summary = escapeIcsText(ev.title || "Production Event");
      const desc = escapeIcsText(
        ev.description || (ev.deal ? `Deal: ${ev.deal.title}` : ""),
      );
      const loc = escapeIcsText(ev.location || "");

      icsLines.push(
        "BEGIN:VEVENT",
        `UID:${ev.id}@ishoot.bh`,
        `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${desc}`,
        `LOCATION:${loc}`,
        "STATUS:CONFIRMED",
        "END:VEVENT",
      );
    }

    icsLines.push("END:VCALENDAR");

    const icsContent = icsLines.join("\r\n");

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="ishoot-calendar.ics"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Failed to generate iCal feed:", error);
    return new NextResponse("Error generating calendar feed", { status: 500 });
  }

  });
}
