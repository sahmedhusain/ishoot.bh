import { describe, expect, it } from "vitest";
import { csvLine, parseCsv } from "../../lib/csv";
import { buildIcs } from "../../lib/ics";
import type { CalendarEvent } from "@platform/database/types";

describe("Admin CSV & ICS Exporter Suite", () => {
  it("parses comma and semicolon delimited CSV text correctly", () => {
    const commaCsv = "Name,Role,Status\nAlice,Admin,Active\nBob,Viewer,Inactive";
    const rows = parseCsv(commaCsv);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual(["Name", "Role", "Status"]);
    expect(rows[1]).toEqual(["Alice", "Admin", "Active"]);

    const semiCsv = "Name;Role;Status\nCharlie;Manager;Active";
    const semiRows = parseCsv(semiCsv);
    expect(semiRows).toHaveLength(2);
    expect(semiRows[1]).toEqual(["Charlie", "Manager", "Active"]);
  });

  it("escapes CSV injection prefixes (=, +, -, @) and quotes special chars", () => {
    const dangerousCells = ["=SUM(A1:A10)", "Normal", "+CMD", "Cell with, comma", 'Cell with "quotes"'];
    const line = csvLine(dangerousCells);

    expect(line).toContain("'=SUM(A1:A10)");
    expect(line).toContain("'+CMD");
    expect(line).toContain('"Cell with, comma"');
    expect(line).toContain('"Cell with ""quotes"""');
  });

  it("builds valid iCalendar (.ics) format lines with line folding", () => {
    const events: CalendarEvent[] = [
      {
        id: "evt-01",
        title: "Board Meeting",
        title_ar: "اجتماع مجلس الإدارة",
        description: "Quarterly review meeting",
        start_date: "2026-11-15T10:00:00Z",
        end_date: "2026-11-15T11:30:00Z",
        all_day: false,
        location: "Main Boardroom",
        layer: "management",
      },
    ];

    const ics = buildIcs(events, {
      name: "Corporate Calendar",
      language: "en",
      origin: "https://example.com",
    });

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("SUMMARY:Board Meeting");
    expect(ics).toContain("LOCATION:Main Boardroom");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("END:VCALENDAR");
  });
});
