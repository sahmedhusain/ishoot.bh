"use client";

import Link from "next/link";
import { Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { formatMessage } from "@platform/locales";
import type { AuditEvent } from "@platform/api-client";
import { useCopy } from "./CopyProvider";
import { PageTitle } from "./ticket-ui";

export type AuditFilter = {
  subject: string;
  actor: string;
  from: string;
  to: string;
  cursor: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

function extractTicketId(event: AuditEvent): string | null {
  if (!event.subject.startsWith("itsm.")) return null;
  const payload = event.payload as Record<string, unknown> | undefined;
  if (!payload) return null;
  for (const key of ["ticketId", "ticket_id", "id"]) {
    const val = payload[key];
    if (typeof val === "string" && UUID_RE.test(val)) return val;
  }
  return null;
}

const href = (filter: AuditFilter, cursor: string) => {
  const params = new URLSearchParams();
  for (const key of ["subject", "actor", "from", "to"] as const)
    if (filter[key]) params.set(key, filter[key]);
  if (cursor) params.set("cursor", cursor);
  const search = params.toString();
  return search ? `/audit?${search}` : "/audit";
};

export function AuditView({
  filter,
  page,
  subjects,
}: {
  filter: AuditFilter;
  page: { items: AuditEvent[]; nextCursor?: string } | null;
  subjects: { subject: string; events: number }[];
}) {
  const { copy, date } = useCopy();
  const a = copy.audit;
  const label = (subject: string) =>
    (a.subjects as Record<string, string>)[subject] ?? subject;

  const exportJson = () => {
    if (!page?.items?.length) return;
    const blob = new Blob([JSON.stringify(page.items, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit_trail_${new Date().toISOString().slice(0, 19)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(a.exportedJson);
  };

  const exportCsv = () => {
    if (!page?.items?.length) return;
    const headers = ["EventId", "OccurredAt", "Subject", "Actor", "TraceId", "Payload"];
    const rows = page.items.map((ev) => [
      csvCell(ev.id),
      csvCell(ev.occurredAt),
      csvCell(ev.subject),
      csvCell(ev.actor ?? ""),
      csvCell(ev.traceId ?? ""),
      csvCell(JSON.stringify(ev.payload ?? {})),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit_trail_${new Date().toISOString().slice(0, 19)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(a.exportedCsv);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle title={a.title} description={a.description} />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportJson}
            disabled={!page?.items?.length}
            className="it-btn-3d py-1.5 px-3 text-xs font-mono font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{a.exportJson}</span>
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!page?.items?.length}
            className="it-btn-3d py-1.5 px-3 text-xs font-mono font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{a.exportCsv}</span>
          </button>
        </div>
      </div>

      <div className="it-card p-4">
        <form
          method="get"
          action="/audit"
          className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5 items-end font-mono text-xs"
        >
          <label className="space-y-1 lg:col-span-2">
            <span className="block text-[10px] uppercase font-bold text-ink-muted">{a.subject}</span>
            <select
              name="subject"
              defaultValue={filter.subject}
              className="it-field-sunken w-full"
            >
              <option value="">{a.allSubjects}</option>
              {subjects.map((s) => (
                <option key={s.subject} value={s.subject}>
                  {formatMessage(a.subjectOption, {
                    name: label(s.subject),
                    count: s.events,
                  })}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-[10px] uppercase font-bold text-ink-muted">{a.actor}</span>
            <input
              name="actor"
              defaultValue={filter.actor}
              dir="ltr"
              placeholder={a.actorPlaceholder}
              className="it-field-sunken w-full"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-[10px] uppercase font-bold text-ink-muted">{a.from}</span>
            <input
              type="date"
              name="from"
              defaultValue={filter.from}
              className="it-field-sunken w-full"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-[10px] uppercase font-bold text-ink-muted">{a.to}</span>
            <input
              type="date"
              name="to"
              defaultValue={filter.to}
              className="it-field-sunken w-full"
            />
          </label>
          <div className="flex gap-2 lg:col-span-5 pt-1">
            <button
              type="submit"
              className="it-btn-3d py-1.5 px-4 font-bold text-emerald-800 dark:text-emerald-300"
            >
              {a.apply}
            </button>
            <Link href="/audit" className="it-btn-3d py-1.5 px-3">
              {a.reset}
            </Link>
          </div>
          <p className="text-[10px] text-ink-muted lg:col-span-5">{a.utc}</p>
        </form>
      </div>

      {!page ? (
        <div className="it-card p-8 text-center text-xs font-mono text-ink-muted">
          {a.unavailable}
        </div>
      ) : page.items.length === 0 ? (
        <div className="it-card p-8 text-center text-xs font-mono text-ink-muted">
          {a.empty}
        </div>
      ) : (
        <ol className="space-y-1.5 font-mono text-xs" aria-label={a.title}>
          {page.items.map((event) => {
            const ticketId = extractTicketId(event);
            return (
              <li key={event.id} className="it-card p-0">
                <details suppressHydrationWarning className="group">
                  <summary className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 cursor-pointer list-none hover:bg-slate-200/50 dark:hover:bg-slate-800/50">
                    <span className="font-bold text-ink">{label(event.subject)}</span>
                    <span
                      className="text-[10px] text-ink-muted px-1 border border-slate-400 dark:border-slate-600"
                      dir="ltr"
                    >
                      {event.subject}
                    </span>
                    <span className="text-[11px] text-ink-muted ms-auto">
                      <bdi dir="ltr" className="font-semibold">
                        {event.actor ?? a.unknownActor}
                      </bdi>
                      {" · "}
                      <time dateTime={event.occurredAt}>{date(event.occurredAt)}</time>
                    </span>
                  </summary>
                  <div className="border-t border-slate-300 dark:border-slate-700 px-3 py-2 space-y-2 text-xs bg-slate-100/40 dark:bg-slate-900/40">
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-ink-muted">
                      <dt className="uppercase font-bold text-[10px]">{a.eventId}:</dt>
                      <dd className="font-mono text-[11px]" dir="ltr">
                        {event.id}
                      </dd>
                      <dt className="uppercase font-bold text-[10px]">{a.traceId}:</dt>
                      <dd className="font-mono text-[11px] flex flex-wrap items-center gap-2" dir="ltr">
                        <span>{event.traceId ?? "—"}</span>
                        {event.traceId && (
                          <Link
                            href={`/logs?search=${encodeURIComponent(event.traceId)}`}
                            className="inline-flex items-center gap-1 text-sky-600 hover:underline text-[10px]"
                          >
                            <span>{a.inspectInLogs}</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </dd>
                    </dl>
                    <div className="flex flex-wrap items-center gap-2">
                      {event.actor && (
                        <>
                          <Link
                            href={`/audit?actor=${encodeURIComponent(event.actor)}`}
                            className="it-btn-3d px-2 py-0.5 text-[10px]"
                          >
                            {a.filterActor}
                          </Link>
                          <Link
                            href={`/logs?search=${encodeURIComponent(event.actor)}`}
                            className="it-btn-3d px-2 py-0.5 text-[10px]"
                          >
                            {a.inspectInLogs}
                          </Link>
                        </>
                      )}
                      {ticketId && (
                        <Link
                          href={`/tickets/${ticketId}`}
                          className="it-btn-3d px-2 py-0.5 text-[10px] text-sky-700 dark:text-sky-300"
                        >
                          {a.openTicket}
                        </Link>
                      )}
                    </div>
                    <pre
                      dir="ltr"
                      className="it-field-sunken overflow-x-auto p-2 font-mono text-[11px] whitespace-pre-wrap max-h-48"
                    >
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
      )}

      <nav className="flex gap-2 pt-2 font-mono text-xs" aria-label={a.pages}>
        {filter.cursor && (
          <Link href={href(filter, "")} className="it-btn-3d py-1 px-3">
            {a.newest}
          </Link>
        )}
        {page?.nextCursor && (
          <Link href={href(filter, page.nextCursor)} className="it-btn-3d py-1 px-3">
            {a.older}
          </Link>
        )}
      </nav>
    </div>
  );
}
