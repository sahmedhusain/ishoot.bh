import { describe, expect, test } from "vitest";
import { getTranslations } from "../../packages/locales/src";
import {
  ADJUSTMENT_REASONS,
  COUNT_STATUSES,
  MOVEMENT_TYPES,
  averageCostAfter,
  countVariance,
  daysToExpiry,
  roundQuantity,
} from "../../packages/database/src/constants/inventory";
import {
  ALL_RESOURCES,
  PERMISSION_GROUPS,
  RESOURCE_FEATURES,
} from "../../packages/database/src/constants/permissions";

describe("inventory", () => {
  test("receipts move the weighted average cost; empty or negative stock takes the new cost", () => {
    expect(averageCostAfter(20, 3, 10, 4.5)).toBe(3.5);
    expect(averageCostAfter(0, 3, 5, 7)).toBe(7);
    expect(averageCostAfter(-2, 3, 5, 7)).toBe(7);
    expect(averageCostAfter(3, 1, 0, 9)).toBe(1);
    expect(averageCostAfter(3, 1.1111, 3, 2.2222)).toBe(1.6667);
  });

  test("a count changes stock by counted minus expected, and uncounted lines change nothing", () => {
    expect(countVariance(29, 26)).toBe(-3);
    expect(countVariance(0, 4)).toBe(4);
    expect(countVariance(12, null)).toBe(0);
    expect(countVariance(1.25, 1.2)).toBe(-0.05);
    expect(roundQuantity(0.1 + 0.2)).toBe(0.3);
  });

  test("days to expiry count calendar days", () => {
    const today = new Date("2026-10-25T18:00:00Z");
    expect(daysToExpiry("2026-10-25", today)).toBe(0);
    expect(daysToExpiry("2026-11-01", today)).toBe(7);
    expect(daysToExpiry("2026-10-20", today)).toBe(-5);
    expect(daysToExpiry(null, today)).toBeNull();
  });

  test("every movement type, reason and count status has a name in both languages", () => {
    for (const locale of ["en", "ar"] as const) {
      const copy = getTranslations(locale).admin.inventory;
      for (const type of MOVEMENT_TYPES)
        expect(
          (copy.movementTypes as Record<string, string>)[type],
          `${locale} ${type}`,
        ).toBeTruthy();
      for (const reason of ADJUSTMENT_REASONS)
        expect(copy.reasons[reason], `${locale} ${reason}`).toBeTruthy();
      for (const status of COUNT_STATUSES)
        expect(
          copy.counts.statuses[status],
          `${locale} ${status}`,
        ).toBeTruthy();
    }
  });

  test("every permission resource appears once in the roles matrix, and stock follows the products module", () => {
    const listed = PERMISSION_GROUPS.flatMap((group) => group.resources);
    expect([...listed].sort()).toEqual([...ALL_RESOURCES].sort());
    expect(new Set(listed).size).toBe(listed.length);
    expect(RESOURCE_FEATURES.inventory).toBe("products");
    expect(RESOURCE_FEATURES.products).toBe("products");
  });
});
