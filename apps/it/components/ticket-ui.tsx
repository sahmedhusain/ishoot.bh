"use client";

import { useCopy } from "./CopyProvider";

const STATUS_STYLE: Record<string, string> = {
  new: "bg-amber-100 text-amber-800 border-amber-400 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700",
  triaged: "bg-sky-100 text-sky-800 border-sky-400 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-700",
  assigned: "bg-sky-100 text-sky-800 border-sky-400 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-700",
  in_progress: "bg-indigo-100 text-indigo-800 border-indigo-400 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-700",
  waiting_on_requester: "bg-orange-100 text-orange-800 border-orange-400 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-700",
  resolved: "bg-emerald-100 text-emerald-800 border-emerald-400 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700",
  closed: "bg-slate-200 text-slate-700 border-slate-400 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600",
  cancelled: "bg-slate-200 text-slate-700 border-slate-400 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600",
};

export function StatusBadge({ status }: { status: string }) {
  const { status: label } = useCopy();
  return (
    <span
      className={`px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase border ${STATUS_STYLE[status] ?? STATUS_STYLE.closed}`}
    >
      [{label(status)}]
    </span>
  );
}

export function OverdueBadge() {
  const { copy } = useCopy();
  return (
    <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase bg-rose-100 text-rose-800 border border-rose-400 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700">
      ! {copy.tickets.overdue} !
    </span>
  );
}

export function RemindedBadge() {
  const { copy } = useCopy();
  return (
    <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase bg-amber-100 text-amber-800 border border-amber-400 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700">
      * {copy.tickets.slaReminder} *
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
    <div className="flex flex-wrap items-center justify-between gap-4 pb-3 mb-4 border-b border-slate-300 dark:border-slate-700">
      <div>
        <h1 className="text-base font-bold font-mono tracking-tight text-ink uppercase">
          {title}
        </h1>
        {description && (
          <p className="text-xs text-ink-muted mt-0.5 font-sans leading-tight">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
