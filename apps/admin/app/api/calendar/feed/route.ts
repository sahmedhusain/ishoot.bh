import { NextResponse } from "next/server";
import { getCalendarEvents } from "@ishoot/database";

function formatIcsDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export async function GET(request: Request) {
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
      const summary = (ev.title || "Production Event").replace(/\n/g, " ");
      const desc = (ev.description || (ev.deal ? `Deal: ${ev.deal.title}` : "")).replace(/\n/g, "\\n");
      const loc = (ev.location || "Bahrain").replace(/\n/g, " ");

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
        "END:VEVENT"
      );
    }

    icsLines.push("END:VCALENDAR");

    const icsContent = icsLines.join("\r\n");

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="ishoot-calendar.ics"',
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    console.error("Failed to generate iCal feed:", error);
    return new NextResponse("Error generating calendar feed", { status: 500 });
  }
}
