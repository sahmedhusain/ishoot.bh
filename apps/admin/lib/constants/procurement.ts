// Procurement: statuses, document totals and the three-way match. Runtime-free, so forms and the server agree.

export const REQUISITION_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "ordered",
  "cancelled",
] as const;
export const RFQ_STATUSES = ["open", "awarded", "cancelled"] as const;
export const PURCHASE_ORDER_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "sent",
  "partially_received",
  "received",
  "closed",
  "cancelled",
] as const;
export const BILL_STATUSES = [
  "draft",
  "approved",
  "partially_paid",
  "paid",
  "cancelled",
] as const;
export const SUPPLIER_PAYMENT_METHODS = [
  "bank_transfer",
  "cash",
  "cheque",
  "card",
  "other",
] as const;
export const REJECT_REASONS = [
  "damaged",
  "wrong_item",
  "quality",
  "expired",
  "other",
] as const;

export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

/** Purchase orders that can still receive goods. */
export const RECEIVABLE_ORDER_STATUSES: readonly PurchaseOrderStatus[] = [
  "approved",
  "sent",
  "partially_received",
];
/** Purchase orders still being prepared; their lines can change. */
export const EDITABLE_ORDER_STATUSES: readonly PurchaseOrderStatus[] = [
  "draft",
];

const round3 = (value: number) => Math.round(value * 1000) / 1000;

/** Subtotal, VAT and total of document lines, each line rounded to the company's three decimals. */
export function documentTotals(
  lines: { quantity: number; unitPrice: number }[],
  vatPercentage: number,
) {
  const subtotal = round3(
    lines.reduce(
      (sum, line) => sum + round3(line.quantity * line.unitPrice),
      0,
    ),
  );
  const vatAmount = round3((subtotal * Math.max(0, vatPercentage)) / 100);
  return { subtotal, vatAmount, total: round3(subtotal + vatAmount) };
}

/** Where an order stands after goods arrive: fully received, part received, or unchanged. */
export function orderReceiptStatus(
  lines: { quantity: number; receivedQuantity: number }[],
  current: PurchaseOrderStatus,
): PurchaseOrderStatus {
  const received = lines.reduce((sum, l) => sum + l.receivedQuantity, 0);
  if (lines.every((l) => l.receivedQuantity >= l.quantity)) return "received";
  return received > 0 ? "partially_received" : current;
}

/** Prices may differ from the order by this share before the match flags them (rounding, small fees). */
export const PRICE_TOLERANCE = 0.01;

export type MatchIssue =
  "not_ordered" | "over_ordered" | "over_received" | "price";

/**
 * The three-way match of one bill line: it must belong to an order line, not bill more than was ordered or
 * received (counting what earlier bills already billed), and keep the ordered price within the tolerance.
 */
export function matchBillLine(
  bill: { quantity: number; unitPrice: number },
  order: {
    quantity: number;
    unitPrice: number;
    receivedQuantity: number;
    billedQuantity: number;
  } | null,
): MatchIssue[] {
  if (!order) return ["not_ordered"];
  const issues: MatchIssue[] = [];
  const billed = round3(order.billedQuantity + bill.quantity);
  if (billed > order.quantity + 1e-9) issues.push("over_ordered");
  if (billed > order.receivedQuantity + 1e-9) issues.push("over_received");
  const allowed = Math.max(order.unitPrice * PRICE_TOLERANCE, 0.0005);
  if (Math.abs(bill.unitPrice - order.unitPrice) > allowed)
    issues.push("price");
  return issues;
}

/** What is left to pay on a bill, and the status that follows a payment. */
export function billAfterPayment(total: number, amountPaid: number) {
  const paid = round3(amountPaid);
  return {
    amountPaid: paid,
    status:
      paid >= total - 0.0005
        ? ("paid" as const)
        : paid > 0
          ? ("partially_paid" as const)
          : ("approved" as const),
  };
}

/** Days between two dates (whole days, ignoring the time of day). */
export function daysBetween(from: Date | string, to: Date | string) {
  const day = (d: Date) =>
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((day(new Date(to)) - day(new Date(from))) / 86_400_000);
}
