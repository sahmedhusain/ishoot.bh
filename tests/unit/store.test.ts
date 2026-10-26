import { describe, expect, test } from "vitest";
import { getTranslations } from "../../packages/locales/src";
import {
  ORDER_CHANNELS,
  ORDER_PAYMENT_METHODS,
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
  canMoveOrder,
  couponProblem,
  priceOrder,
} from "../../packages/database/src/constants/store";
import {
  ALL_RESOURCES,
  RESOURCE_FEATURES,
} from "../../packages/database/src/constants/permissions";

describe("store", () => {
  test("an order is priced lines, coupon, delivery, then VAT on the discounted goods and delivery", () => {
    const lines = [
      { unitPrice: 10, quantity: 2 },
      { unitPrice: 5, quantity: 1, vatExempt: true },
    ];
    expect(
      priceOrder({ lines, vatPercentage: 10, deliveryFee: 2, delivery: true }),
    ).toEqual({
      subtotal: 25,
      discount: 0,
      deliveryFee: 2,
      vatAmount: 2.2,
      total: 29.2,
    });
    // 20% off: taxable goods 20 → 16, plus delivery 2 → VAT 1.8.
    expect(
      priceOrder({
        lines,
        vatPercentage: 10,
        coupon: { kind: "percent", value: 20 },
        deliveryFee: 2,
        delivery: true,
      }),
    ).toEqual({
      subtotal: 25,
      discount: 5,
      deliveryFee: 2,
      vatAmount: 1.8,
      total: 23.8,
    });
    expect(
      priceOrder({
        lines,
        vatPercentage: 0,
        coupon: { kind: "fixed", value: 100 },
        deliveryFee: 2,
        delivery: false,
      }).total,
    ).toBe(0);
    expect(
      priceOrder({
        lines,
        vatPercentage: 0,
        deliveryFee: 2,
        freeDeliveryOver: 25,
        delivery: true,
      }).deliveryFee,
    ).toBe(0);
    expect(
      priceOrder({
        lines,
        vatPercentage: 0,
        coupon: { kind: "fixed", value: 3, minOrder: 30 },
        deliveryFee: 0,
        delivery: false,
      }).discount,
    ).toBe(0);
    expect(
      priceOrder({
        lines: [{ unitPrice: 0.333, quantity: 3 }],
        vatPercentage: 10,
        deliveryFee: 0,
        delivery: false,
      }).total,
    ).toBe(1.099);
  });

  test("coupons say why they cannot be used", () => {
    const base = {
      isActive: true,
      startsAt: null,
      endsAt: null,
      maxUses: null,
      usedCount: 0,
      minOrder: null,
    };
    const now = new Date("2026-06-01");
    expect(couponProblem(base, 10, now)).toBeNull();
    expect(couponProblem({ ...base, isActive: false }, 10, now)).toBe(
      "expired",
    );
    expect(
      couponProblem({ ...base, endsAt: new Date("2026-05-01") }, 10, now),
    ).toBe("expired");
    expect(
      couponProblem({ ...base, startsAt: new Date("2026-07-01") }, 10, now),
    ).toBe("expired");
    expect(couponProblem({ ...base, maxUses: 2, usedCount: 2 }, 10, now)).toBe(
      "used_up",
    );
    expect(couponProblem({ ...base, minOrder: 20 }, 10, now)).toBe("min_order");
  });

  test("orders move forward only; cancelled and returned are final", () => {
    expect(canMoveOrder("placed", "packing")).toBe(true);
    expect(canMoveOrder("shipped", "cancelled")).toBe(false);
    expect(canMoveOrder("delivered", "returned")).toBe(true);
    expect(ORDER_TRANSITIONS.cancelled).toEqual([]);
    expect(ORDER_TRANSITIONS.returned).toEqual([]);
    for (const targets of Object.values(ORDER_TRANSITIONS))
      for (const t of targets) expect(ORDER_STATUSES).toContain(t);
  });

  test("orders are a store resource and every status, channel and method is named in both languages", () => {
    expect(ALL_RESOURCES).toContain("orders");
    expect(RESOURCE_FEATURES.orders).toBe("store");
    for (const locale of ["en", "ar"] as const) {
      const t = getTranslations(locale).admin as unknown as {
        orders: {
          statuses: Record<string, string>;
          channels: Record<string, string>;
          paymentMethods: Record<string, string>;
        };
      };
      for (const s of ORDER_STATUSES) expect(t.orders.statuses[s]).toBeTruthy();
      for (const c of ORDER_CHANNELS) expect(t.orders.channels[c]).toBeTruthy();
      for (const m of ORDER_PAYMENT_METHODS)
        expect(t.orders.paymentMethods[m]).toBeTruthy();
    }
  });
});
