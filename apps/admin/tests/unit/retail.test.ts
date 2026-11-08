import { describe, expect, test } from "vitest";
import { expectedDrawerCash } from "../../lib/finance/journal";
import {
  convertPackagingQuantity,
  assertPackageParent,
  expandSerialRange,
  uniqueSerials,
  validateStockLabelTemplate,
} from "../../lib/constants/stock-traceability";

describe("retail and closing calculations", () => {
  test("expectedDrawerCash computes opening + receipts + in - refunds - out - drops", () => {
    const cash = expectedDrawerCash(
      {
        opening: "100.000",
        receipts: "250.500",
        change: "0.000",
        refunds: "20.000",
        cashIn: "50.000",
        cashOut: "10.000",
        drops: "150.000",
      },
      "BHD",
    );
    // 100 + 250.500 + 50 - 20 - 10 - 150 = 220.500
    expect(cash.toString()).toBe("220500");
  });

  test("packaging conversion preserves exact units and detects invalid ratios", () => {
    // 5 cartons of 12 units = 60.000000
    const result = convertPackagingQuantity("5.000000", "12.000000", true);
    expect(result).toBe("60.000000");

    // Partial units rejected when indivisible
    expect(() => convertPackagingQuantity("5.500000", "12.000000", true)).toThrow(
      "Invalid packaging quantity",
    );
  });

  test("package nesting cycle validation detects indirect self-parenting", () => {
    const parents = new Map<string, string | null>([
      ["A", "B"],
      ["B", "C"],
      ["C", null],
    ]);

    // Setting C's parent to A creates a cycle: A -> B -> C -> A
    expect(() => assertPackageParent("C", "A", parents)).toThrow(
      "Package nesting cannot contain a cycle",
    );
  });

  test("serial ranges expand bounded fixed-width numbers", () => {
    const serials = expandSerialRange({
      prefix: "SN-",
      start: "001",
      end: "005",
    });
    expect(serials).toEqual(["SN-001", "SN-002", "SN-003", "SN-004", "SN-005"]);
  });

  test("stock label template validates physical dimensions and boundaries", () => {
    const valid = validateStockLabelTemplate({
      widthMm: 75,
      heightMm: 35,
      gapMm: 3,
      copies: 1,
    });
    expect(valid.widthMm).toBe(75);

    expect(() =>
      validateStockLabelTemplate({
        widthMm: 10, // too small
        heightMm: 35,
        gapMm: 3,
        copies: 1,
      }),
    ).toThrow("Invalid label dimensions or copy count");
  });

  test("uniqueSerials rejects duplicates and invalid serial formats", () => {
    expect(uniqueSerials(["SN-001", "SN-002", "SN-003"])).toEqual([
      "SN-001",
      "SN-002",
      "SN-003",
    ]);
    expect(() => uniqueSerials(["SN-001", "SN-001"])).toThrow(
      "Duplicate or invalid serial identifier",
    );
    expect(() => uniqueSerials(["  "])).toThrow(
      "Duplicate or invalid serial identifier",
    );
  });

  test("generateStockLabelsPdf renders physical dimension pages", async () => {
    const { generateStockLabelsPdf } = await import(
      "../../lib/pdf/stock-label-pdf"
    );
    const pdfBuf = await generateStockLabelsPdf({
      id: "job-test-1234",
      template: { widthMm: 75, heightMm: 35, gapMm: 2, copies: 1 },
      labels: [
        {
          code: "INT-TEST-0001",
          productId: "prod-1",
          sku: "SKU-TEST",
          nameEn: "Test Product",
          nameAr: "منتج تجريبي",
        },
      ],
    });
    expect(Buffer.isBuffer(pdfBuf)).toBe(true);
    expect(pdfBuf.length).toBeGreaterThan(500);
    expect(pdfBuf.subarray(0, 4).toString()).toBe("%PDF");
  });
});
