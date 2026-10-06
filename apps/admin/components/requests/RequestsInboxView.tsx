"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, AlarmClock, ChevronRight, Download, SlidersHorizontal, X } from "lucide-react";
import { Button, Card, DateDisplay } from "@ishoot/ui";
import type { RequestListRow } from "@ishoot/database";
import { REQUEST_DUE_FILTERS, REQUEST_KINDS, REQUEST_PRIORITIES, REQUEST_SORTS, REQUEST_SOURCES, REQUEST_TEAMS } from "@ishoot/database/constants/requests";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { RequestPriorityBadge, RequestTypeBadge, RequestWorkflowBadge } from "./RequestBadges";

const KIND_TO_TYPE = { service: "SR", quote: "quote_request", inquiry: "inquiry", feedback: "complaint" } as const;
const WORKFLOW = ["received", "assigned", "pending_approval", "approved", "confirmed", "returned", "resolved"] as const;

export interface RequestInboxFilters {
  kind: string;
  status: string;
  scope: string;
  team: string;
  priority: string;
  due: string;
  assignee: string;
  source: string;
  customerId: string;
  from: string;
  to: string;
  search: string;
  sort: string;
}
const DEFAULTS: Partial<RequestInboxFilters> = { status: "open", sort: "urgency" };
const MORE_KEYS = ["team", "priority", "assignee", "source", "due", "from", "to"] as const;

