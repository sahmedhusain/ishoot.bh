"use client";

import { useAdminLocale } from "../../hooks/useAdminLocale";

const TONES: Record<string, string> = {
  pending: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  assigned: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  out_for_delivery: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  delivered: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  failed: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  returned: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  cancelled: "bg-ink/10 text-ink-muted line-through",
};

export function ShipmentStatusPill({ status }: { status: string }) {
  const { t } = useAdminLocale();
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[status] ?? ""}`} data-testid="shipment-status">{(t.delivery.statuses as Record<string, string>)[status] ?? status}</span>;
}

export function LatePill() {
  const { t } = useAdminLocale();
  return <span className="inline-flex rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-300">{t.delivery.late}</span>;
}
