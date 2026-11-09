"use client";

import Link from "next/link";
import { TICKET_OPEN_STATUSES, TICKET_PRIORITIES } from "@platform/contracts";
import type { Ticket } from "@platform/api-client";
import { ArrowRight, Inbox, Clock, AlertTriangle, UserX } from "lucide-react";
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
          className="it-card p-8 text-center text-xs text-slate-500"
        >
          {o.unavailable}
        </div>
      </div>
    );
  }

  const kpis = [
    {
      label: o.open,
      value: stats.open,
      href: "/tickets?open=true",
      icon: Inbox,
      color: "text-sky-600 dark:text-sky-400",
      bgColor: "bg-sky-50 dark:bg-sky-950/40",
      borderColor: "border-sky-100 dark:border-sky-900/40",
    },
    {
      label: o.breached,
      value: stats.breached,
      href: "/tickets?open=true",
      icon: AlertTriangle,
      color: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-50 dark:bg-rose-950/40",
      borderColor: "border-rose-100 dark:border-rose-900/40",
    },
    {
      label: o.unassigned,
      value: stats.unassigned,
      href: "/tickets?open=true",
      icon: UserX,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/40",
      borderColor: "border-amber-100 dark:border-amber-900/40",
    },
  ];

  return (
    <div className="space-y-6">
      <PageTitle
        title={o.title}
        description={o.description}
        actions={
          <Link
            href="/tickets?open=true"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#0070d2] hover:bg-[#005fb2] text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <span>{o.viewQueue}</span>
            <ArrowRight className="size-3.5" />
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.label}
              href={kpi.href}
              className="it-card p-5 block hover:border-slate-300 dark:hover:border-slate-700 transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {kpi.label}
                </span>
                <div className={`p-2 rounded-lg ${kpi.bgColor} ${kpi.color}`}>
                  <Icon className="size-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                {kpi.value}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

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

        <div className="lg:col-span-2 it-card p-0 overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              {o.latest}
            </h2>
            <Link
              href="/tickets"
              className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
            >
              View all
            </Link>
          </div>

          {!latest?.length ? (
            <div className="p-12 text-center text-xs text-slate-500">
              {copy.tickets.empty}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase text-[11px]">
                    <th className="py-2.5 px-4">#</th>
                    <th className="py-2.5 px-4">Subject</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {latest.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-slate-500">
                        <Link
                          href={`/tickets/${t.id}`}
                          className="hover:text-sky-600 font-semibold"
                        >
                          {number(t.number)}
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100 max-w-[300px] truncate">
                        <Link
                          href={`/tickets/${t.id}`}
                          className="hover:underline"
                        >
                          {t.title}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={t.status} />
                          {t.breached && <OverdueBadge />}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {date(t.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
    <div className="it-card p-4 space-y-3.5">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
          {title}
        </h2>
      </div>
      <ul className="space-y-2.5">
        {keys.map((key) => {
          const n = counts[key] ?? 0;
          const pct = total ? Math.round((n / total) * 100) : 0;
          return (
            <li key={key} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  {label(key)}
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {n} <span className="text-slate-400 font-normal">({pct}%)</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#0070d2]"
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
