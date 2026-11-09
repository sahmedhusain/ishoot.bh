"use client";

import Link from "next/link";
import { TICKET_OPEN_STATUSES, TICKET_PRIORITIES } from "@platform/contracts";
import type { Ticket } from "@platform/api-client";
import { useCopy } from "./CopyProvider";
import { OverdueBadge, PageTitle, StatusBadge } from "./ticket-ui";

type Stats = {
  open: number;
  breached: number;
  unassigned: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
};

export function OverviewView({
  stats,
  latest,
}: {
  stats: Stats | null;
  latest: Ticket[] | null;
}) {
  const { copy, priority, status, number, date } = useCopy();
  const o = copy.overview;

  if (!stats) {
    return (
      <div className="space-y-4">
        <PageTitle title={o.title} description={o.description} />
        <div
          role="alert"
          className="it-card p-8 text-center text-xs font-mono text-ink-muted"
        >
          {o.unavailable}
        </div>
      </div>
    );
  }

  const tiles: [string, number, string, string][] = [
    [o.open, stats.open, "/tickets?open=true", "border-l-4 border-l-sky-600"],
    [o.breached, stats.breached, "/tickets?open=true", "border-l-4 border-l-rose-600"],
    [o.unassigned, stats.unassigned, "/tickets?open=true", "border-l-4 border-l-amber-600"],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageTitle title={o.title} description={o.description} />
        <div className="flex items-center gap-2">
          <span className="it-status-pane font-bold text-amber-700 dark:text-amber-400">
            T-CODE: SO01 [OPERATIONS OVERVIEW]
          </span>
          <Link
            href="/tickets?open=true"
            className="it-btn-3d py-1.5 px-3 font-bold text-emerald-800 dark:text-emerald-300"
          >
            {o.viewQueue}
          </Link>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {tiles.map(([label, value, href, borderClass]) => (
          <Link
            key={label}
            href={href}
            className={`it-card p-3 space-y-1 block hover:bg-slate-100 dark:hover:bg-slate-800 transition ${borderClass}`}
          >
            <div className="text-[10px] uppercase font-bold text-ink-muted font-mono">{label}</div>
            <div className="text-xl font-bold font-mono text-ink">{value}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-4">
          <Breakdown
            title={o.byPriority}
            keys={TICKET_PRIORITIES}
            counts={stats.byPriority}
            total={stats.open}
            label={priority}
          />
          <Breakdown
            title={o.byStatus}
            keys={TICKET_OPEN_STATUSES}
            counts={stats.byStatus}
            total={stats.open}
            label={status}
          />
        </div>

        <div className="lg:col-span-2 it-card p-0 overflow-x-auto">
          <div className="p-2 border-b border-slate-300 dark:border-slate-700 bg-surface flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase font-mono text-ink">{o.latest}</h2>
            <span className="text-[10px] font-mono text-ink-muted">QUEUE MONITOR</span>
          </div>

          {!latest?.length ? (
            <p className="p-6 text-xs font-mono text-ink-muted text-center">{copy.tickets.empty}</p>
          ) : (
            <table className="it-table w-full font-mono text-xs">
              <thead>
                <tr>
                  <th className="text-start">#</th>
                  <th className="text-start">TITLE</th>
                  <th className="text-start">STATUS</th>
                  <th className="text-start">SUBMITTED</th>
                </tr>
              </thead>
              <tbody>
                {latest.map((t) => (
                  <tr key={t.id}>
                    <td className="font-mono text-xs text-ink-muted">
                      <Link href={`/tickets/${t.id}`} className="hover:underline font-bold text-sky-800 dark:text-sky-300">
                        {number(t.number)}
                      </Link>
                    </td>
                    <td className="font-sans font-medium text-ink max-w-[280px] truncate">
                      <Link href={`/tickets/${t.id}`} className="hover:underline">
                        <bdi dir="auto">{t.title}</bdi>
                      </Link>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <StatusBadge status={t.status} />
                        {t.breached && <OverdueBadge />}
                      </div>
                    </td>
                    <td className="text-xs text-ink-muted">
                      {date(t.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function Breakdown({
  title,
  keys,
  counts,
  total,
  label,
}: {
  title: string;
  keys: readonly string[];
  counts: Record<string, number>;
  total: number;
  label: (key: string) => string;
}) {
  return (
    <div className="it-card p-3 space-y-3 font-mono text-xs">
      <div className="border-b border-slate-300 dark:border-slate-700 pb-1">
        <h2 className="text-xs font-bold uppercase text-ink">{title}</h2>
      </div>
      <ul className="space-y-2">
        {keys.map((key) => {
          const n = counts[key] ?? 0;
          const pct = total ? Math.round((n / total) * 100) : 0;
          return (
            <li key={key} className="space-y-0.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-ink">{label(key)}</span>
                <span className="font-bold font-mono text-ink">
                  {n} ({pct}%)
                </span>
              </div>
              <div className="h-2 border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-slate-600 dark:bg-slate-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
