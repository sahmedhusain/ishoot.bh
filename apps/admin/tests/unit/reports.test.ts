import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { getTranslations } from "../../locales";
import {
  REPORTS,
  REPORT_AREAS,
  changePercent,
  nextScheduledRun,
  previousPeriod,
  scheduledPeriod,
} from "../../lib/database/constants/reports";
import { ALL_RESOURCES } from "../../lib/database/constants/permissions";
import { buildXlsx } from "../../lib/database/reports/xlsx";

describe("reports", () => {
  test("the period before has the same length and ends the day before", () => {
    expect(previousPeriod("2026-06-01", "2026-06-30")).toEqual({
      from: "2026-05-02",
      to: "2026-05-31",
    });
    expect(previousPeriod("2026-03-01", "2026-03-01")).toEqual({
      from: "2026-02-28",
      to: "2026-02-28",
    });
  });

  test("change against the previous period, and none when there was nothing before", () => {
    expect(changePercent(150, 100)).toBe(50);
    expect(changePercent(50, 100)).toBe(-50);
    expect(changePercent(10, 0)).toBeNull();
  });

  test("scheduled reports cover the day, week or month that just ended and run again after it", () => {
    const now = new Date("2026-07-01T05:00:00Z");
    expect(scheduledPeriod("daily", now)).toEqual({
      from: "2026-06-30",
      to: "2026-06-30",
    });
    expect(scheduledPeriod("weekly", now)).toEqual({
      from: "2026-06-24",
      to: "2026-06-30",
    });
    expect(scheduledPeriod("monthly", now)).toEqual({
      from: "2026-06-01",
      to: "2026-06-30",
    });
    expect(nextScheduledRun("daily", now).toISOString()).toBe(
      "2026-07-02T04:00:00.000Z",
    );
    // 2026-07-01 is a Wednesday: the next Sunday is the 5th.
    expect(nextScheduledRun("weekly", now).toISOString()).toBe(
      "2026-07-05T04:00:00.000Z",
    );
    expect(nextScheduledRun("monthly", now).toISOString()).toBe(
      "2026-08-01T04:00:00.000Z",
    );
  });

  test("every report is guarded by a real resource and has its title, description and columns in both languages", () => {
    for (const report of REPORTS) {
      expect(ALL_RESOURCES, report.key).toContain(report.resource);
      expect(REPORT_AREAS).toContain(report.area);
      if (report.measure)
        expect(report.columns.map((c) => c.key)).toContain(report.measure);
      for (const locale of ["en", "ar"] as const) {
        const copy = (
          getTranslations(locale).admin as unknown as {
            reports: {
              catalog: Record<string, { title: string; description: string }>;
              columns: Record<string, string>;
            };
          }
        ).reports;
        expect(
          copy.catalog[report.key]?.title,
          `${locale} ${report.key}`,
        ).toBeTruthy();
        expect(copy.catalog[report.key]?.description).toBeTruthy();
        for (const column of report.columns)
          expect(
            copy.columns[column.key],
            `${locale} ${column.key}`,
          ).toBeTruthy();
      }
    }
  });

  test("the Excel export is a valid workbook archive", () => {
    const file = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), "xlsx-")),
      "report.xlsx",
    );
    fs.writeFileSync(
      file,
      buildXlsx(
        "Sales",
        ["Name", "Revenue"],
        [
          ["Shoes & bags <new>", 12.5],
          ["حقيبة", 3],
        ],
        true,
      ),
    );
    const listing = execFileSync("unzip", ["-l", file]).toString();
    for (const part of [
      "[Content_Types].xml",
      "xl/workbook.xml",
      "xl/worksheets/sheet1.xml",
      "xl/styles.xml",
    ])
      expect(listing).toContain(part);
    expect(execFileSync("unzip", ["-t", file]).toString()).toContain(
      "No errors detected",
    );
    const sheet = execFileSync("unzip", [
      "-p",
      file,
      "xl/worksheets/sheet1.xml",
    ]).toString();
    expect(sheet).toContain("Shoes &amp; bags &lt;new&gt;");
    expect(sheet).toContain("<v>12.5</v>");
    expect(sheet).toContain('rightToLeft="1"');
  });
});
