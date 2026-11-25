import { describe, expect, test } from "vitest";
import {
  STORE_REGIONS,
  ORDER_CHANNELS,
  ORDER_PAYMENT_METHODS,
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
  calculatePointsEarned,
  calculateRaffleTickets,
  canMoveOrder,
  couponProblem,
  pointsToMoney,
  priceOrder,
  priceOrderDetailed,
} from "@platform/database/constants/store";

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

  test("orders have known status, channel and method values", () => {
    expect(ORDER_STATUSES.length).toBeGreaterThan(0);
    expect(ORDER_CHANNELS.length).toBeGreaterThan(0);
    expect(ORDER_PAYMENT_METHODS).toContain("wallet");
  });

  test("loyalty points, raffle tickets, company currency region, and wallet split pricing compute accurately", () => {
    expect(STORE_REGIONS.map((r) => r.currency)).toEqual(["BHD"]);
    expect(calculatePointsEarned(25.5, 10, true)).toBe(255);
    expect(pointsToMoney(1000, 500)).toBe(2);
    expect(calculateRaffleTickets(39.9, 10, true)).toBe(3);

    const out = priceOrderDetailed({
      currency: "BHD",
      lines: [{ unitPrice: 100, quantity: 1 }],
      vatPercentage: 10,
      deliveryFee: 2,
      delivery: true,
      accountDiscountPercent: 5,
      pointsAvailable: 2000,
      pointsToRedeem: 1000,
      pointsRedemptionRate: 500,
      minRedeemPoints: 1000,
      walletBalance: 50,
      useWallet: true,
    });
    expect(out.accountDiscount).toBe(5);
    expect(out.pointsRedeemed).toBe(1000);
    expect(out.pointsDiscount).toBe(2);
    expect(out.total).toBe(105.2);
    expect(out.walletApplied).toBe(50);
    expect(out.amountDue).toBe(55.2);
    expect(out.raffleTickets).toBe(10);
  });
});
