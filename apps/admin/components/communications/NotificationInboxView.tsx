"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Archive,
  ArchiveRestore,
  BellOff,
  Check,
  CheckCheck,
  Inbox,
  Loader2,
  Mail,
  MailOpen,
  Trash2,
} from "lucide-react";
import { Button, cn, useConfirmation, useRealtime } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import type { InboxFilter, InboxItem } from "@platform/api-client";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { ROUTES } from "../../constants/routes";
import { PageHeader } from "../layout/PageHeader";
import {
  categoryName,
  fromInbox,
  notificationAge,
  notificationHref,
  notificationText,
} from "../../lib/notification-display";
import { errorMessage } from "../../lib/error-text";
import {
  bulkNotificationAction,
  muteNotificationRecordAction,
  updateNotificationAction,
} from "../../app/actions/notifications";
import { useNotificationSettings } from "../live/LiveProvider";
import { NotificationSettingsPanel } from "./NotificationSettingsPanel";

const TABS = ["all", "unread", "muted", "archived", "settings"] as const;
type Tab = (typeof TABS)[number];
type Page = { items: InboxItem[]; unread: number; nextCursor?: string };

export function NotificationInboxView({ tab: initialTab }: { tab: string }) {
  const { t, locale } = useAdminLocale();
  const l = t.liveNotifications;
  const router = useRouter();
  const confirmAction = useConfirmation();
  const { categories } = useNotificationSettings();
  const [tab, setTab] = React.useState<Tab>(TABS.find((x) => x === initialTab) ?? "all");
  const [category, setCategory] = React.useState("");
  const [items, setItems] = React.useState<InboxItem[]>([]);
  const [cursor, setCursor] = React.useState<string | undefined>();
  const [unread, setUnread] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [more, setMore] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);
  const filter: InboxFilter = tab === "settings" ? "all" : tab;

  const load = React.useCallback(
    async (after?: string) => {
      if (tab === "settings") return;
      const query = new URLSearchParams({ view: "page", filter, limit: "30" });
      if (category) query.set("category", category);
      if (after) query.set("cursor", after);
      after ? setMore(true) : setLoading(true);
      try {
        const response = await fetch(`/api/notifications?${query}`, { cache: "no-store" });
        if (!response.ok) throw Error();
        const page = (await response.json()) as Page;
        setItems((current) => (after ? [...current, ...page.items] : page.items));
        setCursor(page.nextCursor);
        setUnread(page.unread);
        if (!after) setSelected(new Set());
      } catch {
        toast.error(t.notificationMenu.failed);
      } finally {
        setLoading(false);
        setMore(false);
      }
    },
    [tab, filter, category, t],
  );
  React.useEffect(() => {
    void load();
  }, [load]);
  useRealtime(() => void load(), ["notification.created", "notification.changed"]);

  const selectTab = (next: Tab) => {
    setTab(next);
    router.replace(next === "all" ? ROUTES.notifications() : `${ROUTES.notifications()}?tab=${next}`, { scroll: false });
  };

  const run = async (work: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    try {
      await work();
      if (done) toast.success(done);
      window.dispatchEvent(new Event("platform:notifications-changed"));
      await load();
    } catch (error) {
      toast.error(errorMessage(error, t, t.notificationMenu.failed));
    } finally {
      setBusy(false);
    }
  };
  const ids = Array.from(selected);
  const bulk = (action: "read" | "unread" | "archive" | "unarchive" | "delete") =>
    run(() => bulkNotificationAction({ action, ids }), formatMessage(l.bulkDone, { count: ids.length }));
  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <PageHeader
        actions={
          tab !== "settings" && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={busy || unread === 0}
                onClick={() =>
                  confirmAction({
                    description: formatMessage(t.notificationMenu.markAllReadConfirm, { count: unread }),
                    variant: "warning",
                    onConfirm: () => run(() => bulkNotificationAction({ action: "read", all: true, filter: "unread", category: category || undefined })),
                  })
                }
                className="gap-1.5"
              >
                <CheckCheck className="size-4" aria-hidden />
                {t.notificationsCenter.markAllRead}
              </Button>
              {(tab === "all" || tab === "archived") && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy || !items.length}
                  onClick={() =>
                    confirmAction({
                      description: tab === "archived" ? l.clearArchivedConfirm : l.clearReadConfirm,
                      variant: "danger",
                      onConfirm: () =>
                        run(() =>
                          bulkNotificationAction({ action: "delete", all: true, filter: tab === "archived" ? "archived" : "read", category: category || undefined }),
                        ),
                    })
                  }
                  className="gap-1.5"
                >
                  <Trash2 className="size-4" aria-hidden />
                  {tab === "archived" ? l.clearArchived : l.clearRead}
                </Button>
              )}
            </div>
          )
        }
      />

      <div role="tablist" aria-label={t.notificationsCenter.title} className="flex flex-wrap gap-2 border-b border-outline-variant pb-3">
        {TABS.map((key) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => selectTab(key)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              tab === key ? "bg-secondary-container text-on-secondary-container" : "text-ink-muted hover:bg-ink/5",
            )}
          >
            {l.tabs[key]}
            {key === "unread" && unread > 0 && <span className="ms-2 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{unread}</span>}
          </button>
        ))}
      </div>

      {tab === "settings" ? (
        <NotificationSettingsPanel />
      ) : (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-2" aria-label={l.category}>
            {["", ...categories].map((key) => (
              <button
                key={key || "all"}
                type="button"
                aria-pressed={category === key}
                onClick={() => setCategory(key)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs",
                  category === key ? "border-accent bg-accent/10 text-ink" : "border-outline-variant text-ink-muted hover:bg-ink/5",
                )}
              >
                {key ? categoryName(key, locale) : l.allCategories}
              </button>
            ))}
          </div>

          {selected.size > 0 && (
            <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-outline-variant bg-surface-raised p-2 shadow-sm">
              <span className="px-2 text-sm font-medium text-ink">{formatMessage(l.selected, { count: selected.size })}</span>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => bulk("read")} className="gap-1.5">
                <MailOpen className="size-4" aria-hidden />
                {l.markRead}
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => bulk("unread")} className="gap-1.5">
                <Mail className="size-4" aria-hidden />
                {l.markUnread}
              </Button>
              {tab === "archived" ? (
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => bulk("unarchive")} className="gap-1.5">
                  <ArchiveRestore className="size-4" aria-hidden />
                  {l.unarchive}
                </Button>
              ) : (
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => bulk("archive")} className="gap-1.5">
                  <Archive className="size-4" aria-hidden />
                  {l.archive}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  confirmAction({
                    description: formatMessage(l.deleteManyConfirm, { count: selected.size }),
                    variant: "danger",
                    onConfirm: () => bulk("delete"),
                  })
                }
                className="gap-1.5 text-rose-600"
              >
                <Trash2 className="size-4" aria-hidden />
                {l.delete}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                {l.clearSelection}
              </Button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16" aria-label={t.notificationMenu.loading}>
              <Loader2 className="h-6 w-6 animate-spin text-ink-muted" aria-hidden />
            </div>
          ) : !items.length ? (
            <div className="rounded-3xl border border-outline-variant px-6 py-14 text-center">
              <Inbox aria-hidden className="mx-auto mb-3 h-8 w-8 text-ink-muted" />
              <p className="text-sm font-medium text-ink">{l.empty[tab]}</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-outline-variant">
              <label className="flex items-center gap-3 border-b border-outline-variant bg-surface-raised px-4 py-2 text-xs text-ink-muted">
                <input
                  type="checkbox"
                  checked={selected.size === items.length}
                  onChange={(e) => setSelected(e.target.checked ? new Set(items.map((i) => i.id)) : new Set())}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                {l.selectAll}
              </label>
              <ul className="divide-y divide-outline-variant">
                {items.map((item) => {
                  const n = fromInbox(item);
                  const text = notificationText(n, t, locale);
                  const href = notificationHref(n);
                  return (
                    <li key={item.id} className={cn("flex gap-3 px-4 py-4", !item.read && "bg-accent/[0.04]")}>
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggle(item.id)}
                        aria-label={formatMessage(l.selectOne, { title: text.title })}
                        className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-[11px] text-ink-muted">
                          {!item.read && <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />}
                          <span>{categoryName(item.category, locale)}</span>
                          {(item.priority === "urgent" || item.priority === "high") && (
                            <span className={cn("rounded px-1.5 font-semibold", item.priority === "urgent" ? "bg-rose-500/10 text-rose-700 dark:text-rose-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300")}>
                              {l.priority[item.priority]}
                            </span>
                          )}
                          {item.silent && (
                            <span className="inline-flex items-center gap-1">
                              <BellOff className="h-3 w-3" aria-hidden />
                              {l.mutedBadge}
                            </span>
                          )}
                          <time dateTime={item.createdAt}>{notificationAge(item.createdAt, locale)}</time>
                        </p>
                        {href ? (
                          <Link
                            href={href}
                            onClick={() => !item.read && void updateNotificationAction(item.id, "read").catch(() => {})}
                            className="mt-1 block text-sm font-semibold text-ink hover:underline"
                          >
                            <bdi dir="auto">{text.title}</bdi>
                          </Link>
                        ) : (
                          <p className="mt-1 text-sm font-semibold text-ink">
                            <bdi dir="auto">{text.title}</bdi>
                          </p>
                        )}
                        {text.message && <p className="mt-1 text-sm text-ink-muted">{text.message}</p>}
                        <div className="mt-2 flex flex-wrap gap-3 text-xs">
                          <button type="button" disabled={busy} onClick={() => run(() => updateNotificationAction(item.id, item.read ? "unread" : "read"))} className="inline-flex items-center gap-1 text-ink-muted hover:text-accent">
                            <Check className="h-3.5 w-3.5" aria-hidden />
                            {item.read ? l.markUnread : l.markRead}
                          </button>
                          <button type="button" disabled={busy} onClick={() => run(() => updateNotificationAction(item.id, item.archived ? "unhide" : "hide"))} className="inline-flex items-center gap-1 text-ink-muted hover:text-accent">
                            {item.archived ? <ArchiveRestore className="h-3.5 w-3.5" aria-hidden /> : <Archive className="h-3.5 w-3.5" aria-hidden />}
                            {item.archived ? l.unarchive : l.archive}
                          </button>
                          {item.entityType && item.entityId && (
                            <button type="button" disabled={busy} onClick={() => run(() => muteNotificationRecordAction(item.entityType!, item.entityId!), l.recordMuted)} className="inline-flex items-center gap-1 text-ink-muted hover:text-accent">
                              <BellOff className="h-3.5 w-3.5" aria-hidden />
                              {l.muteRecord}
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              confirmAction({
                                description: l.deleteConfirm,
                                variant: "danger",
                                onConfirm: () => run(() => updateNotificationAction(item.id, "delete")),
                              })
                            }
                            className="inline-flex items-center gap-1 text-ink-muted hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            {l.delete}
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {cursor && !loading && (
            <div className="flex justify-center">
              <Button variant="outline" disabled={more} onClick={() => load(cursor)}>
                {more ? t.notificationMenu.loading : l.loadMore}
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
