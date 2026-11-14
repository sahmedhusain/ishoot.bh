import React from "react";
import { describe, expect, test } from "vitest";
import { Document, Page, Text, renderToBuffer } from "@react-pdf/renderer";
import { PDF_FONT, registerPdfFont } from "../../lib/pdf/shared-styles";

describe("PDF font registration and buffer rendering", () => {
  test("registerPdfFont resolves local TTF fonts for English and Arabic without falling back to broken woff2", async () => {
    const registered = await registerPdfFont({
      fontBody: "/api/files/raw/thmanyahseriftext-regular.woff2",
    } as never);
    expect(registered).toBe(true);

    const doc = React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: "A4", style: { fontFamily: PDF_FONT } },
        React.createElement(Text, null, "Invoice INV-2026-0001 — BHD 125.000"),
        React.createElement(Text, null, "فاتورة ضريبية — شركة آي شوت البحرين"),
      ),
    );
    const buffer = await renderToBuffer(doc);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  });
});
