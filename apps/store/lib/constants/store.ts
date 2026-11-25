import { roundMoney } from "../finance/money";

export const ORDER_STATUSES = [
  "placed",
  "paid",
  "packing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const PAYMENT_STATUSES = [
  "unpaid",
  "pending",
  "paid",
  "partially_refunded",
  "refunded",
] as const;
export const ORDER_CHANNELS = ["website", "phone", "whatsapp", "pos"] as const;
export type OrderChannel = (typeof ORDER_CHANNELS)[number];
export const ORDER_PAYMENT_METHODS = [
  "cod",
  "bank_transfer",
  "pay_later",
  "cash",
  "card",
  "online",
  "wallet",
] as const;
export type OrderPaymentMethod = (typeof ORDER_PAYMENT_METHODS)[number];

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed: ["paid", "packing", "cancelled"],
  paid: ["packing", "cancelled"],
  packing: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};
export const canMoveOrder = (from: string, to: string) =>
  (ORDER_TRANSITIONS[from as OrderStatus] ?? []).includes(to as OrderStatus);
export const RESERVED_STATUSES: OrderStatus[] = ["placed", "paid", "packing"];

export interface PricedLine {
  unitPrice: number;
  quantity: number;
  vatExempt?: boolean;
}

export interface CouponTerms {
  kind: "percent" | "fixed";
  value: number;
  minOrder?: number | null;
}

export function priceOrder(input: {
  currency?: string;
  lines: PricedLine[];
  vatPercentage: number;
  coupon?: CouponTerms | null;
  deliveryFee: number;
  freeDeliveryOver?: number | null;
  delivery: boolean;
}) {
  const round3 = (value: number) => input.currency ? roundMoney(value, input.currency) : Math.round(value * 1000) / 1000;
  const subtotal = round3(
    input.lines.reduce((sum, l) => sum + round3(l.unitPrice * l.quantity), 0),
  );
  const taxableGoods = round3(
    input.lines
      .filter((l) => !l.vatExempt)
      .reduce((sum, l) => sum + round3(l.unitPrice * l.quantity), 0),
  );
  let discount = 0;
  if (
    input.coupon &&
    (!input.coupon.minOrder || subtotal >= input.coupon.minOrder)
  ) {
    discount =
      input.coupon.kind === "percent"
        ? round3((subtotal * Math.min(100, input.coupon.value)) / 100)
        : Math.min(subtotal, round3(input.coupon.value));
  }
  const deliveryFee =
    !input.delivery ||
    (input.freeDeliveryOver != null &&
      subtotal - discount >= input.freeDeliveryOver)
      ? 0
      : round3(input.deliveryFee);
  const share = subtotal > 0 ? (subtotal - discount) / subtotal : 0;
  const taxable = round3(taxableGoods * share + deliveryFee);
  const vatAmount = round3((taxable * Math.max(0, input.vatPercentage)) / 100);
  return {
    subtotal,
    discount,
    deliveryFee,
    vatAmount,
    total: round3(subtotal - discount + deliveryFee + vatAmount),
  };
}

export function couponProblem(
  coupon: {
    isActive: boolean;
    startsAt: Date | null;
    endsAt: Date | null;
    maxUses: number | null;
    usedCount: number;
    minOrder: number | null;
  },
  subtotal: number,
  now = new Date(),
) {
  if (
    !coupon.isActive ||
    (coupon.startsAt && coupon.startsAt > now) ||
    (coupon.endsAt && coupon.endsAt < now)
  )
    return "expired" as const;
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses)
    return "used_up" as const;
  if (coupon.minOrder != null && subtotal < coupon.minOrder)
    return "min_order" as const;
  return null;
}

export interface CartLine {
  productId: string;
  variantId?: string;
  quantity: number;
}
export const CART_STORAGE_KEY = "platform-cart";
export const MAX_CART_LINES = 50;
export const MAX_LINE_QUANTITY = 999;

export interface StoreRegionSpec {
  code: string;
  currency: string;
  currencySymbol: string;
  name_en: string;
  name_ar: string;
  multiplier: number;
  freeShippingOver: number;
  flag: string;
}

export const STORE_REGIONS: readonly StoreRegionSpec[] = [
  { code: "BH", currency: "BHD", currencySymbol: "BD", name_en: "Bahrain", name_ar: "البحرين", multiplier: 1, freeShippingOver: 25, flag: "BH" },
] as const;

export const POINTS_EARN_PER_UNIT_DEFAULT = 10;
export const POINTS_REDEMPTION_RATE_DEFAULT = 500;
export const MIN_REDEEM_POINTS_DEFAULT = 1000;
export const RAFFLE_SPEND_UNIT_DEFAULT = 10;

const roundStoreMoney = (value: number) => Math.round((value + Number.EPSILON) * 1000) / 1000;

export function calculatePointsEarned(
  amount: number,
  pointsPerUnit = POINTS_EARN_PER_UNIT_DEFAULT,
  enabled = true,
): number {
  if (!enabled || amount <= 0 || pointsPerUnit <= 0) return 0;
  return Math.max(0, Math.floor(amount * pointsPerUnit));
}

export function pointsToMoney(
  points: number,
  redemptionRate = POINTS_REDEMPTION_RATE_DEFAULT,
): number {
  if (points <= 0 || redemptionRate <= 0) return 0;
  return roundStoreMoney(points / redemptionRate);
}

export function calculateRaffleTickets(
  amount: number,
  spendUnit = RAFFLE_SPEND_UNIT_DEFAULT,
  enabled = true,
): number {
  if (!enabled || amount <= 0 || spendUnit <= 0) return 0;
  return Math.max(0, Math.floor(amount / spendUnit));
}

