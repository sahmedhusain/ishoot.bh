"use client";
import { formatMessage } from "@ishoot/locales";
import * as React from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  CheckCheck,
  EyeOff,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";
import type { Notification } from "@ishoot/database/types";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { useHeaderPopover } from "../../hooks/useHeaderPopover";
import { ROUTES } from "../../constants/routes";
import {
  notificationText,
  notificationHref,
  notificationAge,
} from "../../lib/notification-display";
import { errorMessage } from "../../lib/error-text";
import {
  updateNotificationAction,
  markAllNotificationsReadAction,
} from "../../app/actions/notifications";
export function NotificationCenter() {
  const { t, locale } = useAdminLocale();
  const p = t.notificationMenu;
  const menu = useHeaderPopover("notifications");
  const [items, setItems] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [filter, setFilter] = React.useState<"all" | "unread">("all");
  const [loading, setLoading] = React.useState(true);
  const [failed, setFailed] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const request = React.useRef<AbortController | null>(null);
  const initialized = React.useRef(false);
  const refresh = React.useCallback(
    async (showLoading = false) => {
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      if (showLoading || !initialized.current) setLoading(true);
      try {
        const response = await fetch(
          `/api/notifications?preview=1&filter=${filter}`,
          { cache: "no-store", signal: controller.signal },
        );
        if (!response.ok) throw Error();
        const data = await response.json();
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
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 30000);
    const resume = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const update = () => {
      void refresh();
    };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("ishoot:notifications-changed", update);
    return () => {
      clearInterval(timer);
      request.current?.abort();
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("ishoot:notifications-changed", update);
    };
  }, [refresh]);
  React.useEffect(() => {
    if (menu.open) void refresh();
  }, [menu.open, refresh]);
  const change = async (id: string, action: "read" | "unread" | "hide") => {
    setBusy(id);
    try {
      await updateNotificationAction(id, action);
      window.dispatchEvent(new Event("ishoot:notifications-changed"));
    } catch (err) {
      toast.error(errorMessage(err, t, p.failed));
    } finally {
      setBusy(null);
    }
  };
  const allRead = async () => {
    setBusy("all");
    try {
      const result = await markAllNotificationsReadAction();
      if (!result.success) throw Error();
      window.dispatchEvent(new Event("ishoot:notifications-changed"));
    } catch {
      toast.error(p.failed);
    } finally {
      setBusy(null);
    }
  };
  return (
    <div ref={menu.containerRef} className="relative">
      <button
        ref={menu.triggerRef}
        type="button"
        aria-label={t.actions.notifications}
        aria-haspopup="dialog"
        aria-expanded={menu.open}
        aria-controls="notification-preview"
        onClick={() => menu.setOpen(!menu.open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Bell aria-hidden className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -end-1 -top-1 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] leading-4 text-white ring-2 ring-white dark:ring-surface-raised">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {menu.open && (
        <div
          id="notification-preview"
          role="dialog"
          aria-label={t.notificationsCenter.title}
          ref={menu.panelRef}
          className="absolute end-0 top-full z-50 mt-3 flex max-h-[min(36rem,calc(100dvh-5rem))] w-96 flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-xl dark:bg-surface-raised max-sm:fixed max-sm:inset-x-3 max-sm:top-16 max-sm:mt-0 max-sm:w-auto"
        >
          <header className="flex items-center justify-between gap-3 px-4 pb-3 pt-4">
            <div>
              <h2 className="text-sm font-semibold text-ink">
                {t.notificationsCenter.title}
              </h2>
              <p className="mt-1 text-xs text-ink-muted">
                {formatMessage(p.unreadCount, { count: String(unreadCount) })}
              </p>
            </div>
            <button
              type="button"
              disabled={busy !== null || unreadCount === 0}
              onClick={allRead}
              title={t.notificationsCenter.markAllRead}
              aria-label={t.notificationsCenter.markAllRead}
              className="rounded-lg p-2 text-ink-muted hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-30"
            >
              <CheckCheck aria-hidden className="h-4 w-4" />
            </button>
          </header>
          <div
            className="flex gap-1 border-b border-ink/10 px-4 pb-3"
            aria-label={p.filter}
          >
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
          <div
            className="min-h-28 overflow-y-auto overscroll-contain"
            aria-busy={loading}
          >
            {failed && (
              <div
                role="alert"
                className="flex items-center gap-2 border-b border-ink/10 px-4 py-3 text-xs text-ink-muted"
              >
                <AlertCircle aria-hidden className="h-4 w-4" />
                <span className="flex-1">{p.failed}</span>
                <button
                  type="button"
                  onClick={() => refresh(true)}
                  className="rounded-md p-1 hover:bg-ink/5"
                  aria-label={p.retry}
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            )}
            {loading ? (
              <div className="space-y-4 p-4" aria-label={p.loading}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex animate-pulse gap-3 motion-reduce:animate-none"
                  >
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
                <Inbox
                  aria-hidden
                  className="mx-auto mb-3 h-7 w-7 text-ink-muted/50"
                />
                <p className="text-sm font-medium text-ink">
                  {filter === "unread"
                    ? p.noUnread
                    : t.notificationsCenter.noNotifications}
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  {filter === "unread"
                    ? p.caughtUp
                    : t.notificationsCenter.allUpToDate}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-ink/5">
                {items.map((n) => {
                  const text = notificationText(n, t, locale);
                  const href = notificationHref(n);
                  const content = (
                    <>
                      <p className="line-clamp-2 text-sm font-medium leading-snug text-ink">
                        {text.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-muted">
                        {text.message}
                      </p>
                      <time
                        dateTime={n.created_at}
                        className="mt-2 block text-[11px] text-ink-muted"
                      >
                        {notificationAge(n.created_at, locale)}
                      </time>
                    </>
                  );
                  return (
                    <li
                      key={n.id}
                      className={`flex gap-3 px-4 py-3.5 ${n.is_read ? "" : "bg-accent/[0.04]"}`}
                    >
                      <span
                        aria-hidden
                        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.is_read ? "bg-transparent" : "bg-accent"}`}
                      />
                      <div className="min-w-0 flex-1">
                        {href ? (
                          <Link
                            href={href}
                            onClick={() => {
                              if (!n.is_read) void change(n.id, "read");
                              menu.setOpen(false);
                            }}
                            className="block rounded-md hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                          >
                            {content}
                          </Link>
                        ) : (
                          content
                        )}
                        <div className="mt-2 flex gap-3">
                          <button
                            type="button"
                            disabled={busy !== null}
                            onClick={() =>
                              change(n.id, n.is_read ? "unread" : "read")
                            }
                            className="flex items-center gap-1 text-[11px] text-ink-muted hover:text-accent disabled:opacity-40"
                          >
                            <Check aria-hidden className="h-3 w-3" />
                            {n.is_read
                              ? t.communications.unread
                              : t.communications.read}
                          </button>
                          <button
                            type="button"
                            disabled={busy !== null}
                            onClick={() => change(n.id, "hide")}
                            className="flex items-center gap-1 text-[11px] text-ink-muted hover:text-accent disabled:opacity-40"
                          >
                            <EyeOff aria-hidden className="h-3 w-3" />
                            {t.communications.hide}
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <footer className="border-t border-ink/10 p-3">
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
