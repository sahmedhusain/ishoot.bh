"use client";

import Link from "next/link";
import { Card } from "@platform/ui";
import { ChevronRight } from "lucide-react";
import type { TicketPage } from "@platform/api-client";
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  ticketCategory,
} from "@platform/contracts";
import { useCopy } from "./CopyProvider";
import { OverdueBadge, PageTitle, StatusBadge } from "./ticket-ui";

export type QueueQuery = {
  status: string;
  priority: string;
  open: boolean;
  mine: boolean;
  cursor: string;
};

const href = (query: QueueQuery, change: Partial<QueueQuery>) => {
  const next = { ...query, cursor: "", ...change };
  const params = new URLSearchParams();
  if (next.status) params.set("status", next.status);
  if (next.priority) params.set("priority", next.priority);
  if (!next.open) params.set("open", "false");
  if (next.mine) params.set("mine", "true");
  if (next.cursor) params.set("cursor", next.cursor);
  const search = params.toString();
  return search ? `/tickets?${search}` : "/tickets";
};

const chip = (on: boolean) =>
  `px-3 py-1.5 rounded-full text-xs font-semibold border ${on ? "border-accent text-accent bg-accent/10" : "border-outline-variant text-ink-muted hover:text-ink"}`;

export function QueueView({
  query,
  page,
}: {
  query: QueueQuery;
  page: TicketPage | null;
}) {
  const { copy, status, priority, number, name, date } = useCopy();
  const t = copy.tickets;
  return (
    <>
      <PageTitle title={t.title} description={t.description} />
      <div className="space-y-3 mb-6">
        <div className="flex flex-wrap gap-2">
          <Link
            href={href(query, { open: true, mine: false, status: "" })}
            className={chip(query.open && !query.mine && !query.status)}
          >
            {t.openOnly}
          </Link>
          <Link
            href={href(query, { mine: !query.mine })}
            className={chip(query.mine)}
          >
            {t.mine}
          </Link>
          <Link
            href={href(query, { open: false, status: "" })}
            className={chip(!query.open && !query.status)}
          >
            {t.everything}
          </Link>
        </div>
        <div className="flex flex-wrap gap-2" aria-label={t.status}>
          {TICKET_STATUSES.map((s) => (
            <Link
              key={s}
              href={href(query, { status: query.status === s ? "" : s })}
              className={chip(query.status === s)}
            >
              {status(s)}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" aria-label={t.priority}>
          {TICKET_PRIORITIES.map((p) => (
            <Link
              key={p}
              href={href(query, { priority: query.priority === p ? "" : p })}
              className={chip(query.priority === p)}
            >
              {priority(p)}
            </Link>
          ))}
        </div>
      </div>

      {!page ? (
        <Card
          role="alert"
          className="p-12 text-center text-sm text-ink-muted rounded-3xl bg-surface border border-outline-variant"
        >
          {copy.overview.unavailable}
        </Card>
      ) : page.items.length === 0 ? (
        <Card className="p-12 text-center text-sm text-ink-muted rounded-3xl bg-surface border border-outline-variant">
          {t.empty}
        </Card>
      ) : (
        <ul className="space-y-3">
          {page.items.map((ticket) => {
            const category = ticketCategory(ticket.category);
            return (
              <li key={ticket.id}>
                <Link
                  href={`/tickets/${ticket.id}`}
                  className="flex items-center gap-3 rounded-3xl border border-outline-variant bg-surface p-4 sm:p-5 hover:border-ink/25"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-ink-muted">
                        {number(ticket.number)}
                      </span>
                      <StatusBadge status={ticket.status} />
                      {ticket.breached && <OverdueBadge />}
                      <span className="text-[11px] font-semibold text-ink-muted">
                        {priority(ticket.priority)}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-ink mt-1 truncate">
                      <bdi dir="auto">{ticket.title}</bdi>
                    </div>
                    <div className="text-[11px] text-ink-muted mt-0.5">
                      <bdi dir="auto">{ticket.requesterName}</bdi>
                      {" · "}
                      {category ? name(category) : ticket.category}
                      {" · "}
                      {ticket.assigneeName ? (
                        <bdi dir="auto">{ticket.assigneeName}</bdi>
                      ) : (
                        t.unassigned
                      )}
                      {" · "}
                      {date(ticket.createdAt)}
                    </div>
                  </div>
                  <ChevronRight
                    className="size-4 text-ink-muted rtl:rotate-180"
                    aria-hidden
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {page?.nextCursor && (
        <div className="flex justify-center mt-6">
          <Link
            href={href(query, { cursor: page.nextCursor })}
            className={chip(false)}
          >
            {t.loadMore}
          </Link>
        </div>
      )}
    </>
  );
}
