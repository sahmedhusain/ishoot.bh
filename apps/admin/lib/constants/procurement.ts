
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

export const RECEIVABLE_ORDER_STATUSES: readonly PurchaseOrderStatus[] = [
  "approved",
  "sent",
  "partially_received",
];
export const EDITABLE_ORDER_STATUSES: readonly PurchaseOrderStatus[] = [
  "draft",
];

const round3 = (value: number) => Math.round(value * 1000) / 1000;

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

export function orderReceiptStatus(
  lines: { quantity: number; receivedQuantity: number }[],
  current: PurchaseOrderStatus,
): PurchaseOrderStatus {
  const received = lines.reduce((sum, l) => sum + l.receivedQuantity, 0);
  if (lines.every((l) => l.receivedQuantity >= l.quantity)) return "received";
  return received > 0 ? "partially_received" : current;
}

export const PRICE_TOLERANCE = 0.01;

export type MatchIssue =
  "not_ordered" | "over_ordered" | "over_received" | "price";

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

export function daysBetween(from: Date | string, to: Date | string) {
  const day = (d: Date) =>
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((day(new Date(to)) - day(new Date(from))) / 86_400_000);
}
