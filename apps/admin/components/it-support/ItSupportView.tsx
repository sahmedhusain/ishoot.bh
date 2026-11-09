"use client";

import Link from "next/link";
import { Card } from "@platform/ui";
import { ChevronRight, Plus } from "lucide-react";
import type { TicketPage } from "@platform/api-client";
import { TICKET_STATUSES, ticketCategory } from "@platform/contracts";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { PageHeader } from "../layout/PageHeader";
import { TicketStatusBadge, useTicketText } from "./ticket-text";

interface ItSupportViewProps {
  status: string;
  page: TicketPage | null;
  canCreate: boolean;
}

export function ItSupportView({ status, page, canCreate }: ItSupportViewProps) {
  const { t } = useAdminLocale();
  const s = t.itSupport;
  const text = useTicketText();

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <PageHeader
        actions={
          canCreate && (
            <Link
              href={ROUTES.itSupport.create}
              className="inline-flex items-center gap-1.5 self-start px-4 py-2 rounded-full bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent-hover"
            >
              <Plus className="w-4 h-4" />
              {s.newTicket}
            </Link>
          )
        }
      />

      <div className="flex flex-wrap gap-2">
        {["", ...TICKET_STATUSES].map((value) => (
          <Link
            key={value || "all"}
            href={ROUTES.itSupport.list({ status: value })}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${status === value ? "border-accent text-accent bg-accent/10" : "border-outline-variant text-ink-muted hover:text-ink"}`}
          >
            {value ? text.status(value) : t.actions.all}
          </Link>
        ))}
      </div>

      {!page ? (
        <Card
          role="alert"
          className="p-12 text-center text-sm text-ink-muted rounded-3xl bg-surface border border-outline-variant"
        >
          {s.unavailable}
        </Card>
      ) : page.items.length === 0 ? (
        <Card className="p-12 text-center text-sm text-ink-muted rounded-3xl bg-surface border border-outline-variant">
          {s.empty}
        </Card>
      ) : (
        <div className="space-y-3">
          {page.items.map((ticket) => {
            const category = ticketCategory(ticket.category);
            return (
              <Link
                key={ticket.id}
                href={ROUTES.itSupport.detail(ticket.id)}
                className="block rounded-3xl border border-outline-variant bg-surface p-4 sm:p-5 hover:border-ink/25 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-ink-muted">
                        {text.number(ticket.number)}
                      </span>
                      <TicketStatusBadge status={ticket.status} />
                      {ticket.breached && ticket.status !== "closed" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300">
                          {s.overdue}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-ink mt-1 line-clamp-1">
                      <bdi dir="auto">{ticket.title}</bdi>
                    </div>
                    <div className="text-[11px] text-ink-muted mt-0.5">
                      {category ? text.name(category) : ticket.category}
                      {" · "}
                      {text.priority(ticket.priority)}
                      {" · "}
                      {text.date(ticket.createdAt)}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-ink-muted rtl:rotate-180" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {page?.nextCursor && (
        <div className="flex justify-center">
          <Link
            href={ROUTES.itSupport.list({ status, cursor: page.nextCursor })}
            className="px-4 py-2 rounded-full border border-outline-variant text-xs font-semibold text-ink-muted hover:text-ink"
          >
            {s.loadMore}
          </Link>
        </div>
      )}
    </div>
  );
}
