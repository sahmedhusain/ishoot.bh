"use client";

import Link from "next/link";
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

const href = (filter: AuditFilter, cursor: string) => {
  const params = new URLSearchParams();
  for (const key of ["subject", "actor", "from", "to"] as const)
    if (filter[key]) params.set(key, filter[key]);
  if (cursor) params.set("cursor", cursor);
  const search = params.toString();
  return search ? `/audit?${search}` : "/audit";
};

/** The audit trail: every change the platform's services announced, newest first. */
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-700 pb-2">
        <PageTitle title={a.title} description={a.description} />
        <span className="it-status-pane font-bold text-amber-700 dark:text-amber-400">
          T-CODE: SM20 [SECURITY AUDIT]
        </span>
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
            <Link
              href="/audit"
              className="it-btn-3d py-1.5 px-3"
            >
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
          {page.items.map((event) => (
            <li key={event.id} className="it-card p-0">
              <details
                suppressHydrationWarning
                className="group"
              >
                <summary className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 cursor-pointer list-none hover:bg-slate-200/50 dark:hover:bg-slate-800/50">
                  <span className="font-bold text-ink">
                    {label(event.subject)}
                  </span>
                  <span
                    className="text-[10px] text-ink-muted px-1 border border-slate-400 dark:border-slate-600"
                    dir="ltr"
                  >
                    {event.subject}
                  </span>
                  <span className="text-[11px] text-ink-muted ms-auto">
                    <bdi dir="ltr" className="font-semibold">{event.actor ?? a.unknownActor}</bdi>
                    {" · "}
                    <time dateTime={event.occurredAt}>
                      {date(event.occurredAt)}
                    </time>
                  </span>
                </summary>
                <div className="border-t border-slate-300 dark:border-slate-700 px-3 py-2 space-y-2 text-xs bg-slate-100/40 dark:bg-slate-900/40">
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-ink-muted">
                    <dt className="uppercase font-bold text-[10px]">{a.eventId}:</dt>
                    <dd className="font-mono text-[11px]" dir="ltr">
                      {event.id}
                    </dd>
                    <dt className="uppercase font-bold text-[10px]">{a.traceId}:</dt>
                    <dd className="font-mono text-[11px]" dir="ltr">
                      {event.traceId ?? "—"}
                    </dd>
                  </dl>
                  <pre
                    dir="ltr"
                    className="it-field-sunken overflow-x-auto p-2 font-mono text-[11px] whitespace-pre-wrap max-h-48"
                  >
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                </div>
              </details>
            </li>
          ))}
        </ol>
      )}

      <nav className="flex gap-2 pt-2 font-mono text-xs" aria-label={a.pages}>
        {filter.cursor && (
          <Link
            href={href(filter, "")}
            className="it-btn-3d py-1 px-3"
          >
            {a.newest}
          </Link>
        )}
        {page?.nextCursor && (
          <Link
            href={href(filter, page.nextCursor)}
            className="it-btn-3d py-1 px-3"
          >
            {a.older}
          </Link>
        )}
      </nav>
    </div>
  );
}
