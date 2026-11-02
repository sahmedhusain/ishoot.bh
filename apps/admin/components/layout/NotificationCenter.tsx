"use client";
// The header's notification menu: the latest notifications, kept current live (docs/adr/0012), with quick controls to
// mute everything for a while or turn the sound off.
import { useConfirmation, useRealtime, useRealtimeStatus } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  Archive,
  ArrowRight,
  Bell,
  BellOff,
  BellRing,
  Check,
  CheckCheck,
  Inbox,
  RefreshCw,
  Settings2,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import type { InboxItem } from "@platform/api-client";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { useHeaderPopover } from "../../hooks/useHeaderPopover";
import { ROUTES } from "../../constants/routes";
import {
  categoryName,
  fromInbox,
  notificationAge,
  notificationHref,
  notificationText,
} from "../../lib/notification-display";
import { errorMessage } from "../../lib/error-text";
import {
  markAllNotificationsReadAction,
  muteNotificationRecordAction,
  saveNotificationPreferencesAction,
  updateNotificationAction,
} from "../../app/actions/notifications";
import { useNotificationSettings } from "../live/LiveProvider";

/** When "mute for…" ends. "forever" is stored as the year 9999 (until turned back on). */
export function muteUntil(choice: "1h" | "8h" | "tomorrow" | "forever"): string {
  const now = new Date();
  if (choice === "1h") return new Date(now.getTime() + 3_600_000).toISOString();
  if (choice === "8h") return new Date(now.getTime() + 8 * 3_600_000).toISOString();
  if (choice === "tomorrow") {
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(8, 0, 0, 0);
    return next.toISOString();
  }
  return "9999-12-31T00:00:00Z";
}

const isForever = (until: string) => new Date(until).getUTCFullYear() >= 9999;

/** Shows the unread count in the tab's title, e.g. "(3) Invoices", across page changes. */
function useTitleCount(count: number) {
  React.useEffect(() => {
    const apply = () => {
      const base = document.title.replace(/^\(\d+\+?\)\s/, "");
      const next = count > 0 ? `(${count > 99 ? "99+" : count}) ${base}` : base;
      if (document.title !== next) document.title = next;
    };
    apply();
    const title = document.querySelector("head > title");
    if (!title) return;
    const observer = new MutationObserver(apply);
    observer.observe(title, { childList: true, characterData: true, subtree: true });
    return () => {
      observer.disconnect();
      document.title = document.title.replace(/^\(\d+\+?\)\s/, "");
    };
  }, [count]);
}

