"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, MessageCircle, RotateCcw, Send } from "lucide-react";
import { Card } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import type { NotifyMessage } from "@platform/api-client";
import { retryMessageAction, sendTestMessageAction } from "../app/actions";
import { useCopy } from "./CopyProvider";
import { PageTitle } from "./ticket-ui";

export type NotificationFilter = {
  status: string;
  channel: string;
  cursor: string;
};

const field =
  "rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent";
const chip = (on: boolean) =>
  `px-3 py-1.5 rounded-full text-xs font-semibold border ${on ? "border-accent text-accent bg-accent/10" : "border-outline-variant text-ink-muted hover:text-ink"}`;
const tone: Record<string, string> = {
  sent: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  queued: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  failed: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

const href = (
  filter: NotificationFilter,
  change: Partial<NotificationFilter>,
) => {
  const next = { ...filter, cursor: "", ...change };
  const params = new URLSearchParams();
  if (next.status) params.set("status", next.status);
  if (next.channel) params.set("channel", next.channel);
  if (next.cursor) params.set("cursor", next.cursor);
  const search = params.toString();
  return search ? `/notifications?${search}` : "/notifications";
};

function ChannelIcon({ channel }: { channel: string }) {
  const Icon = channel === "whatsapp" ? MessageCircle : Mail;
  return <Icon className="size-4 text-ink-muted" aria-hidden />;
}

function useRetry() {
  const { copy } = useCopy();
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const retry = async (id: string) => {
    setBusy(id);
    try {
      const { ok } = await retryMessageAction(id);
      if (ok) toast.success(copy.notifications.retried);
      else toast.error(copy.notifications.failedAction);
      router.refresh();
    } catch {
      toast.error(copy.notifications.failedAction);
    } finally {
      setBusy(null);
    }
  };
  return { busy, retry };
}

function TestForm() {
  const { copy } = useCopy();
  const n = copy.notifications;
  const router = useRouter();
  const [channel, setChannel] = React.useState("email");
  const [to, setTo] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { ok } = await sendTestMessageAction(channel, to);
      if (ok) toast.success(n.testQueued);
      else toast.error(n.testInvalid);
      router.refresh();
    } catch {
      toast.error(n.failedAction);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={send} className="flex flex-wrap items-end gap-3">
      <label className="space-y-1 text-xs font-medium text-ink">
        <span className="block">{n.channel}</span>
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className={field}
        >
          <option value="email">{n.channels.email}</option>
          <option value="whatsapp">{n.channels.whatsapp}</option>
        </select>
      </label>
      <label className="space-y-1 text-xs font-medium text-ink grow min-w-48">
        <span className="block">{n.testTo}</span>
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          dir="ltr"
          required
          placeholder={
            channel === "email" ? "it@example.com" : "+1 555 0100"
          }
          className={`${field} w-full`}
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-on-primary text-sm font-semibold disabled:opacity-60"
      >
        <Send className="size-4" aria-hidden />
        {n.sendTest}
      </button>
    </form>
  );
}

