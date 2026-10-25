"use client";

import { useAdminLocale } from "../../hooks/useAdminLocale";

const TONES: Record<string, string> = {
  draft: "bg-ink/10 text-ink-muted",
  pending_approval: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  approved: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  open: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  sent: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  partially_received: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  partially_paid: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  received: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  ordered: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  awarded: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  paid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  closed: "bg-ink/10 text-ink-muted",
  rejected: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  cancelled: "bg-ink/10 text-ink-muted line-through",
};

/** A procurement document's status, named in the interface language. */
export function StatusPill({ status }: { status: string }) {
  const { t } = useAdminLocale();
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[status] ?? ""}`} data-testid="status">{(t.procurement.statuses as Record<string, string>)[status] ?? status}</span>;
}
