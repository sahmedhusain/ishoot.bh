"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, MessageCircle, RotateCcw, Send, Filter, ArrowRight, ArrowLeft } from "lucide-react";
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
  return <Icon className="size-3.5 text-ink-muted shrink-0" aria-hidden />;
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
    <form onSubmit={send} className="flex flex-wrap items-end gap-3 text-xs">
      <div>
        <label htmlFor="notify-test-channel" className="block text-[10px] uppercase font-bold tracking-wider text-ink-muted mb-1">
          {n.channel}
        </label>
        <select
          id="notify-test-channel"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="it-field-sunken"
        >
          <option value="email">{n.channels.email}</option>
          <option value="whatsapp">{n.channels.whatsapp}</option>
        </select>
      </div>

      <div className="grow min-w-48">
        <label htmlFor="notify-test-to" className="block text-[10px] uppercase font-bold tracking-wider text-ink-muted mb-1">
          {n.testTo}
        </label>
        <input
          id="notify-test-to"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          dir="ltr"
          required
          placeholder={channel === "email" ? "it@example.com" : "+1 555 0100"}
          className="it-field-sunken w-full"
        />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="it-btn-primary"
      >
        <Send className="size-3.5" aria-hidden />
        <span>{n.sendTest}</span>
      </button>
    </form>
  );
}

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
  const router = useRouter();
  const { busy, retry } = useRetry();

  const [selectedStatus, setSelectedStatus] = React.useState(filter.status || "");
  const [selectedChannel, setSelectedChannel] = React.useState(filter.channel || "");

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(href(filter, { status: selectedStatus, channel: selectedChannel }));
  };

  const handleReset = () => {
    setSelectedStatus("");
    setSelectedChannel("");
    router.push("/notifications");
  };

  const total = (status: string) =>
    summary
      .filter((s) => s.status === status)
      .reduce((sum, s) => sum + s.messages, 0);

  const statusMeta: Record<"sent" | "queued" | "failed", { accent: string; badge: string }> = {
    sent: {
      accent: "border-s-4 border-s-emerald-600 dark:border-s-emerald-400",
      badge: "it-badge it-badge-active",
    },
    queued: {
      accent: "border-s-4 border-s-[#0070d2] dark:border-s-sky-400",
      badge: "it-badge it-badge-warn",
    },
    failed: {
      accent: "border-s-4 border-s-rose-600 dark:border-s-rose-400",
      badge: "it-badge it-badge-error",
    },
  };

  return (
    <div className="space-y-4">
      <PageTitle title={n.title} description={n.description} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs" aria-label={formatMessage(n.lastDay, { hours: 24 })}>
        {(["sent", "queued", "failed"] as const).map((status) => (
          <div
            key={status}
            className={`it-card p-3.5 ${statusMeta[status].accent}`}
          >
            <div className="text-[10px] text-ink-muted uppercase font-bold tracking-wider">{n.statuses[status]}</div>
            <div className="text-xl font-bold text-ink mt-1">{total(status)}</div>
            <div className="text-[11px] text-ink-muted mt-0.5">{formatMessage(n.lastDay, { hours: 24 })}</div>
          </div>
        ))}
      </div>

      {canExecute && (
        <div className="it-card space-y-3">
          <div className="flex items-center gap-2 border-b border-outline-variant pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink">{n.testTitle}</h2>
          </div>
          <TestForm />
        </div>
      )}

      <div className="it-card space-y-3">
        <div className="flex items-center justify-between border-b border-outline-variant pb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink">
            <Filter className="size-3.5 text-[#0070d2] dark:text-sky-400" />
            <span>{n.filtersTitle}</span>
          </div>
        </div>

        <form onSubmit={handleApplyFilter} className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
          <div>
            <label htmlFor="notify-filter-status" className="block text-[10px] uppercase font-bold tracking-wider text-ink-muted mb-1">
              {n.status}
            </label>
            <select
              id="notify-filter-status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="it-field-sunken w-full"
            >
              <option value="">{n.allStatuses}</option>
              <option value="sent">{n.statuses.sent}</option>
              <option value="queued">{n.statuses.queued}</option>
              <option value="failed">{n.statuses.failed}</option>
            </select>
          </div>

          <div>
            <label htmlFor="notify-filter-channel" className="block text-[10px] uppercase font-bold tracking-wider text-ink-muted mb-1">
              {n.channel}
            </label>
            <select
              id="notify-filter-channel"
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="it-field-sunken w-full"
            >
              <option value="">{n.allChannels}</option>
              <option value="email">{n.channels.email}</option>
              <option value="whatsapp">{n.channels.whatsapp}</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="it-btn-primary flex-1"
            >
              {n.filterApply}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="it-btn-secondary"
            >
              {copy.sessions.clear}
            </button>
          </div>
        </form>
      </div>

      {!page ? (
        <div className="it-card p-8 text-center text-xs text-ink-muted">
          {n.unavailable}
        </div>
      ) : page.items.length === 0 ? (
        <div className="it-card p-8 text-center text-xs text-ink-muted">
          {n.empty}
        </div>
      ) : (
        <div className="it-card p-0 overflow-x-auto">
          <table className="it-table w-full text-xs">
            <thead>
              <tr>
                <th className="w-24">CHANNEL</th>
                <th className="w-56">RECIPIENT</th>
                <th>SUBJECT / CONTENT</th>
                <th className="w-36">CALLER / ORIGIN</th>
                <th className="w-40">TIMESTAMP</th>
                <th className="w-24 text-center">STATUS</th>
                <th className="w-28 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {page.items.map((m) => (
                <tr key={m.id}>
                  <td>
                    <span className="flex items-center gap-1.5 font-semibold text-[11px]">
                      <ChannelIcon channel={m.channel} />
                      <span className="uppercase">{m.channel}</span>
                    </span>
                  </td>
                  <td className="font-mono font-semibold truncate max-w-xs" dir="ltr">
                    <bdi>{m.recipient}</bdi>
                  </td>
                  <td>
                    <Link
                      href={`/notifications/${m.id}`}
                      className="font-medium text-ink hover:text-[#0070d2] dark:hover:text-sky-300 hover:underline block truncate max-w-sm"
                    >
                      {m.subject ?? n.channels[m.channel]}
                    </Link>
                    {m.status === "failed" && m.lastError && (
                      <span className="text-[11px] text-rose-700 dark:text-rose-400 block truncate mt-0.5">
                        {m.lastError}
                      </span>
                    )}
                  </td>
                  <td className="text-ink-muted text-[11px] truncate">
                    {formatMessage(n.from, { caller: m.caller })}
                  </td>
                  <td className="text-[11px] text-ink-muted whitespace-nowrap">
                    {date(m.createdAt)}
                  </td>
                  <td className="text-center">
                    <span className={statusMeta[m.status]?.badge ?? "it-badge it-badge-neutral"}>
                      {n.statuses[m.status]}
                    </span>
                  </td>
                  <td className="text-center whitespace-nowrap">
                    {canExecute && m.status === "failed" ? (
                      <button
                        type="button"
                        onClick={() => retry(m.id)}
                        disabled={busy === m.id}
                        className="it-btn-secondary py-1 px-2.5 text-[11px] text-amber-700 dark:text-amber-300 font-semibold"
                        title={n.retry}
                      >
                        <RotateCcw className="size-3" />
                        <span>{n.retry}</span>
                      </button>
                    ) : (
                      <Link
                        href={`/notifications/${m.id}`}
                        className="it-btn-secondary py-1 px-2.5 text-[11px]"
                      >
                        <ArrowRight className="size-3 rtl:rotate-180" />
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <nav className="flex gap-2 pt-2 text-xs" aria-label={n.pages}>
        {filter.cursor && (
          <Link
            href={href(filter, {})}
            className="it-btn-secondary"
          >
            {n.newest}
          </Link>
        )}
        {page?.nextCursor && (
          <Link
            href={href(filter, { cursor: page.nextCursor })}
            className="it-btn-secondary"
          >
            {n.older}
          </Link>
        )}
      </nav>
    </div>
  );
}

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
    <div className="space-y-4">
      <PageTitle
        title={m.subject ?? n.channels[m.channel]}
        actions={
          <div className="flex items-center gap-2">
            {canExecute && m.status === "failed" && (
              <button
                type="button"
                onClick={() => retry(m.id)}
                disabled={busy === m.id}
                className="it-btn-primary"
              >
                <RotateCcw className="size-3.5" />
                <span>{n.retry}</span>
              </button>
            )}
            <Link href="/notifications" className="it-btn-secondary">
              <ArrowLeft className="size-3.5 rtl:rotate-180" />
              <span>{n.back}</span>
            </Link>
          </div>
        }
      />

      <div className="it-card p-5 space-y-4 text-xs">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
          {rows.map(([label, value]) => (
            <React.Fragment key={label}>
              <dt className="text-ink-muted uppercase font-bold text-[11px]">{label}:</dt>
              <dd className="text-ink font-semibold">{value}</dd>
            </React.Fragment>
          ))}
        </dl>

        {m.lastError && (
          <div className="p-3 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs">
            <span className="font-bold">LAST TRANSMISSION ERROR:</span> {m.lastError}
          </div>
        )}

        {m.attachments && m.attachments.length > 0 && (
          <div className="border-t border-outline-variant pt-3">
            <h2 className="text-xs font-bold uppercase mb-1.5 text-ink">
              {n.attachments}
            </h2>
            <ul className="list-disc ps-5 space-y-0.5 text-ink-muted">
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
            <div key={i} className="border-t border-outline-variant pt-3">
              <h2 className="text-xs font-bold uppercase mb-1.5 text-ink">
                {i === 0 ? n.text : n.html}
              </h2>
              <pre
                dir="auto"
                className="it-field-sunken max-h-96 overflow-auto whitespace-pre-wrap p-3 text-xs font-mono"
              >
                {body}
              </pre>
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}