export function priceOrderDetailed(input: {
  currency?: string;
  lines: PricedLine[];
  vatPercentage: number;
  coupon?: CouponTerms | null;
  deliveryFee: number;
  freeDeliveryOver?: number | null;
  delivery: boolean;
  accountDiscountPercent?: number;
  pointsAvailable?: number;
  pointsToRedeem?: number;
  pointsRedemptionRate?: number;
  minRedeemPoints?: number;
  loyaltyEnabled?: boolean;
  pointsPerUnit?: number;
  walletBalance?: number;
  useWallet?: boolean;
  walletEnabled?: boolean;
  walletAmountRequested?: number | null;
  minPartialWallet?: number;
  raffleEnabled?: boolean;
  raffleSpendUnit?: number;
}) {
  const base = priceOrder({
    currency: input.currency,
    lines: input.lines,
    vatPercentage: input.vatPercentage,
    coupon: input.coupon,
    deliveryFee: input.deliveryFee,
    freeDeliveryOver: input.freeDeliveryOver,
    delivery: input.delivery,
  });

  const pct = Math.min(Math.max(Number(input.accountDiscountPercent ?? 0) || 0, 0), 100);
  const afterCouponSubtotal = Math.max(0, roundStoreMoney(base.subtotal - base.discount));
  const accountDiscount = pct > 0 ? Math.min(afterCouponSubtotal, roundStoreMoney((afterCouponSubtotal * pct) / 100)) : 0;

  const loyaltyOn = input.loyaltyEnabled !== false;
  const redemptionRate = Math.max(1, Number(input.pointsRedemptionRate ?? POINTS_REDEMPTION_RATE_DEFAULT));
  const minRedeem = Math.max(0, Number(input.minRedeemPoints ?? MIN_REDEEM_POINTS_DEFAULT));
  const maxAvailablePts = Math.max(0, Math.floor(Number(input.pointsAvailable ?? 0)));
  const requestedPts = Math.max(0, Math.floor(Number(input.pointsToRedeem ?? 0)));

  let pointsRedeemed = 0;
  let pointsDiscount = 0;
  if (loyaltyOn && requestedPts >= minRedeem && maxAvailablePts >= requestedPts) {
    const remainingBeforePts = Math.max(0, roundStoreMoney(base.total - accountDiscount));
    const maxPtsForTotal = Math.floor(remainingBeforePts * redemptionRate);
    pointsRedeemed = Math.min(requestedPts, maxAvailablePts, maxPtsForTotal);
    pointsDiscount = Math.min(remainingBeforePts, pointsToMoney(pointsRedeemed, redemptionRate));
  }

  const totalAfterRewards = Math.max(0, roundStoreMoney(base.total - accountDiscount - pointsDiscount));

  const walletOn = input.walletEnabled !== false;
  const walletAvailable = Math.max(0, Number(input.walletBalance ?? 0));
  let walletApplied = 0;
  if (walletOn && input.useWallet && walletAvailable > 0 && totalAfterRewards > 0) {
    const requested = input.walletAmountRequested != null ? Math.min(walletAvailable, Math.max(0, input.walletAmountRequested)) : walletAvailable;
    const minPartial = Math.max(0, Number(input.minPartialWallet ?? 1));
    if (requested >= totalAfterRewards) {
      walletApplied = totalAfterRewards;
    } else if (requested >= minPartial) {
      walletApplied = roundStoreMoney(requested);
    }
  }

  const amountDue = Math.max(0, roundStoreMoney(totalAfterRewards - walletApplied));
  const pointsEarned = calculatePointsEarned(
    Math.max(0, totalAfterRewards - base.deliveryFee),
    input.pointsPerUnit ?? POINTS_EARN_PER_UNIT_DEFAULT,
    loyaltyOn,
  );
  const raffleTickets = calculateRaffleTickets(
    totalAfterRewards,
    input.raffleSpendUnit ?? RAFFLE_SPEND_UNIT_DEFAULT,
    input.raffleEnabled !== false,
  );

  return {
    subtotal: base.subtotal,
    discount: roundStoreMoney(base.discount + accountDiscount),
    couponDiscount: base.discount,
    accountDiscount,
    pointsRedeemed,
    pointsDiscount,
    deliveryFee: base.deliveryFee,
    vatAmount: base.vatAmount,
    total: totalAfterRewards,
    walletApplied,
    amountDue,
    pointsEarned,
    raffleTickets,
  };
}

export interface CustomStoreCategorySpec {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  parent_slug?: string | null;
  icon?: string;
  display_order: number;
  featured?: boolean;
  is_active: boolean;
}

export const GIFT_CARD_DENOMINATIONS = [5, 10, 25, 50, 100] as const;

export const DEFAULT_STORE_CATEGORIES: readonly CustomStoreCategorySpec[] = [] as const;

export function parseCustomCategories(raw: unknown): CustomStoreCategorySpec[] {
  if (!raw) return [];
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    .map((entry, idx) => ({
      id: String(entry.id ?? `custom-cat-${idx + 1}`),
      slug: String(entry.slug ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-|-$/g, ""),
      name_en: String(entry.name_en ?? entry.nameEn ?? "").trim(),
      name_ar: String(entry.name_ar ?? entry.nameAr ?? entry.name_en ?? entry.nameEn ?? "").trim(),
      parent_slug: entry.parent_slug ? String(entry.parent_slug) : null,
      icon: entry.icon ? String(entry.icon) : "tag",
      display_order: Number(entry.display_order ?? idx + 1) || idx + 1,
      featured: entry.featured !== false,
      is_active: entry.is_active !== false,
    }))
    .filter((cat) => Boolean(cat.slug) && Boolean(cat.name_en));
}
