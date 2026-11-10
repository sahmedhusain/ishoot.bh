import { describe, expect, it } from "vitest";
import { discountPercent } from "../../lib/finance/discount-policy";

describe("Admin Finance Discount Policy Suite", () => {
  it("calculates discount percentages accurately", () => {
    expect(discountPercent(100, 10)).toBe(10);
    expect(discountPercent(200, 50)).toBe(25);
    expect(discountPercent(1000, 125.5)).toBe(12.55);
  });

  it("returns zero when subtotal or discount amount is invalid", () => {
    expect(discountPercent(0, 10)).toBe(0);
    expect(discountPercent(100, 0)).toBe(0);
    expect(discountPercent(-100, 10)).toBe(0);
    expect(discountPercent(100, -10)).toBe(0);
  });
});
