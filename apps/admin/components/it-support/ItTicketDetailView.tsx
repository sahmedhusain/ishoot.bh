"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Card } from "@platform/ui";
import { Paperclip, Send } from "lucide-react";
import type { TicketDetail } from "@platform/api-client";
import {
  TICKET_OPEN_STATUSES,
  requesterTransitions,
  ticketCategory,
} from "@platform/contracts";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import {
  commentOnItTicketAction,
  transitionItTicketAction,
} from "../../app/actions/it-support";
import { PageHeader } from "../layout/PageHeader";
import { TicketStatusBadge, useTicketText } from "./ticket-text";

interface ItTicketDetailViewProps {
  detail: TicketDetail;
  canEdit: boolean;
}

export function ItTicketDetailView({
  detail,
  canEdit,
}: ItTicketDetailViewProps) {
  const { t } = useAdminLocale();
  const s = t.itSupport;
  const text = useTicketText();
  const router = useRouter();
  const { ticket, comments, events, attachments } = detail;
  const category = ticketCategory(ticket.category);
  const subcategory = category?.subcategories.find(
    (sub) => sub.key === ticket.subcategory,
  );
  const finished = ticket.status === "closed" || ticket.status === "cancelled";
  const open = TICKET_OPEN_STATUSES.includes(ticket.status);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(done);
      router.refresh();
      return true;
    } catch (err) {
      toast.error(errorMessage(err, t, s.actionFailed));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      await run(
        () => commentOnItTicketAction(ticket.id, message),
        s.commentSent,
      )
    )
      setMessage("");
  };

  const facts: [string, React.ReactNode][] = [
    [s.category, category ? text.name(category) : ticket.category],
    [s.subcategory, subcategory ? text.name(subcategory) : ticket.subcategory],
    [s.priority, text.priority(ticket.priority)],
    [s.assignee, ticket.assigneeName ?? s.unassigned],
    [
      s.respondBy,
      ticket.firstResponseAt
        ? text.date(ticket.firstResponseAt)
        : text.date(ticket.respondBy),
    ],
    [
      s.resolveBy,
      ticket.resolvedAt
        ? text.date(ticket.resolvedAt)
        : text.date(ticket.resolveBy),
    ],
  ];
  if (ticket.assetRef)
    facts.push([
      s.assetRef,
      <bdi key="asset" dir="ltr">
        {ticket.assetRef}
      </bdi>,
    ]);

  return (
    <div
      inert={busy}
      aria-busy={busy}
      className="space-y-6 max-w-5xl mx-auto pb-16"
    >
      <PageHeader
        back={{ href: ROUTES.itSupport.list() }}
        meta={
          <>
            <span className="font-mono text-xs text-ink-muted">
              {text.number(ticket.number)}
            </span>
            <TicketStatusBadge status={ticket.status} />
            {ticket.breached && open && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300">
                {s.overdue}
              </span>
            )}
          </>
        }
        actions={
          canEdit && (
            <div className="flex flex-wrap gap-2">
              {requesterTransitions(ticket.status).map((name) => (
                <Button
                  key={name}
                  type="button"
                  size="sm"
                  variant={name === "cancel" ? "outline" : "primary"}
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => transitionItTicketAction(ticket.id, name),
                      s.updated,
                    )
                  }
                >
                  {text.transition(name)}
                </Button>
              ))}
            </div>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 bg-surface border border-outline-variant rounded-3xl space-y-3">
            <h2 className="text-lg font-bold text-ink">
              <bdi dir="auto">{ticket.title}</bdi>
            </h2>
            <p className="text-sm text-ink whitespace-pre-wrap">
              <bdi dir="auto">{ticket.description}</bdi>
            </p>
            {attachments.length > 0 && (
              <ul className="flex flex-wrap gap-2 pt-2">
                {attachments.map((a) => (
                  <li key={a.fileUrl}>
                    <a
                      href={ROUTES.itSupport.attachment(ticket.id, a.fileUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-outline-variant text-xs text-ink hover:border-accent"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <bdi dir="auto">{a.fileName}</bdi>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-6 bg-surface border border-outline-variant rounded-3xl space-y-4">
            <h3 className="text-sm font-bold text-ink">{s.conversation}</h3>
            {comments.length === 0 ? (
              <p className="text-xs text-ink-muted">{s.noComments}</p>
            ) : (
              <ul className="space-y-3">
                {comments.map((c) => (
                  <li
                    key={c.id}
                    className={`p-3 rounded-2xl text-sm ${c.authorRealm === "it" ? "bg-accent/5 border border-accent/20" : "bg-surface-sunken"}`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] text-ink-muted mb-1">
                      <span className="font-semibold text-ink">
                        <bdi dir="auto">{c.authorName}</bdi>
                      </span>
                      <span>{text.date(c.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-ink">
                      <bdi dir="auto">{c.body}</bdi>
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {canEdit &&
              (finished ? (
                <p className="text-xs text-ink-muted">{s.closedNoComments}</p>
              ) : (
                <form onSubmit={send} className="space-y-2">
                  <textarea
                    required
                    maxLength={10000}
                    rows={3}
                    aria-label={s.commentPlaceholder}
                    placeholder={s.commentPlaceholder}
                    className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      size="sm"
                      variant="primary"
                      disabled={busy || !message.trim()}
                      className="gap-2"
                    >
                      <Send className="w-4 h-4" />
                      {s.sendComment}
                    </Button>
                  </div>
                </form>
              ))}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 bg-surface border border-outline-variant rounded-3xl">
            <dl className="space-y-3 text-sm">
              {facts.map(([term, value]) => (
                <div key={term}>
                  <dt className="text-[11px] text-ink-muted">{term}</dt>
                  <dd className="text-ink font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="p-6 bg-surface border border-outline-variant rounded-3xl space-y-3">
            <h3 className="text-sm font-bold text-ink">{s.history}</h3>
            <ol className="space-y-2">
              {events.map((event, i) => (
                <li key={`${event.createdAt}-${i}`} className="text-xs">
                  <div className="text-ink font-medium">
                    {text.event(event.kind)}
                  </div>
                  <div className="text-ink-muted">
                    {text.date(event.createdAt)}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
