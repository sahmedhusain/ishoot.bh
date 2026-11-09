"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, MessageCircle, RotateCcw, Send, Filter, ArrowRight } from "lucide-react";
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
  return <Icon className="size-3.5 text-slate-500 shrink-0" aria-hidden />;
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
    <form onSubmit={send} className="flex flex-wrap items-end gap-2 font-mono text-xs">
      <div>
        <label className="block text-[10px] uppercase font-bold text-ink-muted mb-1">
          {n.channel}
        </label>
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="it-field-sunken"
        >
          <option value="email">{n.channels.email}</option>
          <option value="whatsapp">{n.channels.whatsapp}</option>
        </select>
      </div>

      <div className="grow min-w-48">
        <label className="block text-[10px] uppercase font-bold text-ink-muted mb-1">
          {n.testTo}
        </label>
        <input
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
        className="it-btn-3d py-1.5 px-3 font-bold text-sky-800 dark:text-sky-300 disabled:opacity-50"
      >
        <Send className="size-3.5 inline mr-1" aria-hidden />
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 dark:border-slate-700 pb-2">
        <PageTitle title={n.title} description={n.description} />
        <span className="it-status-pane font-bold text-amber-700 dark:text-amber-400">
          T-CODE: SOST [NOTIFICATIONS]
        </span>
      </div>

      {/* Metrics Strips */}
      <div className="grid grid-cols-3 gap-2 font-mono text-xs" aria-label={formatMessage(n.lastDay, { hours: 24 })}>
        {(["sent", "queued", "failed"] as const).map((status) => (
          <div
            key={status}
            className="it-card p-3 border-l-4 border-l-sky-600 dark:border-l-sky-400"
          >
            <div className="text-[10px] text-ink-muted uppercase font-bold">{n.statuses[status]}</div>
            <div className="text-xl font-bold text-ink mt-0.5">{total(status)}</div>
            <div className="text-[10px] text-ink-muted">{formatMessage(n.lastDay, { hours: 24 })}</div>
          </div>
        ))}
      </div>

      {canExecute && (
        <div className="it-card space-y-2">
          <div className="flex items-center gap-2 border-b border-slate-300 dark:border-slate-700 pb-1">
            <h2 className="text-xs font-bold uppercase font-mono text-ink">{n.testTitle}</h2>
          </div>
          <TestForm />
        </div>
      )}

      {/* Structured Dropdown Filter Bar */}
      <div className="it-card space-y-2">
        <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-700 pb-1.5">
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase text-ink">
            <Filter className="size-3.5 text-amber-600" />
            <span>{n.filtersTitle}</span>
          </div>
        </div>

        <form onSubmit={handleApplyFilter} className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 text-xs font-mono">
          {/* Status Dropdown */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-ink-muted mb-1">
              {n.status}
            </label>
            <select
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

          {/* Channel Dropdown */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-ink-muted mb-1">
              {n.channel}
            </label>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="it-field-sunken w-full"
            >
              <option value="">{n.allChannels}</option>
              <option value="email">{n.channels.email}</option>
              <option value="whatsapp">{n.channels.whatsapp}</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-end gap-1.5">
            <button
              type="submit"
              className="it-btn-3d flex-1 py-1.5 font-bold text-emerald-800 dark:text-emerald-300"
            >
              {n.filterApply}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="it-btn-3d py-1.5 px-3"
            >
              {copy.sessions.clear}
            </button>
          </div>
        </form>
      </div>

      {/* Tabular Notification Log */}
      {!page ? (
        <div className="it-card p-8 text-center text-xs font-mono text-ink-muted">
          {n.unavailable}
        </div>
      ) : page.items.length === 0 ? (
        <div className="it-card p-8 text-center text-xs font-mono text-ink-muted">
          {n.empty}
        </div>
      ) : (
        <div className="it-card p-0 overflow-x-auto">
          <table className="it-table w-full font-mono text-xs">
            <thead>
              <tr>
                <th className="w-20">CHANNEL</th>
                <th className="w-56">RECIPIENT</th>
                <th>SUBJECT / CONTENT</th>
                <th className="w-36">CALLER / ORIGIN</th>
                <th className="w-40">TIMESTAMP</th>
                <th className="w-24 text-center">STATUS</th>
                <th className="w-24 text-center">ACTIONS</th>
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
                  <td className="font-semibold truncate max-w-xs" dir="ltr">
                    <bdi>{m.recipient}</bdi>
                  </td>
                  <td>
                    <Link
                      href={`/notifications/${m.id}`}
                      className="font-sans font-medium text-ink hover:underline block truncate max-w-sm"
                    >
                      {m.subject ?? n.channels[m.channel]}
                    </Link>
                    {m.status === "failed" && m.lastError && (
                      <span className="text-[10px] text-rose-700 dark:text-rose-400 block truncate">
                        {m.lastError}
                      </span>
                    )}
                  </td>
                  <td className="text-ink-muted text-[11px] truncate">
                    {formatMessage(n.from, { caller: m.caller })}
                  </td>
                  <td className="text-[10px] text-ink-muted whitespace-nowrap">
                    {date(m.createdAt)}
                  </td>
                  <td className="text-center">
                    <span
                      className={`inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase border ${
                        m.status === "sent"
                          ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                          : m.status === "queued"
                          ? "bg-sky-500/10 text-sky-700 border-sky-500/30"
                          : "bg-rose-500/10 text-rose-700 border-rose-500/30"
                      }`}
                    >
                      {n.statuses[m.status]}
                    </span>
                  </td>
                  <td className="text-center whitespace-nowrap">
                    {canExecute && m.status === "failed" ? (
                      <button
                        type="button"
                        onClick={() => retry(m.id)}
                        disabled={busy === m.id}
                        className="it-btn-3d py-0.5 px-2 text-[10px] text-amber-700 dark:text-amber-400"
                        title={n.retry}
                      >
                        <RotateCcw className="size-3 inline mr-1" />
                        {n.retry}
                      </button>
                    ) : (
                      <Link
                        href={`/notifications/${m.id}`}
                        className="it-btn-3d py-0.5 px-2 text-[10px]"
                      >
                        <ArrowRight className="size-3 inline rtl:rotate-180" />
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Navigation Pagination */}
      <nav className="flex gap-2 pt-2 font-mono text-xs" aria-label={n.pages}>
        {filter.cursor && (
          <Link
            href={href(filter, {})}
            className="it-btn-3d py-1 px-3"
          >
            {n.newest}
          </Link>
        )}
        {page?.nextCursor && (
          <Link
            href={href(filter, { cursor: page.nextCursor })}
            className="it-btn-3d py-1 px-3"
          >
            {n.older}
          </Link>
        )}
      </nav>
    </div>
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
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-700 pb-2">
        <PageTitle
          title={m.subject ?? n.channels[m.channel]}
          actions={
            canExecute && m.status === "failed" ? (
              <button
                type="button"
                onClick={() => retry(m.id)}
                disabled={busy === m.id}
                className="it-btn-3d py-1 px-3 text-rose-700 dark:text-rose-400 font-bold"
              >
                <RotateCcw className="size-3.5 inline mr-1" />
                {n.retry}
              </button>
            ) : null
          }
        />
        <Link href="/notifications" className="it-btn-3d py-1 px-3 text-xs font-mono">
          ← {n.back}
        </Link>
      </div>

      <div className="it-card p-4 space-y-4 font-mono text-xs">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
          {rows.map(([label, value]) => (
            <React.Fragment key={label}>
              <dt className="text-ink-muted uppercase font-bold">{label}:</dt>
              <dd className="text-ink font-semibold">{value}</dd>
            </React.Fragment>
          ))}
        </dl>

        {m.lastError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs">
            <span className="font-bold">LAST TRANSMISSION ERROR:</span> {m.lastError}
          </div>
        )}

        {m.attachments && m.attachments.length > 0 && (
          <div className="border-t border-slate-300 dark:border-slate-700 pt-3">
            <h2 className="text-xs font-bold uppercase mb-1">
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
            <div key={i} className="border-t border-slate-300 dark:border-slate-700 pt-3">
              <h2 className="text-xs font-bold uppercase mb-1">
                {i === 0 ? n.text : n.html}
              </h2>
              <pre
                dir="auto"
                className="it-field-sunken max-h-96 overflow-auto whitespace-pre-wrap p-3 text-xs"
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