/** The platform's outgoing messages: what was sent, what failed and why, with retry and a test message. */
export function NotificationsView({
  filter,
  page,
  summary,
  canExecute,
}: {
  filter: NotificationFilter;
  page: { items: NotifyMessage[]; nextCursor?: string } | null;
  summary: { status: string; channel: string; messages: number }[];
  canExecute: boolean;
}) {
  const { copy, date } = useCopy();
  const n = copy.notifications;
  const { busy, retry } = useRetry();
  const total = (status: string) =>
    summary
      .filter((s) => s.status === status)
      .reduce((sum, s) => sum + s.messages, 0);

  return (
    <>
      <PageTitle title={n.title} description={n.description} />
      <div className="grid grid-cols-3 gap-3 mb-6" aria-label={n.lastDay}>
        {(["sent", "queued", "failed"] as const).map((status) => (
          <Card
            key={status}
            className="p-4 rounded-3xl border border-outline-variant bg-surface"
          >
            <div className="text-xs text-ink-muted">{n.statuses[status]}</div>
            <div className="text-2xl font-bold text-ink">{total(status)}</div>
            <div className="text-[11px] text-ink-muted">{n.lastDay}</div>
          </Card>
        ))}
      </div>
      {canExecute && (
        <Card className="p-4 mb-6 rounded-3xl border border-outline-variant bg-surface space-y-2">
          <h2 className="text-sm font-semibold text-ink">{n.testTitle}</h2>
          <TestForm />
        </Card>
      )}
      <div className="flex flex-wrap gap-2 mb-4">
        <Link
          href={href(filter, { status: "" })}
          className={chip(!filter.status)}
        >
          {n.all}
        </Link>
        {(["failed", "queued", "sent"] as const).map((status) => (
          <Link
            key={status}
            href={href(filter, { status })}
            className={chip(filter.status === status)}
          >
            {n.statuses[status]}
          </Link>
        ))}
        <span className="mx-1 border-s border-outline-variant" />
        {(["email", "whatsapp"] as const).map((channel) => (
          <Link
            key={channel}
            href={href(filter, {
              channel: filter.channel === channel ? "" : channel,
            })}
            className={chip(filter.channel === channel)}
          >
            {n.channels[channel]}
          </Link>
        ))}
      </div>
      {!page ? (
        <Card
          role="alert"
          className="p-12 text-center text-sm text-ink-muted rounded-3xl bg-surface border border-outline-variant"
        >
          {n.unavailable}
        </Card>
      ) : page.items.length === 0 ? (
        <Card className="p-12 text-center text-sm text-ink-muted rounded-3xl bg-surface border border-outline-variant">
          {n.empty}
        </Card>
      ) : (
        <ul className="space-y-2" aria-label={n.title}>
          {page.items.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-outline-variant bg-surface px-4 py-3"
            >
              <ChannelIcon channel={m.channel} />
              <Link href={`/notifications/${m.id}`} className="min-w-0 grow">
                <span className="block truncate font-semibold text-ink">
                  {m.subject ?? n.channels[m.channel]}
                </span>
                <span className="block text-xs text-ink-muted">
                  <bdi dir="ltr">{m.recipient}</bdi>
                  {" · "}
                  {formatMessage(n.from, { caller: m.caller })}
                  {" · "}
                  <time dateTime={m.createdAt}>{date(m.createdAt)}</time>
                </span>
                {m.status === "failed" && m.lastError && (
                  <span className="block text-xs text-rose-700 dark:text-rose-300 truncate">
                    {m.lastError}
                  </span>
                )}
              </Link>
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${tone[m.status]}`}
              >
                {n.statuses[m.status]}
              </span>
              {canExecute && m.status === "failed" && (
                <button
                  type="button"
                  onClick={() => retry(m.id)}
                  disabled={busy === m.id}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-outline-variant text-xs text-ink hover:bg-surface-container disabled:opacity-60"
                >
                  <RotateCcw className="size-3.5" aria-hidden />
                  {n.retry}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <nav className="flex gap-3 mt-6" aria-label={n.pages}>
        {filter.cursor && (
          <Link
            href={href(filter, {})}
            className="text-sm text-accent underline"
          >
            {n.newest}
          </Link>
        )}
        {page?.nextCursor && (
          <Link
            href={href(filter, { cursor: page.nextCursor })}
            className="text-sm text-accent underline"
          >
            {n.older}
          </Link>
        )}
      </nav>
    </>
  );
}

/** One message. HTML is shown as source, never rendered. */
export function NotificationDetail({
  message: m,
  canExecute,
}: {
  message: NotifyMessage;
  canExecute: boolean;
}) {
  const { copy, date } = useCopy();
  const n = copy.notifications;
  const { busy, retry } = useRetry();
  const rows: [string, React.ReactNode][] = [
    [n.channel, n.channels[m.channel]],
    [
      n.recipient,
      <bdi key="r" dir="ltr">
        {m.recipient}
      </bdi>,
    ],
    [n.status, n.statuses[m.status]],
    [n.caller, m.actor ? `${m.caller} · ${m.actor}` : m.caller],
    [n.created, date(m.createdAt)],
    [n.sentAt, m.sentAt ? date(m.sentAt) : "—"],
    [n.attempts, String(m.attempts)],
    [
      n.provider,
      m.provider
        ? `${m.provider}${m.providerId ? ` · ${m.providerId}` : ""}`
        : "—",
    ],
  ];
  return (
    <>
      <PageTitle
        title={m.subject ?? n.channels[m.channel]}
        actions={
          canExecute && m.status === "failed" ? (
            <button
              type="button"
              onClick={() => retry(m.id)}
              disabled={busy === m.id}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-on-primary text-sm font-semibold"
            >
              <RotateCcw className="size-4" aria-hidden />
              {n.retry}
            </button>
          ) : null
        }
      />
      <Link href="/notifications" className="text-sm text-accent underline">
        {n.back}
      </Link>
      <Card className="mt-4 p-5 rounded-3xl border border-outline-variant bg-surface space-y-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          {rows.map(([label, value]) => (
            <React.Fragment key={label}>
              <dt className="text-ink-muted">{label}</dt>
              <dd className="text-ink">{value}</dd>
            </React.Fragment>
          ))}
        </dl>
        {m.lastError && (
          <p
            role="status"
            className="text-sm rounded-xl px-4 py-3 bg-rose-500/10 text-rose-700 dark:text-rose-300"
          >
            {m.lastError}
          </p>
        )}
        {m.attachments && m.attachments.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-ink mb-1">
              {n.attachments}
            </h2>
            <ul className="text-xs text-ink-muted list-disc ps-5">
              {m.attachments.map((a) => (
                <li key={a.filename}>
                  <bdi dir="ltr">{a.filename}</bdi> · {a.contentType} ·{" "}
                  {formatMessage(n.bytes, { size: a.size })}
                </li>
              ))}
            </ul>
          </div>
        )}
        {[m.text, m.html].map((body, i) =>
          body ? (
            <div key={i}>
              <h2 className="text-sm font-semibold text-ink mb-1">
                {i === 0 ? n.text : n.html}
              </h2>
              <pre
                dir="auto"
                className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-container p-3 font-mono text-xs text-ink"
              >
                {body}
              </pre>
            </div>
          ) : null,
        )}
      </Card>
    </>
  );
}
