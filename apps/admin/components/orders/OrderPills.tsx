"use client";

import { useAdminLocale } from "../../hooks/useAdminLocale";

const ORDER_TONES: Record<string, string> = {
  placed: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  paid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  packing: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  shipped: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  delivered: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  cancelled: "bg-ink/10 text-ink-muted line-through",
  returned: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
};
const PAYMENT_TONES: Record<string, string> = {
  unpaid: "bg-ink/10 text-ink-muted",
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  paid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  partially_refunded: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  refunded: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

export function OrderStatusPill({ status, fulfilment }: { status: string; fulfilment?: string }) {
  const { t } = useAdminLocale();
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ORDER_TONES[status] ?? ""}`} data-testid="order-status">{(fulfilment === "pickup" ? (t.orders.pickupStatuses as Record<string, string>)[status] : undefined) ?? (t.orders.statuses as Record<string, string>)[status] ?? status}</span>;
}

export function PaymentStatusPill({ status }: { status: string }) {
  const { t } = useAdminLocale();
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${PAYMENT_TONES[status] ?? ""}`} data-testid="payment-status">{(t.orders.paymentStatuses as Record<string, string>)[status] ?? status}</span>;
}
