import { getTranslations } from "@ishoot/locales";
import type { CalendarEvent } from "@ishoot/database/types";

const stamp = (value: string | Date) =>
  new Date(value)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
const dateOnly = (value: string) => value.slice(0, 10).replace(/-/g, "");
const escape = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
/** Lines longer than 75 octets are folded, as calendar apps expect. */
const fold = (line: string) => {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let part = "",
    bytes = 0;
  for (const character of line) {
    const size = encoder.encode(character).length;
    if (bytes + size > 75) {
      parts.push(part);
      part = " ";
      bytes = 1;
    }
    part += character;
    bytes += size;
  }
  parts.push(part);
  return parts.join("\r\n");
};

/** An iCalendar (RFC 5545) document for subscription by Google Calendar, Outlook or Apple Calendar. */
export function buildIcs(
  events: CalendarEvent[],
  options: { name: string; language: "ar" | "en"; origin: string },
) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${escape(new URL(options.origin).hostname)}//Company Calendar//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escape(options.name)}`,
    "X-WR-TIMEZONE:Asia/Bahrain",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  const now = stamp(new Date());
  for (const ev of events) {
    const title =
      options.language === "ar" && ev.title_ar ? ev.title_ar : ev.title;
    const description = [
      ev.description,
      ev.href ? `${options.origin}${ev.href}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${ev.id.replace(/[^A-Za-z0-9:_-]/g, "")}@${new URL(options.origin).hostname}`,
      `DTSTAMP:${now}`,
    );
    if (ev.all_day) {
      // All-day items end on the day after (exclusive), in the company's calendar days.
      const end = new Date(`${ev.end_date.slice(0, 10)}T00:00:00Z`);
      end.setUTCDate(end.getUTCDate() + 1);
      lines.push(
        `DTSTART;VALUE=DATE:${dateOnly(ev.start_date)}`,
        `DTEND;VALUE=DATE:${dateOnly(end.toISOString())}`,
      );
    } else
      lines.push(
        `DTSTART:${stamp(ev.start_date)}`,
        `DTEND:${stamp(ev.end_date)}`,
      );
    lines.push(`SUMMARY:${escape(title || getTranslations(options.language).admin.calendarMessages.event)}`);
    if (description) lines.push(`DESCRIPTION:${escape(description)}`);
    if (ev.location) lines.push(`LOCATION:${escape(ev.location)}`);
    if (ev.layer) lines.push(`CATEGORIES:${escape(ev.layer)}`);
    lines.push("STATUS:CONFIRMED", "TRANSP:TRANSPARENT", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n");
}
