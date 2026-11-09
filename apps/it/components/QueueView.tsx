"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Filter, RotateCcw, ArrowRight } from "lucide-react";
import type { TicketPage } from "@platform/api-client";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  ticketCategory,
} from "@platform/contracts";
import { useCopy } from "./CopyProvider";
import { OverdueBadge, PageTitle, RemindedBadge, StatusBadge } from "./ticket-ui";

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
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Filter className="size-3.5 text-sky-600" />
          <span>{t.filtersTitle}</span>
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
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            On Track
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
