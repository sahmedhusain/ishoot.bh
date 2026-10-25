"use client";

import Link from "next/link";
import { Link2 } from "lucide-react";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";

const PRIORITY_TONES: Record<string, string> = {
  urgent: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  high: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  normal: "bg-ink/10 text-ink-muted",
  low: "bg-ink/5 text-ink-muted",
};
const STATUS_TONES: Record<string, string> = {
  todo: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  in_progress: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  review: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  done: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  cancelled: "bg-ink/10 text-ink-muted line-through",
};

export function PriorityPill({ priority }: { priority: string }) {
  const { t } = useAdminLocale();
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${PRIORITY_TONES[priority] ?? ""}`}>{(t.tasks.priorities as Record<string, string>)[priority] ?? priority}</span>;
}

export function TaskStatusPill({ status }: { status: string }) {
  const { t } = useAdminLocale();
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_TONES[status] ?? ""}`} data-testid="task-status">{(t.tasks.statuses as Record<string, string>)[status] ?? status}</span>;
}

/** The page of the record a task is about. */
function taskLinkHref(type: string, id: string) {
  switch (type) {
    case "order":
      return ROUTES.orders.detail(id);
    case "deal":
      return ROUTES.crm.deal(id);
    case "request":
      return ROUTES.requests.detail(id);
    case "shipment":
      return ROUTES.delivery.shipment(id);
    case "purchase_order":
      return ROUTES.procurement.order(id);
    case "contact":
      return ROUTES.crm.customer(id);
    default:
      return null;
  }
}

export function TaskLink({ type, id }: { type: string; id: string }) {
  const { t } = useAdminLocale();
  const href = taskLinkHref(type, id);
  if (!href) return null;
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-accent">
      <Link2 className="w-3 h-3" aria-hidden="true" />
      {(t.tasks.links as Record<string, string>)[type] ?? type}
    </Link>
  );
}
