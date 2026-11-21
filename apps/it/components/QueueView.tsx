"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Filter, RotateCcw, ArrowRight, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { formatMessage } from "@platform/locales";
import type { TicketPage } from "@platform/api-client";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  ticketCategory,
} from "@platform/contracts";
import { transitionAction } from "../app/actions";
import { useCopy } from "./CopyProvider";
import { OverdueBadge, PageTitle, RemindedBadge, StatusBadge } from "./ticket-ui";

function formatSlaCountdown(deadlineIso?: string | null): string | null {
  if (!deadlineIso) return null;
  const diffMs = Date.parse(deadlineIso) - Date.now();
  if (Number.isNaN(diffMs)) return null;
  if (diffMs <= 0) return "0m";
  const mins = Math.floor(diffMs / 60_000);
  const hours = Math.floor(mins / 60);
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${mins % 60}m`;
  return `${mins}m`;
}

export type QueueQuery = {
  status: string;
  priority: string;
  category: string;
  open: boolean;
  mine: boolean;
  cursor: string;
};

const buildHref = (query: QueueQuery, change: Partial<QueueQuery>) => {
  const next = { ...query, cursor: "", ...change };
  const params = new URLSearchParams();
  if (next.status) params.set("status", next.status);
  if (next.priority) params.set("priority", next.priority);
  if (next.category) params.set("category", next.category);
  if (!next.open) params.set("open", "false");
  if (next.mine) params.set("mine", "true");
  if (next.cursor) params.set("cursor", next.cursor);
  const search = params.toString();
  return search ? `/tickets?${search}` : "/tickets";
};

export function QueueView({
  query,
  page,
}: {
  query: QueueQuery;
  page: TicketPage | null;
}) {
  const { copy, status, priority, number, name, date } = useCopy();
  const t = copy.tickets;
  const router = useRouter();

  const [selectedScope, setSelectedScope] = React.useState<string>(
    query.mine ? "mine" : query.open ? "open" : "all",
  );
  const [selectedCategory, setSelectedCategory] = React.useState<string>(query.category || "");
  const [selectedStatus, setSelectedStatus] = React.useState<string>(query.status || "");
  const [selectedPriority, setSelectedPriority] = React.useState<string>(query.priority || "");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = React.useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleAllVisible = () => {
    const visibleIds = (page?.items ?? []).map((item) => item.id);
    if (selectedIds.length === visibleIds.length && visibleIds.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visibleIds);
    }
  };

  const runBulkTransition = async (action: "assign" | "start") => {
    if (!page || selectedIds.length === 0) return;
    setBulkBusy(true);
    let ok = 0;
    try {
      for (const id of selectedIds) {
        const ticket = page.items.find((x) => x.id === id);
        if (!ticket) continue;
        const res = await transitionAction(ticket.id, ticket.status, action);
        if (res.ok) ok++;
      }
      toast.success(formatMessage(t.bulkUpdated, { ok, total: selectedIds.length }));
      setSelectedIds([]);
      router.refresh();
    } catch {
      toast.error(t.failed);
    } finally {
      setBulkBusy(false);
    }
  };

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    const openVal = selectedScope === "open";
    const mineVal = selectedScope === "mine";

    const nextHref = buildHref(query, {
      open: openVal,
      mine: mineVal,
      category: selectedCategory,
      status: selectedStatus,
      priority: selectedPriority,
    });
    router.push(nextHref);
  };

  const handleResetFilters = () => {
    setSelectedScope("open");
    setSelectedCategory("");
    setSelectedStatus("");
    setSelectedPriority("");
    router.push("/tickets");
  };

  return (
    <div className="space-y-5">
      <PageTitle title={t.title} description={t.description} />

      <div className="it-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Filter className="size-3.5 text-sky-600" />
            <span>{t.filtersTitle}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
            <span className="text-ink-muted uppercase text-[10px]">{t.savedViews}:</span>
            <Link href="/tickets" className="it-btn-3d px-2 py-0.5">{t.openOnly}</Link>
            <Link href="/tickets?mine=true" className="it-btn-3d px-2 py-0.5">{t.mine}</Link>
            <Link href="/tickets?priority=urgent" className="it-btn-3d px-2 py-0.5 text-rose-700 dark:text-rose-400">{t.viewUrgent}</Link>
            <Link href="/tickets?open=false" className="it-btn-3d px-2 py-0.5">{t.everything}</Link>
          </div>
        </div>

        <form
          onSubmit={handleApplyFilters}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
        >

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Scope
            </label>
            <select
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="open">{t.openOnly}</option>
              <option value="mine">{t.mine}</option>
              <option value="all">{t.everything}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              {t.category}
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="">{t.allCategories}</option>
              {TICKET_CATEGORIES.map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {name(cat)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              {t.status}
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="">{t.allStatuses}</option>
              {TICKET_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {status(s)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              {t.priority}
            </label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="">{t.allPriorities}</option>
              {TICKET_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {priority(p)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 py-1.5 px-3 rounded-md bg-[#0070d2] hover:bg-[#005fb2] text-white text-xs font-semibold shadow-sm transition-colors"
            >
              {t.filterApply}
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="py-1.5 px-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs transition-colors"
              title={t.filterReset}
            >
              <RotateCcw className="size-3.5" />
            </button>
          </div>
        </form>
      </div>

      {selectedIds.length > 0 && (
        <div className="it-card p-3 flex flex-wrap items-center justify-between gap-2 border-l-4 border-l-sky-600 bg-sky-50/60 dark:bg-sky-950/30 font-mono text-xs">
          <div className="flex items-center gap-2 font-bold text-sky-800 dark:text-sky-300">
            <CheckSquare className="h-4 w-4" />
            <span>{formatMessage(t.bulkSelected, { count: selectedIds.length })}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => void runBulkTransition("assign")}
              className="it-btn-3d py-1 px-3 text-xs font-bold text-emerald-800 dark:text-emerald-300"
            >
              {t.bulkAssignMe}
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => void runBulkTransition("start")}
              className="it-btn-3d py-1 px-3 text-xs font-bold text-sky-800 dark:text-sky-300"
            >
              {t.bulkStart}
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="it-btn-3d py-1 px-2 text-xs"
            >
              {t.filterReset}
            </button>
          </div>
        </div>
      )}

      {!page ? (
        <div className="it-card p-12 text-center text-xs text-slate-500">
          {copy.overview.unavailable}
        </div>
      ) : page.items.length === 0 ? (
        <div className="it-card p-12 text-center text-xs text-slate-500">
          {t.empty}
        </div>
      ) : (
        <div className="it-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 text-slate-500 uppercase text-[11px] font-semibold">
                  <th className="py-2.5 px-3 w-8">
                    <input
                      type="checkbox"
                      aria-label="Select all tickets"
                      checked={page.items.length > 0 && selectedIds.length === page.items.length}
                      onChange={toggleAllVisible}
                    />
                  </th>
                  <th className="py-2.5 px-4 w-24">#</th>
                  <th className="py-2.5 px-4 w-24">Priority</th>
                  <th className="py-2.5 px-4 w-28">Status</th>
                  <th className="py-2.5 px-4 w-28">SLA</th>
                  <th className="py-2.5 px-4">Subject</th>
                  <th className="py-2.5 px-4 w-32">Category</th>
                  <th className="py-2.5 px-4 w-36">Requester</th>
                  <th className="py-2.5 px-4 w-36">Assignee</th>
                  <th className="py-2.5 px-4 w-32">Created</th>
                  <th className="py-2.5 px-4 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {page.items.map((ticket) => {
                  const category = ticketCategory(ticket.category);
                  return (
                    <tr
                      key={ticket.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          aria-label={`Select ticket ${ticket.number}`}
                          checked={selectedIds.includes(ticket.id)}
                          onChange={() => toggleSelect(ticket.id)}
                        />
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-sky-700 dark:text-sky-400">
                        <Link
                          href={`/tickets/${ticket.id}`}
                          className="hover:underline"
                        >
                          {number(ticket.number)}
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                        {priority(ticket.priority)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={ticket.status} />
                      </td>
                      <td className="py-3 px-4">
                        {ticket.breached ? (
                          <OverdueBadge />
                        ) : ticket.remindedAt ? (
                          <RemindedBadge />
                        ) : (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium font-mono">
                            {formatSlaCountdown(ticket.resolveBy)
                              ? formatMessage(t.slaRemaining, {
                                  time: formatSlaCountdown(ticket.resolveBy)!,
                                })
                              : "On Track"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100 max-w-xs truncate">
                        <Link
                          href={`/tickets/${ticket.id}`}
                          className="hover:underline block truncate"
                        >
                          {ticket.title}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {category ? name(category) : ticket.category}
                      </td>
                      <td className="py-3 px-4 text-slate-500 truncate">
                        {ticket.requesterName}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 truncate">
                        {ticket.assigneeName ? (
                          <span className="font-medium">{ticket.assigneeName}</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 italic">
                            {t.unassigned}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {date(ticket.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Link
                          href={`/tickets/${ticket.id}`}
                          className="p-1 rounded text-slate-400 hover:text-sky-600 transition-colors inline-block"
                          title="Open Ticket"
                        >
                          <ArrowRight className="size-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {page?.nextCursor && (
        <div className="flex justify-center pt-2">
          <Link
            href={buildHref(query, { cursor: page.nextCursor })}
            className="py-2 px-5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
          >
            {t.loadMore}
          </Link>
        </div>
      )}
    </div>
  );
}
