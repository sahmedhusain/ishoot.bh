"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Bell, BellOff, BellRing, Check, CheckCheck, Settings, Trash2, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { useRealtime, useRealtimeStatus } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import type { InboxItem } from "@platform/api-client";
import { useCopy } from "../CopyProvider";
import { inboxAction, muteRecordAction, savePreferencesAction, unmuteRecordAction } from "../../app/live-actions";
import { useItLive } from "./ItLive";

const FOREVER = "9999-12-31T00:00:00Z";

export function ItBell() {
  const { copy, locale } = useCopy();
  const c = copy.live;
  const { preferences, setPreferences } = useItLive();
  const live = useRealtimeStatus();
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<InboxItem[]>([]);
  const [unread, setUnread] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const panel = React.useRef<HTMLDivElement>(null);

  const refresh = React.useCallback(async () => {
    try {
      const response = await fetch("/api/notifications?view=preview", { cache: "no-store" });
      if (!response.ok) return;
      const body = (await response.json()) as { items: InboxItem[]; unreadCount: number };
      setItems(body.items);
      setUnread(body.unreadCount);
    } catch {

    }
  }, []);
  React.useEffect(() => {
    void refresh();
  }, [refresh]);
  useRealtime(() => void refresh(), ["notification.created", "notification.changed"]);
  React.useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!panel.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const run = async (work: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await work();
      await refresh();
    } catch {
      toast.error(c.failed);
    } finally {
      setBusy(false);
    }
  };
  const savePrefs = (change: Partial<NonNullable<typeof preferences>>) =>
    preferences &&
    run(async () => {
      const next = { ...preferences, ...change };
      setPreferences(await savePreferencesAction(next));
    });
  const muted = !!preferences?.mutedUntil && new Date(preferences.mutedUntil).getTime() > Date.now();
  const age = (iso: string) =>
    new Date(iso).toLocaleString(locale === "ar" ? "ar-u-nu-latn" : "en-GB", { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="relative" ref={panel}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="relative flex h-8 w-8 items-center justify-center rounded-md border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-colors"
      >
        <span className="sr-only">{formatMessage(c.unread, { count: unread })}</span>
        {muted ? <BellOff aria-hidden className="size-4" /> : unread ? <BellRing aria-hidden className="size-4 text-sky-300" /> : <Bell aria-hidden className="size-4" />}
        {unread > 0 && (
          <span aria-hidden className="absolute -end-1.5 -top-1.5 min-w-4 rounded-full bg-[#0070d2] border border-[#1a2b49] px-1 text-center text-[10px] font-bold leading-4 text-white shadow-sm">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={c.title}
          className="absolute end-0 top-full z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] rounded-lg border border-outline-variant bg-surface text-ink shadow-xl overflow-hidden"
        >
          <div className="flex items-center justify-between gap-2 border-b border-outline-variant bg-surface-raised px-4 py-2.5">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink">
                {c.title}
                <span
                  className={`h-2 w-2 rounded-full ${live === "open" ? "bg-emerald-500" : "animate-pulse bg-amber-500"}`}
                  title={live === "open" ? c.liveOn : c.reconnecting}
                />
              </p>
              <p className="text-[11px] text-ink-muted">{muted ? c.muted : formatMessage(c.unread, { count: unread })}</p>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                disabled={busy || !preferences}
                onClick={() => savePrefs({ mutedUntil: muted ? null : FOREVER })}
                title={muted ? c.unmute : c.mute}
                aria-label={muted ? c.unmute : c.mute}
                className="rounded-md p-1.5 text-ink-muted hover:bg-surface-muted hover:text-ink transition-colors disabled:opacity-40"
              >
                {muted ? <BellRing aria-hidden className="size-3.5" /> : <BellOff aria-hidden className="size-3.5" />}
              </button>
              <button
                type="button"
                disabled={busy || !preferences}
                onClick={() => savePrefs({ soundEnabled: !preferences?.soundEnabled })}
                title={preferences?.soundEnabled ? c.soundOff : c.soundOn}
                aria-label={preferences?.soundEnabled ? c.soundOff : c.soundOn}
                className="rounded-md p-1.5 text-ink-muted hover:bg-surface-muted hover:text-ink transition-colors disabled:opacity-40"
              >
                {preferences?.soundEnabled ? <VolumeX aria-hidden className="size-3.5" /> : <Volume2 aria-hidden className="size-3.5" />}
              </button>
              <button
                type="button"
                disabled={busy || !unread}
                onClick={() => run(() => inboxAction({ action: "read", all: true, filter: "unread" }))}
                title={c.markAllRead}
                aria-label={c.markAllRead}
                className="rounded-md p-1.5 text-ink-muted hover:bg-surface-muted hover:text-ink transition-colors disabled:opacity-30"
              >
                <CheckCheck aria-hidden className="size-3.5" />
              </button>
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                title={copy.nav.settings}
                aria-label={copy.nav.settings}
                className="rounded-md p-1.5 text-ink-muted hover:bg-surface-muted hover:text-ink transition-colors"
              >
                <Settings aria-hidden className="size-3.5" />
              </Link>
            </div>
          </div>
          {!items.length ? (
            <p className="px-4 py-8 text-center text-xs text-ink-muted">{c.empty}</p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-outline-variant overflow-y-auto">
              {items.map((item) => (
                <li
                  key={item.id}
                  className={`px-4 py-3 transition-colors ${
                    item.read
                      ? "hover:bg-surface-raised/60"
                      : "border-s-2 border-s-[#0070d2] dark:border-s-sky-400 bg-[#0070d2]/[0.04] dark:bg-sky-500/[0.08]"
                  }`}
                >
                  {item.actionUrl?.startsWith("/") ? (
                    <Link
                      href={item.actionUrl}
                      onClick={() => !item.read && void inboxAction({ action: "read", ids: [item.id] })}
                      className="block text-xs font-semibold text-ink hover:text-[#0070d2] dark:hover:text-sky-300 hover:underline"
                    >
                      {item.title}
                    </Link>
                  ) : (
                    <p className="text-xs font-semibold text-ink">{item.title}</p>
                  )}
                  {item.body && <p className="mt-0.5 text-xs text-ink-muted leading-relaxed">{item.body}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-ink-muted">
                    <time dateTime={item.createdAt}>{age(item.createdAt)}</time>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(() => inboxAction({ action: item.read ? "unread" : "read", ids: [item.id] }))}
                      className="inline-flex items-center gap-1 hover:text-[#0070d2] dark:hover:text-sky-300 transition-colors"
                    >
                      <Check aria-hidden className="size-3" />
                      {item.read ? c.markUnread : c.markRead}
                    </button>
                    {item.entityType && item.entityId && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          const { entityType, entityId } = item as { entityType: string; entityId: string };
                          void run(async () => {
                            await muteRecordAction(entityType, entityId);
                            toast.success(c.recordMuted, {
                              action: { label: c.undo, onClick: () => void run(() => unmuteRecordAction(entityType, entityId)) },
                            });
                          });
                        }}
                        className="inline-flex items-center gap-1 hover:text-[#0070d2] dark:hover:text-sky-300 transition-colors"
                      >
                        <BellOff aria-hidden className="size-3" />
                        {c.muteRecord}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(() => inboxAction({ action: "delete", ids: [item.id] }))}
                      className="inline-flex items-center gap-1 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                    >
                      <Trash2 aria-hidden className="size-3" />
                      {c.delete}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-outline-variant bg-surface-raised px-4 py-2 flex items-center justify-end">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0070d2] dark:text-sky-400 hover:underline"
            >
              <span>{copy.nav.notifications}</span>
              <ArrowRight aria-hidden className="size-3 rtl:rotate-180" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
