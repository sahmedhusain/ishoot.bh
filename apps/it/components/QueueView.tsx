"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Filter, RotateCcw, ListFilter, ArrowRight } from "lucide-react";
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

  // Local filter states for dropdown form
  const [selectedScope, setSelectedScope] = React.useState<string>(
    query.mine ? "mine" : query.open ? "open" : "all"
  );
  const [selectedCategory, setSelectedCategory] = React.useState<string>(query.category || "");
  const [selectedStatus, setSelectedStatus] = React.useState<string>(query.status || "");
  const [selectedPriority, setSelectedPriority] = React.useState<string>(query.priority || "");

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    const openVal = selectedScope === "open" ? true : selectedScope === "mine" ? false : false;
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 dark:border-slate-700 pb-2">
        <PageTitle title={t.title} description={t.description} />
        <span className="it-status-pane font-bold text-amber-700 dark:text-amber-400">
          T-CODE: SM37 [QUEUE]
        </span>
      </div>

      {/* SAP / Oracle Utilitarian Dropdown Filter Bar */}
      <div className="it-card space-y-3">
        <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-700 pb-1.5">
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase text-ink">
            <ListFilter className="size-3.5 text-amber-600" />
            <span>{t.filtersTitle}</span>
          </div>
          <div className="text-[10px] font-mono text-ink-muted">
            SELECTION VARIANT: DEFAULT
          </div>
        </div>

        <form onSubmit={handleApplyFilters} className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5 text-xs font-mono">
          {/* 1. Scope / Assignment Dropdown */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-ink-muted mb-1">
              {t.scope}
            </label>
            <select
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value)}
              className="it-field-sunken w-full"
            >
              <option value="open">{t.scopeOpen}</option>
              <option value="mine">{t.scopeMine}</option>
              <option value="all">{t.scopeAll}</option>
            </select>
          </div>

          {/* 2. Category Dropdown */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-ink-muted mb-1">
              {t.category}
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="it-field-sunken w-full"
            >
              <option value="">{t.allCategories}</option>
              {TICKET_CATEGORIES.map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {name(cat)}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Status Dropdown */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-ink-muted mb-1">
              {t.status}
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="it-field-sunken w-full"
            >
              <option value="">{t.allStatuses}</option>
              {TICKET_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {status(s)}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Priority Dropdown */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-ink-muted mb-1">
              {t.priority}
            </label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="it-field-sunken w-full"
            >
              <option value="">{t.allPriorities}</option>
              {TICKET_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {priority(p)}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Filter Action Buttons */}
          <div className="flex items-end gap-1.5">
            <button
              type="submit"
              className="it-btn-3d flex-1 py-1.5 font-bold text-emerald-800 dark:text-emerald-300"
            >
              {t.filterApply}
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="it-btn-3d py-1.5 px-2"
              title={t.filterReset}
            >
              <RotateCcw className="size-3.5" />
            </button>
          </div>
        </form>
      </div>

      {/* Tickets Tabular Display (Dense SAP GUI Table) */}
      {!page ? (
        <div className="it-card p-8 text-center text-xs font-mono text-ink-muted">
          {copy.overview.unavailable}
        </div>
      ) : page.items.length === 0 ? (
        <div className="it-card p-8 text-center text-xs font-mono text-ink-muted">
          {t.empty}
        </div>
      ) : (
        <div className="it-card p-0 overflow-x-auto">
          <table className="it-table w-full font-mono text-xs">
            <thead>
              <tr>
                <th className="w-24">TICKET #</th>
                <th className="w-24">PRIORITY</th>
                <th className="w-28">STATUS</th>
                <th className="w-28">SLA TIMING</th>
                <th>SUBJECT / DESCRIPTION</th>
                <th className="w-32">CATEGORY</th>
                <th className="w-36">REQUESTER</th>
                <th className="w-36">ASSIGNEE</th>
                <th className="w-32">CREATED</th>
                <th className="w-16 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {page.items.map((ticket) => {
                const category = ticketCategory(ticket.category);
                return (
                  <tr key={ticket.id} className="cursor-pointer">
                    <td className="font-bold text-sky-700 dark:text-sky-400">
                      <Link href={`/tickets/${ticket.id}`} className="hover:underline">
                        {number(ticket.number)}
                      </Link>
                    </td>
                    <td>
                      <span className="font-semibold">{priority(ticket.priority)}</span>
                    </td>
                    <td>
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td>
                      {ticket.breached ? (
                        <OverdueBadge />
                      ) : ticket.remindedAt ? (
                        <RemindedBadge />
                      ) : (
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">ON TRACK</span>
                      )}
                    </td>
                    <td className="font-sans font-semibold text-ink max-w-xs truncate">
                      <Link href={`/tickets/${ticket.id}`} className="hover:underline block truncate">
                        <bdi dir="auto">{ticket.title}</bdi>
                      </Link>
                    </td>
                    <td className="text-ink-muted text-[11px]">
                      {category ? name(category) : ticket.category}
                    </td>
                    <td className="truncate text-ink-muted text-[11px]">
                      <bdi dir="auto">{ticket.requesterName}</bdi>
                    </td>
                    <td className="truncate text-[11px]">
                      {ticket.assigneeName ? (
                        <bdi dir="auto" className="font-semibold">{ticket.assigneeName}</bdi>
                      ) : (
                        <span className="text-amber-700 dark:text-amber-400 italic">{t.unassigned}</span>
                      )}
                    </td>
                    <td className="text-[10px] text-ink-muted whitespace-nowrap">
                      {date(ticket.createdAt)}
                    </td>
                    <td className="text-center">
                      <Link
                        href={`/tickets/${ticket.id}`}
                        className="it-btn-3d py-0.5 px-1.5 text-[10px]"
                        title="Open Ticket"
                      >
                        <ArrowRight className="size-3 rtl:rotate-180" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {page?.nextCursor && (
        <div className="flex justify-center pt-2">
          <Link
            href={buildHref(query, { cursor: page.nextCursor })}
            className="it-btn-3d py-1.5 px-4 font-mono font-bold"
          >
            {t.loadMore}
          </Link>
        </div>
      )}
    </div>
  );
}
