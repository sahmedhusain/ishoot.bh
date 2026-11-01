"use client";

import Link from "next/link";
import { Card } from "@platform/ui";
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

const field =
  "w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent";

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
    <>
      <PageTitle title={a.title} description={a.description} />
      <Card className="p-4 mb-6 rounded-3xl border border-outline-variant bg-surface">
        <form
          method="get"
          action="/audit"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end"
        >
          <label className="space-y-1 text-xs font-medium text-ink lg:col-span-2">
            <span>{a.subject}</span>
            <select
              name="subject"
              defaultValue={filter.subject}
              className={field}
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
          <label className="space-y-1 text-xs font-medium text-ink">
            <span>{a.actor}</span>
            <input
              name="actor"
              defaultValue={filter.actor}
              dir="ltr"
              placeholder="it:…"
              className={field}
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-ink">
            <span>{a.from}</span>
            <input
              type="date"
              name="from"
              defaultValue={filter.from}
              className={field}
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-ink">
            <span>{a.to}</span>
            <input
              type="date"
              name="to"
              defaultValue={filter.to}
              className={field}
            />
          </label>
          <div className="flex gap-2 lg:col-span-5">
            <button
              type="submit"
              className="px-4 py-2 rounded-full bg-primary text-on-primary text-sm font-semibold"
            >
              {a.apply}
            </button>
            <Link
              href="/audit"
              className="px-4 py-2 rounded-full border border-outline-variant text-sm text-ink hover:bg-surface-container"
            >
              {a.reset}
            </Link>
          </div>
          <p className="text-[11px] text-ink-muted lg:col-span-5">{a.utc}</p>
        </form>
      </Card>

      {!page ? (
        <Card
          role="alert"
          className="p-12 text-center text-sm text-ink-muted rounded-3xl bg-surface border border-outline-variant"
        >
          {a.unavailable}
        </Card>
      ) : page.items.length === 0 ? (
        <Card className="p-12 text-center text-sm text-ink-muted rounded-3xl bg-surface border border-outline-variant">
          {a.empty}
        </Card>
      ) : (
        <ol className="space-y-2" aria-label={a.title}>
          {page.items.map((event) => (
            <li key={event.id}>
              <details className="group rounded-2xl border border-outline-variant bg-surface">
                <summary className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 cursor-pointer list-none">
                  <span className="font-semibold text-ink">
                    {label(event.subject)}
                  </span>
                  <span
                    className="font-mono text-[11px] text-ink-muted"
                    dir="ltr"
                  >
                    {event.subject}
                  </span>
                  <span className="text-xs text-ink-muted ms-auto">
                    <bdi dir="ltr">{event.actor ?? a.unknownActor}</bdi>
                    {" · "}
                    <time dateTime={event.occurredAt}>
                      {date(event.occurredAt)}
                    </time>
                  </span>
                </summary>
                <div className="border-t border-outline-variant px-4 py-3 space-y-2 text-xs">
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-ink-muted">
                    <dt>{a.eventId}</dt>
                    <dd className="font-mono" dir="ltr">
                      {event.id}
                    </dd>
                    <dt>{a.traceId}</dt>
                    <dd className="font-mono" dir="ltr">
                      {event.traceId ?? "—"}
                    </dd>
                  </dl>
                  <pre
                    dir="ltr"
                    className="overflow-x-auto rounded-lg bg-surface-container p-3 font-mono text-[11px] text-ink"
                  >
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                </div>
              </details>
            </li>
          ))}
        </ol>
      )}

      <nav className="flex gap-3 mt-6" aria-label={a.pages}>
        {filter.cursor && (
          <Link
            href={href(filter, "")}
            className="text-sm text-accent underline"
          >
            {a.newest}
          </Link>
        )}
        {page?.nextCursor && (
          <Link
            href={href(filter, page.nextCursor)}
            className="text-sm text-accent underline"
          >
            {a.older}
          </Link>
        )}
      </nav>
    </>
  );
}
