"use client";

import { useCopy } from "./CopyProvider";

const STATUS_STYLE: Record<string, string> = {
  new: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  triaged: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  assigned: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  in_progress: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  waiting_on_requester: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  resolved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  closed: "bg-ink/5 text-ink-muted",
  cancelled: "bg-ink/5 text-ink-muted",
};

export function StatusBadge({ status }: { status: string }) {
  const { status: label } = useCopy();
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLE[status] ?? STATUS_STYLE.closed}`}
    >
      {label(status)}
    </span>
  );
}

export function OverdueBadge() {
  const { copy } = useCopy();
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300">
      {copy.tickets.overdue}
    </span>
  );
}

export function PageTitle({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">{title}</h1>
        {description && (
          <p className="text-sm text-ink-muted mt-1">{description}</p>
        )}
      </div>
      {actions}
    </div>
  );
}
