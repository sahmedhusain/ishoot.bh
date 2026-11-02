import { describe, expect, it } from "vitest";
import {
  expandSerialRange,
  uniqueSerials,
  compareSerialManifest,
  convertPackagingQuantity,
  assertPackageParent,
  branchBusinessDate,
  validateStockLabelTemplate,
} from "../../packages/database/src/constants/stock-traceability";
describe("physical stock identities", () => {
  it("converts cartons and fractional bulk quantities without floating point loss", () => {
    expect(convertPackagingQuantity("2", "72", true)).toBe("144.000000");
    expect(convertPackagingQuantity("0.125", "0.008", false)).toBe("0.001000");
    expect(() => convertPackagingQuantity("1.5", "12", true)).toThrow();
    expect(() =>
      convertPackagingQuantity("0.000001", "0.000001", false),
    ).toThrow();
  });
  it("preserves serial width, rejects overlap and does not mistake a range for received contents", () => {
    const expected = expandSerialRange({
      prefix: "WH-",
      start: "0008",
      end: "0011",
    });
    expect(expected).toEqual(["WH-0008", "WH-0009", "WH-0010", "WH-0011"]);
    expect(
      compareSerialManifest(expected, ["WH-0008", "WH-0010", "WH-0012"]),
    ).toEqual({ missing: ["WH-0009", "WH-0011"], unexpected: ["WH-0012"] });
    expect(() => uniqueSerials([...expected, "WH-0010"])).toThrow();
    expect(() =>
      expandSerialRange({ prefix: "", start: "0001", end: "9999" }),
    ).toThrow();
    expect(() =>
      expandSerialRange({ prefix: "", start: "12", end: "09" }),
    ).toThrow();
  });
  it("rejects direct and indirect container cycles", () => {
    const parents = new Map<string, string | null>([
      ["pallet", null],
      ["carton", "pallet"],
    ]);
    expect(() => assertPackageParent("pallet", "carton", parents)).toThrow();
    expect(() => assertPackageParent("carton", "carton", parents)).toThrow();
    expect(() => assertPackageParent("new", "missing", parents)).toThrow();
    expect(() => assertPackageParent("new", "carton", parents)).not.toThrow();
  });
  it("uses branch wall-clock date for overnight and daylight-saving shifts", () => {
    expect(
      branchBusinessDate(new Date("2026-10-29T00:30:00Z"), "Asia/Bahrain", 240),
    ).toBe("2026-10-28");
    expect(
      branchBusinessDate(new Date("2026-10-29T01:00:00Z"), "Asia/Bahrain", 240),
    ).toBe("2026-10-29");
    expect(
      branchBusinessDate(
        new Date("2026-03-08T07:30:00Z"),
        "America/New_York",
        240,
      ),
    ).toBe("2026-03-07");
  });
  it("bounds print dimensions and duplicate copies", () => {
    expect(() =>
      validateStockLabelTemplate({
        widthMm: 50,
        heightMm: 25,
        gapMm: 2,
        copies: 1,
      }),
    ).not.toThrow();
    expect(() =>
      validateStockLabelTemplate({
        widthMm: NaN,
        heightMm: 25,
        gapMm: 2,
        copies: 1,
      }),
    ).toThrow();
  });
});