/** The request inbox: read-only rows; every action happens on the request's own page. */
export function RequestsInboxView({
  rows,
  total,
  page,
  stats,
  filters,
  canCreate,
  canExport,
  staff,
}: {
  rows: RequestListRow[];
  total: number;
  page: number;
  stats: Record<"open" | "overdue" | "unassigned" | "awaitingApproval" | "mine" | "resolvedThisMonth", number>;
  filters: RequestInboxFilters;
  canCreate: boolean;
  canExport: boolean;
  staff: Array<{ id: string; name: string }>;
}) {
  const { t, locale } = useAdminLocale();
  const router = useRouter();
  const copy = t.requestInbox;
  const params = (patch: Partial<RequestInboxFilters> & { page?: number }) => {
    const next = { ...filters, ...patch };
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (key === "page" || !value || value === "all" || DEFAULTS[key as keyof RequestInboxFilters] === value) continue;
      search.set(key, String(value));
    }
    if (patch.page && patch.page > 1) search.set("page", String(patch.page));
    return search;
  };
  const href = (patch: Partial<RequestInboxFilters> & { page?: number }) => {
    const query = params(patch).toString();
    return query ? `${ROUTES.requests.list}?${query}` : ROUTES.requests.list;
  };
  const activeMore = MORE_KEYS.filter((key) => filters[key] && filters[key] !== "all").length;
  const [showMore, setShowMore] = React.useState(activeMore > 0);
  const filtered = activeMore > 0 || !!filters.search || filters.kind !== "all" || filters.status !== "open" || filters.scope !== "all" || filters.sort !== "urgency" || !!filters.customerId;
  const pages = Math.max(1, Math.ceil(total / 50));
  const tiles: Array<[keyof typeof stats, Partial<RequestInboxFilters>]> = [
    ["open", { status: "open", scope: "all", due: "all" }],
    ["overdue", { due: "overdue" }],
    ["unassigned", { scope: "unassigned" }],
    ["awaitingApproval", { status: "pending_approval" }],
    ["mine", { scope: "mine" }],
    ["resolvedThisMonth", { status: "resolved" }],
  ];
  const select = "rounded-xl border border-ink/15 bg-surface px-3 py-2 text-xs text-ink";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink font-display">{copy.title}</h1>
          <p className="text-sm text-ink-muted mt-1">{copy.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {canExport && (
            <a href={`/api/exports/requests?${params({}).toString()}`} className="inline-flex items-center gap-1.5 h-9 rounded-full border border-ink/15 px-4 text-xs font-semibold text-ink hover:bg-ink/5">
              <Download className="w-3.5 h-3.5" />
              {copy.export}
            </a>
          )}
          {canCreate && (
            <Link href={ROUTES.requests.create}>
              <Button size="sm" className="gap-2"><Plus className="w-4 h-4" />{copy.newRequest}</Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {tiles.map(([key, patch]) => (
          <Link key={key} href={href({ ...patch, page: 1 })} className="rounded-2xl border border-ink/10 bg-surface p-4 hover:border-accent/50 transition-colors">
            <div className="text-[11px] text-ink-muted">{copy.stats[key]}</div>
            <div className={`text-2xl font-bold ${key === "overdue" && stats.overdue ? "text-rose-500" : "text-ink"}`}>{stats[key]}</div>
          </Link>
        ))}
      </div>

      <form
        className="rounded-2xl border border-ink/10 bg-surface p-3 space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const patch: Record<string, string> = {};
          data.forEach((value, key) => (patch[key] = String(value)));
          router.push(href({ ...patch, page: 1 }));
        }}
      >
        {filters.customerId ? <input type="hidden" name="customerId" value={filters.customerId} /> : null}
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute start-3 top-2.5 text-ink-muted" />
            <input name="search" defaultValue={filters.search} placeholder={copy.filters.search} aria-label={copy.filters.search} className={`${select} w-full ps-8`} />
          </label>
          <select name="kind" defaultValue={filters.kind} aria-label={copy.filters.kind} className={select}>
            <option value="all">{copy.kinds.all}</option>
            {REQUEST_KINDS.map((k) => <option key={k} value={k}>{copy.kinds[k]}</option>)}
          </select>
          <select name="status" defaultValue={filters.status} aria-label={copy.filters.status} className={select}>
            <option value="open">{copy.statuses.open}</option>
            <option value="all">{copy.statuses.all}</option>
            {WORKFLOW.map((s) => <option key={s} value={s}>{t.requestLabels.workflow[s]}</option>)}
          </select>
          <select name="scope" defaultValue={filters.scope} aria-label={copy.filters.scope} className={select}>
            {(["all", "mine", "unassigned"] as const).map((s) => <option key={s} value={s}>{copy.scopes[s]}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-ink-muted">
            <span className="hidden sm:inline">{copy.filters.sort}</span>
            <select name="sort" defaultValue={filters.sort} aria-label={copy.filters.sort} className={select}>
              {REQUEST_SORTS.map((s) => <option key={s} value={s}>{copy.sorts[s]}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => setShowMore((v) => !v)} aria-expanded={showMore} className={`${select} inline-flex items-center gap-1.5 font-semibold`}>
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {copy.filters.more}
            {activeMore ? <span className="rounded-full bg-accent px-1.5 text-[10px] text-white">{activeMore}</span> : null}
          </button>
          <Button type="submit" size="sm">{copy.filters.apply}</Button>
          {filtered ? (
            <Link href={ROUTES.requests.list} className="inline-flex items-center gap-1 px-2 text-xs font-semibold text-ink-muted hover:text-ink">
              <X className="w-3.5 h-3.5" />{copy.filters.reset}
            </Link>
          ) : null}
        </div>
        {showMore ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 border-t border-ink/10 pt-2">
            <select name="team" defaultValue={filters.team} aria-label={copy.filters.team} className={select}>
              <option value="all">{t.requestLabels.teams.all}</option>
              {REQUEST_TEAMS.map((team) => <option key={team} value={team}>{t.requestLabels.teams[team]}</option>)}
            </select>
            <select name="priority" defaultValue={filters.priority} aria-label={copy.filters.priority} className={select}>
              <option value="all">{copy.anyPriority}</option>
              {REQUEST_PRIORITIES.map((p) => <option key={p} value={p}>{t.requestLabels.priority[p]}</option>)}
            </select>
            <select name="assignee" defaultValue={filters.assignee} aria-label={copy.filters.assignee} className={select}>
              <option value="all">{copy.filters.anyAssignee}</option>
              {staff.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <select name="source" defaultValue={filters.source} aria-label={copy.filters.source} className={select}>
              <option value="all">{copy.filters.anySource}</option>
              {REQUEST_SOURCES.map((source) => <option key={source} value={source}>{copy.sources[source]}</option>)}
            </select>
            <select name="due" defaultValue={filters.due} aria-label={copy.filters.due} className={select}>
              <option value="all">{copy.filters.anyDue}</option>
              {REQUEST_DUE_FILTERS.map((d) => <option key={d} value={d}>{copy.dues[d]}</option>)}
            </select>
            <label className="flex flex-col gap-0.5 text-[10px] text-ink-muted">
              {copy.filters.from}
              <input type="date" name="from" defaultValue={filters.from} className={select} />
            </label>
            <label className="flex flex-col gap-0.5 text-[10px] text-ink-muted">
              {copy.filters.to}
              <input type="date" name="to" defaultValue={filters.to} className={select} />
            </label>
          </div>
        ) : null}
      </form>

      <Card className="p-0 overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-ink/5 text-[11px] uppercase text-ink-muted">
              <tr>
                <th className="px-4 py-3 text-start">{copy.columns.reference}</th>
                <th className="px-4 py-3 text-start">{copy.columns.request}</th>
                <th className="px-4 py-3 text-start">{copy.columns.priority}</th>
                <th className="px-4 py-3 text-start">{copy.columns.status}</th>
                <th className="px-4 py-3 text-start">{copy.columns.assignee}</th>
                <th className="px-4 py-3 text-start">{copy.columns.received}</th>
                <th className="px-4 py-3 text-start">{copy.columns.sla}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {rows.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-ink-muted">{copy.empty}</td></tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} onClick={() => router.push(ROUTES.requests.detail(row.id))} className="cursor-pointer hover:bg-ink/5">
                  <td className="px-4 py-3 align-top">
                    <div className="font-mono text-xs text-ink">{row.reference.length > 20 ? row.reference.slice(0, 10) + "…" : row.reference}</div>
                    <div className="mt-1"><RequestTypeBadge type={KIND_TO_TYPE[row.kind]} size="sm" /></div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-ink">{row.title}</div>
                    <div className="text-xs text-ink-muted">{row.customer}</div>
                  </td>
                  <td className="px-4 py-3 align-top whitespace-nowrap"><RequestPriorityBadge priority={row.priority} /></td>
                  <td className="px-4 py-3 align-top"><RequestWorkflowBadge status={row.workflowStatus} size="sm" /></td>
                  <td className="px-4 py-3 align-top text-xs text-ink">
                    {row.assignee ?? <span className="text-ink-muted">{copy.unassigned}</span>}
                    {row.team && <div className="text-ink-muted">{t.requestLabels.teams[row.team as keyof typeof t.requestLabels.teams] ?? row.team}</div>}
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-ink whitespace-nowrap">
                    <DateDisplay date={row.createdAt} locale={locale} />
                    <div className="text-ink-muted">{copy.sources[row.source as keyof typeof copy.sources] ?? row.source}</div>
                  </td>
                  <td className="px-4 py-3 align-top text-xs whitespace-nowrap">
                    {row.slaDueDate ? (
                      <span className={`inline-flex items-center gap-1 ${row.overdue ? "text-rose-500 font-semibold" : "text-ink"}`}>
                        {row.overdue && <AlarmClock className="w-3.5 h-3.5" />}
                        <DateDisplay date={row.slaDueDate} locale={locale} />
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 align-top text-end">
                    <Link href={ROUTES.requests.detail(row.id)} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
                      {copy.open}<ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-ink/10 px-4 py-3 text-xs text-ink-muted">
            <span>{page} / {pages} · {total}</span>
            <span className="flex gap-3">
              {page > 1 && <Link href={href({ page: page - 1 })}>{copy.previous}</Link>}
              {page < pages && <Link href={href({ page: page + 1 })}>{copy.next}</Link>}
            </span>
          </div>
        )}
      </Card>
    </div>
  );
}
