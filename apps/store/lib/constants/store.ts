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
