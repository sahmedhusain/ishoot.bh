"use client";

import { ROUTES } from "../../constants/routes";
import * as React from "react";
import Link from "next/link";
import {
Bell,
CheckCircle2,
AlertTriangle,
Info,
Calendar,
CreditCard,
Inbox,
Check,
ExternalLink,
} from "lucide-react";
import type { Notification } from "@ishoot/database/types";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import {
markNotificationReadAction,
markAllNotificationsReadAction,
} from "../../app/actions/notifications";
import { formatDate } from "@ishoot/ui";

const NOTIFICATION_POLL_MS = 30_000;

export function NotificationCenter() {
  const { t, locale } = useAdminLocale();
  const [isOpen, setIsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const fetchNotifications = React.useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      setNotifications(await res.json());
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  }, []);

  React.useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchNotifications();
    }, NOTIFICATION_POLL_MS);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    await markNotificationReadAction(id);
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await markAllNotificationsReadAction();
  };

  const getNotificationIcon = (type: string, entityType?: string) => {
    if (entityType === "payment")
      return <CreditCard className="w-4 h-4 text-emerald-400" />;
    if (entityType === "calendar")
      return <Calendar className="w-4 h-4 text-amber-400" />;
    if (entityType === "lead")
      return <Inbox className="w-4 h-4 text-accent" />;
    if (type === "success")
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    if (type === "action" || type === "warning")
      return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    return <Info className="w-4 h-4 text-accent" />;
  };

  /** Localized title/message for notifications that carry a message key (e.g. approval events). */
  const localize = (n: Notification) => {
    const entry = n.message_key
      ?.split(".")
      .reduce<unknown>((node, part) => (node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined), t);
    if (!entry || typeof entry !== "object") return { title: n.title, message: n.message };
    const { title, message } = entry as { title?: string; message?: string };
    const targetType = n.message_params?.targetType;
    const typeLabel = targetType ? (t.approvals.types[targetType as keyof typeof t.approvals.types] ?? targetType) : "";
    return {
      title: title ?? n.title,
      message: (message ?? n.message).replace("{type}", typeLabel),
    };
  };

  const getEntityLink = (entityType?: string, entityId?: string) => {
    if (!entityType) return null;
    if (entityType === "payment") return ROUTES.payments.list;
    if (entityType === "calendar") return ROUTES.calendar;
    if (entityType === "lead" || entityType === "inquiry") return entityId ? ROUTES.requests.detail(entityId) : ROUTES.requests.list;
    if (entityType === "invoice")
      return ROUTES.invoices.detail(entityId || "");
    if (entityType === "deal") return ROUTES.crm.deal(entityId || "");
    return null;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-accent/40 transition-colors relative"
        aria-label={t.actions.notifications}
        aria-expanded={isOpen}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="min-w-4 h-4 px-1 rounded-full bg-accent text-white text-[9px]  font-bold flex items-center justify-center absolute -top-1 -right-1 ring-2 ring-white dark:ring-[#070C0A] animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute top-full end-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-white dark:bg-surface border border-slate-200 dark:border-white/10 shadow-2xl z-50 overflow-hidden flex flex-col"
          style={{ maxHeight: "80vh" }}
        >
          <div className="p-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-accent" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {t.notificationsCenter.title}
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px]  font-bold bg-accent/15 text-accent">
                  {unreadCount} {t.notificationsCenter.new}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-medium text-accent hover:underline flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                <span>{t.notificationsCenter.markAllRead}</span>
              </button>
            )}
          </div>

          <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 max-h-[380px]">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 dark:text-ink-muted space-y-1">
                <Bell className="w-8 h-8 text-slate-300 dark:text-ink-muted/30 mx-auto mb-2" />
                <div className="font-semibold text-slate-800 dark:text-white">
                  {t.notificationsCenter.noNotifications}
                </div>
                <div>{t.notificationsCenter.allUpToDate}</div>
              </div>
            ) : (
              notifications.map((n) => {
                const link = n.action_url ?? getEntityLink(n.entity_type, n.entity_id);
                const text = localize(n);
                return (
                  <div
                    key={n.id}
                    onClick={() => handleMarkAsRead(n.id)}
                    className={`p-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer flex items-start gap-3 relative ${!n.is_read ? "bg-accent/[0.06]" : ""
                      }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                      {getNotificationIcon(n.type, n.entity_type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs font-bold truncate ${!n.is_read ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-ink-muted"}`}
                        >
                          {text.title}
                        </span>
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-ink-muted mt-0.5 line-clamp-2 leading-relaxed">
                        {text.message}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-1 text-[10px]  text-slate-400 dark:text-ink-muted/70">
                        <span>{formatDate(n.created_at, locale, "time")}</span>
                        {link && (
                          <Link
                            href={link}
                            onClick={(e) => {
                              handleMarkAsRead(n.id, e);
                              setIsOpen(false);
                            }}
                            className="text-accent hover:underline flex items-center gap-1 font-sans font-medium"
                          >
                            <span>{t.notificationsCenter.view}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-2.5 border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] text-center">
            <Link
              href={ROUTES.settings.audit}
              onClick={() => setIsOpen(false)}
              className="text-[11px] text-slate-500 dark:text-ink-muted hover:text-accent transition-colors font-medium inline-block"
            >
              {t.notificationsCenter.viewAudit}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
