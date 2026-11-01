"use client";

import Link from "next/link";
import { Card } from "@platform/ui";
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
      <>
        <PageTitle title={o.title} description={o.description} />
        <Card
          role="alert"
          className="p-12 text-center text-sm text-ink-muted rounded-3xl bg-surface border border-outline-variant"
        >
          {o.unavailable}
        </Card>
      </>
    );
  }
  const tiles: [string, number, string][] = [
    [o.open, stats.open, "/tickets?open=true"],
    [o.breached, stats.breached, "/tickets?open=true"],
    [o.unassigned, stats.unassigned, "/tickets?open=true"],
  ];
  return (
    <>
      <PageTitle
        title={o.title}
        description={o.description}
        actions={
          <Link
            href="/tickets?open=true"
            className="px-4 py-2 rounded-full bg-accent text-accent-foreground text-xs font-semibold"
          >
            {o.viewQueue}
          </Link>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {tiles.map(([label, value, href]) => (
          <Link
            key={label}
            href={href}
            className="rounded-3xl border border-outline-variant bg-surface p-5 hover:border-ink/25"
          >
            <div className="text-xs text-ink-muted">{label}</div>
            <div className="text-2xl font-bold text-ink mt-1">{value}</div>
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="space-y-6">
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
        <Card className="lg:col-span-2 p-6 rounded-3xl bg-surface border border-outline-variant">
          <h2 className="text-sm font-bold text-ink mb-4">{o.latest}</h2>
          {!latest?.length ? (
            <p className="text-sm text-ink-muted">{copy.tickets.empty}</p>
          ) : (
            <ul className="divide-y divide-outline-variant">
              {latest.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/tickets/${t.id}`}
                    className="flex items-center gap-3 py-3 hover:bg-surface-container-low rounded-xl px-2"
                  >
                    <span className="font-mono text-xs text-ink-muted">
                      {number(t.number)}
                    </span>
                    <span className="flex-1 min-w-0 truncate text-sm text-ink">
                      <bdi dir="auto">{t.title}</bdi>
                    </span>
                    {t.breached && <OverdueBadge />}
                    <StatusBadge status={t.status} />
                    <span className="hidden sm:block text-[11px] text-ink-muted">
                      {date(t.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
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
    <Card className="p-6 rounded-3xl bg-surface border border-outline-variant">
      <h2 className="text-sm font-bold text-ink mb-4">{title}</h2>
      <ul className="space-y-3">
        {keys.map((key) => {
          const n = counts[key] ?? 0;
          return (
            <li key={key}>
              <div className="flex justify-between text-sm">
                <span className="text-ink">{label(key)}</span>
                <span className="font-semibold text-ink">{n}</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-container mt-1 overflow-hidden">
                <div
                  className="h-full bg-accent"
                  style={{ width: `${total ? (n / total) * 100 : 0}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