export function NotificationCenter() {
  const { t, locale } = useAdminLocale();
  const p = t.notificationMenu;
  const l = t.liveNotifications;
  const confirmAction = useConfirmation();
  const menu = useHeaderPopover("notifications");
  const live = useRealtimeStatus();
  const { preferences, setPreferences } = useNotificationSettings();
  const [items, setItems] = React.useState<InboxItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [filter, setFilter] = React.useState<"all" | "unread">("all");
  const [loading, setLoading] = React.useState(true);
  const [failed, setFailed] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [muteOpen, setMuteOpen] = React.useState(false);
  const request = React.useRef<AbortController | null>(null);
  const initialized = React.useRef(false);
  useTitleCount(unreadCount);

  const refresh = React.useCallback(
    async (showLoading = false) => {
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      if (showLoading || !initialized.current) setLoading(true);
      try {
        const response = await fetch(`/api/notifications?view=preview&filter=${filter}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw Error();
        const data = (await response.json()) as { items: InboxItem[]; unreadCount: number };
        setItems(data.items);
        setUnreadCount(data.unreadCount);
        setFailed(false);
        initialized.current = true;
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [filter],
  );

  React.useEffect(() => {
    void refresh(true);
    const update = () => void refresh();
    window.addEventListener("platform:notifications-changed", update);
    return () => {
      request.current?.abort();
      window.removeEventListener("platform:notifications-changed", update);
    };
  }, [refresh]);

  // Live: a new or changed notification, or a resync after reconnecting.
  useRealtime(
    (event) => {
      if (event.type === "notification.changed" && typeof event.data?.unread === "number")
        setUnreadCount(event.data.unread);
      void refresh();
    },
    ["notification.created", "notification.changed"],
  );
  // Without a live connection, check every minute while the page is visible.
  React.useEffect(() => {
    if (live === "open") return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 60_000);
    return () => clearInterval(timer);
  }, [live, refresh]);
  React.useEffect(() => {
    if (menu.open) void refresh();
  }, [menu.open, refresh]);

  const run = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await action();
      window.dispatchEvent(new Event("platform:notifications-changed"));
    } catch (err) {
      toast.error(errorMessage(err, t, p.failed));
    } finally {
      setBusy(null);
    }
  };

  const savePreferences = async (change: Partial<NonNullable<typeof preferences>>, done: string) => {
    if (!preferences) return;
    const next = { ...preferences, ...change };
    await run("prefs", async () => {
      const saved = await saveNotificationPreferencesAction({
        mutedUntil: next.mutedUntil,
        soundEnabled: next.soundEnabled,
        sound: next.sound,
        volume: next.volume,
        popupsEnabled: next.popupsEnabled,
        desktopEnabled: next.desktopEnabled,
        categories: next.categories.map(({ category, muted, sound }) => ({ category, muted, sound })),
      });
      setPreferences(saved);
      toast.success(done);
    });
    setMuteOpen(false);
  };

  const mutedUntil =
    preferences?.mutedUntil && new Date(preferences.mutedUntil).getTime() > Date.now() ? preferences.mutedUntil : null;
  const mutedLabel = mutedUntil
    ? isForever(mutedUntil)
      ? l.mutedForever
      : formatMessage(l.mutedUntil, {
          time: new Date(mutedUntil).toLocaleString(locale === "ar" ? "ar-u-nu-latn" : "en-GB", {
            weekday: "short",
            hour: "2-digit",
            minute: "2-digit",
          }),
        })
    : null;
  const BellIcon = mutedUntil ? BellOff : unreadCount > 0 ? BellRing : Bell;

  return (
    <div ref={menu.containerRef} className="relative">
      <button
        ref={menu.triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={menu.open}
        aria-controls="notification-preview"
        onClick={() => menu.setOpen(!menu.open)}
        title={mutedLabel ?? undefined}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink-muted hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className="sr-only">
          {t.actions.notifications}
          {unreadCount > 0 ? ` (${formatMessage(p.unreadCount, { count: String(unreadCount) })})` : ""}
        </span>
        <BellIcon aria-hidden className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span
            aria-hidden
            className="absolute -end-1 -top-1 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] leading-4 text-primary-foreground ring-2 ring-white dark:ring-surface-raised"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      <span aria-live="polite" className="sr-only">
        {unreadCount > 0 ? formatMessage(p.unreadCount, { count: String(unreadCount) }) : ""}
      </span>
      {menu.open && (
        <div
          id="notification-preview"
          role="dialog"
          aria-label={t.notificationsCenter.title}
          ref={menu.panelRef}
          className="admin-popover absolute end-0 top-full z-50 mt-3 flex max-h-[min(40rem,calc(100dvh-6rem))] w-[420px] flex-col max-sm:fixed max-sm:inset-x-3 max-sm:mt-0 max-sm:w-auto"
        >
          <header role="presentation" data-popup-header className="admin-popover-header flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                {t.notificationsCenter.title}
                <span
                  title={live === "open" ? l.live : live === "offline" ? l.offline : l.reconnecting}
                  className={`h-2 w-2 rounded-full ${live === "open" ? "bg-emerald-500" : live === "offline" ? "bg-ink/30" : "animate-pulse bg-amber-500"}`}
                />
                <span className="sr-only">{live === "open" ? l.live : live === "offline" ? l.offline : l.reconnecting}</span>
              </h2>
              <p className="mt-1 truncate text-xs text-ink-muted">
                {mutedLabel ?? formatMessage(p.unreadCount, { count: String(unreadCount) })}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <div className="relative">
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={muteOpen}
                  onClick={() => setMuteOpen(!muteOpen)}
                  disabled={!preferences}
                  title={l.muteMenu}
                  aria-label={l.muteMenu}
                  className="rounded-lg p-2 text-ink-muted hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-30"
                >
                  {mutedUntil ? <BellOff aria-hidden className="h-4 w-4" /> : <Bell aria-hidden className="h-4 w-4" />}
                </button>
                {muteOpen && preferences && (
                  <div role="menu" className="absolute end-0 top-full z-10 mt-1 w-64 rounded-xl border border-outline-variant bg-surface-raised p-1 shadow-lg">
                    {mutedUntil ? (
                      <button role="menuitem" type="button" disabled={busy !== null} onClick={() => savePreferences({ mutedUntil: null }, l.unmuted)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm text-ink hover:bg-ink/5">
                        <BellRing aria-hidden className="h-4 w-4 text-ink-muted" />
                        {l.unmute}
                      </button>
                    ) : (
                      (["1h", "8h", "tomorrow", "forever"] as const).map((choice) => (
                        <button
                          key={choice}
                          role="menuitem"
                          type="button"
                          disabled={busy !== null}
                          onClick={() => savePreferences({ mutedUntil: muteUntil(choice) }, l.muted)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm text-ink hover:bg-ink/5"
                        >
                          <BellOff aria-hidden className="h-4 w-4 text-ink-muted" />
                          {l.muteFor[choice]}
                        </button>
                      ))
                    )}
                    <div className="my-1 border-t border-outline-variant" />
                    <button
                      role="menuitem"
                      type="button"
                      disabled={busy !== null}
                      onClick={() =>
                        savePreferences({ soundEnabled: !preferences.soundEnabled }, preferences.soundEnabled ? l.soundTurnedOff : l.soundTurnedOn)
                      }
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm text-ink hover:bg-ink/5"
                    >
                      {preferences.soundEnabled ? <VolumeX aria-hidden className="h-4 w-4 text-ink-muted" /> : <Volume2 aria-hidden className="h-4 w-4 text-ink-muted" />}
                      {preferences.soundEnabled ? l.soundOff : l.soundOn}
                    </button>
                  </div>
                )}
              </div>
              <Link
                href={ROUTES.notifications() + "?tab=settings"}
                onClick={() => menu.setOpen(false)}
                title={l.settingsLink}
                aria-label={l.settingsLink}
                className="rounded-lg p-2 text-ink-muted hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Settings2 aria-hidden className="h-4 w-4" />
              </Link>
              <button
                type="button"
                disabled={busy !== null || unreadCount === 0}
                onClick={() => {
                  menu.setOpen(false);
                  menu.triggerRef.current?.focus();
                  confirmAction({
                    description: formatMessage(p.markAllReadConfirm, { count: unreadCount }),
                    variant: "warning",
                    onConfirm: () => run("all", () => markAllNotificationsReadAction()),
                  });
                }}
                title={t.notificationsCenter.markAllRead}
                aria-label={t.notificationsCenter.markAllRead}
                className="rounded-lg p-2 text-ink-muted hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-30"
              >
                <CheckCheck aria-hidden className="h-4 w-4" />
              </button>
            </div>
          </header>
          <div className="flex gap-1 border-b border-outline-variant px-4 pb-3" aria-label={p.filter}>
            {(["all", "unread"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${filter === value ? "bg-accent/10 text-primary dark:text-mint" : "text-ink-muted hover:bg-ink/5"}`}
              >
                {t.communications[value]}
              </button>
            ))}
          </div>
          <div className="min-h-28 overflow-y-auto overscroll-contain" aria-busy={loading}>
            {failed && (
              <div role="alert" className="flex items-center gap-2 border-b border-outline-variant px-4 py-3 text-xs text-ink-muted">
                <AlertCircle aria-hidden className="h-4 w-4" />
                <span className="flex-1">{p.failed}</span>
                <button type="button" onClick={() => refresh(true)} className="rounded-md p-1 hover:bg-ink/5" aria-label={p.retry}>
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            )}
            {loading ? (
              <div className="space-y-4 p-4" aria-label={p.loading}>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex animate-pulse gap-3 motion-reduce:animate-none">
                    <div className="h-8 w-8 rounded-lg bg-ink/5" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-3/4 rounded bg-ink/5" />
                      <div className="h-3 rounded bg-ink/5" />
                      <div className="h-2 w-1/3 rounded bg-ink/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !items.length ? (
              <div className="px-6 py-9 text-center">
                <Inbox aria-hidden className="mx-auto mb-3 h-7 w-7 text-ink-muted" />
                <p className="text-sm font-medium text-ink">{filter === "unread" ? p.noUnread : t.notificationsCenter.noNotifications}</p>
                <p className="mt-1 text-xs text-ink-muted">{filter === "unread" ? p.caughtUp : t.notificationsCenter.allUpToDate}</p>
              </div>
            ) : (
              <ul className="divide-y divide-outline-variant">
                {items.map((item) => {
                  const n = fromInbox(item);
                  const text = notificationText(n, t, locale);
                  const href = notificationHref(n);
                  const content = (
                    <>
                      <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-muted">
                        <span>{categoryName(item.category, locale)}</span>
                        {(item.priority === "urgent" || item.priority === "high") && (
                          <span className={`rounded px-1.5 py-px font-semibold ${item.priority === "urgent" ? "bg-rose-500/10 text-rose-700 dark:text-rose-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
                            {l.priority[item.priority]}
                          </span>
                        )}
                        {item.silent && (
                          <span className="inline-flex items-center gap-1">
                            <BellOff aria-hidden className="h-3 w-3" />
                            {l.mutedBadge}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug text-ink">
                        <bdi dir="auto">{text.title}</bdi>
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-muted">{text.message}</p>
                      <time dateTime={item.createdAt} className="mt-2 block text-[11px] text-ink-muted">
                        {notificationAge(item.createdAt, locale)}
                      </time>
                    </>
                  );
                  return (
                    <li key={item.id} className={`flex gap-3 px-4 py-3.5 ${item.read ? "" : "bg-accent/[0.04]"}`}>
                      <span aria-hidden className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${item.read ? "bg-transparent" : "bg-accent"}`} />
                      <div className="min-w-0 flex-1">
                        {href ? (
                          <Link
                            href={href}
                            onClick={() => {
                              if (!item.read) void run(item.id, () => updateNotificationAction(item.id, "read"));
                              menu.setOpen(false);
                            }}
                            className="block rounded-md hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                          >
                            {content}
                          </Link>
                        ) : (
                          content
                        )}
                        <div className="mt-2 flex flex-wrap gap-3">
                          <button type="button" disabled={busy !== null} onClick={() => run(item.id, () => updateNotificationAction(item.id, item.read ? "unread" : "read"))} className="flex items-center gap-1 text-[11px] text-ink-muted hover:text-accent disabled:opacity-40">
                            <Check aria-hidden className="h-3 w-3" />
                            {item.read ? l.markUnread : l.markRead}
                          </button>
                          <button type="button" disabled={busy !== null} onClick={() => run(item.id, () => updateNotificationAction(item.id, "hide"))} className="flex items-center gap-1 text-[11px] text-ink-muted hover:text-accent disabled:opacity-40">
                            <Archive aria-hidden className="h-3 w-3" />
                            {l.archive}
                          </button>
                          {item.entityType && item.entityId && (
                            <button
                              type="button"
                              disabled={busy !== null}
                              onClick={() =>
                                run(item.id, async () => {
                                  await muteNotificationRecordAction(item.entityType!, item.entityId!);
                                  toast.success(l.recordMuted);
                                })
                              }
                              className="flex items-center gap-1 text-[11px] text-ink-muted hover:text-accent disabled:opacity-40"
                            >
                              <BellOff aria-hidden className="h-3 w-3" />
                              {l.muteRecord}
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busy !== null}
                            onClick={() =>
                              confirmAction({
                                description: l.deleteConfirm,
                                variant: "danger",
                                onConfirm: () => run(item.id, () => updateNotificationAction(item.id, "delete")),
                              })
                            }
                            className="flex items-center gap-1 text-[11px] text-ink-muted hover:text-rose-600 disabled:opacity-40"
                          >
                            <Trash2 aria-hidden className="h-3 w-3" />
                            {l.delete}
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <footer className="border-t border-outline-variant p-3">
            <Link
              href={ROUTES.notifications()}
              onClick={() => menu.setOpen(false)}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm font-medium text-primary hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:text-mint"
            >
              {p.viewAll}
              <ArrowRight aria-hidden className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </footer>
        </div>
      )}
    </div>
  );
}
