import { describe, expect, it } from "vitest";
import { Decimal } from "../../lib/decimal";

describe("Web Decimal & Math Suite", () => {
  it("performs accurate decimal arithmetic", () => {
    const d1 = new Decimal(10.5);
    const d2 = new Decimal("5.5");

    expect(d1.add(d2).toNumber()).toBe(16);
    expect(d1.sub(d2).toNumber()).toBe(5);
    expect(d1.mul(d2).toNumber()).toBe(57.75);
    expect(d1.div(d2).toNumber()).toBe(1.9090909090909092);
    expect(d1.toFixed(2)).toBe("10.50");
  });

  it("handles fallback default values safely", () => {
    const d = new Decimal(null);
    expect(d.toNumber()).toBe(0);
    expect(d.add("invalid").toNumber()).toBe(0);
  });
});
