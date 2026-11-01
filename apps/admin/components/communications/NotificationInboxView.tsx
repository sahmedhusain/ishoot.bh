"use client";
import {
  notificationText,
  notificationHref,
} from "../../lib/notification-display";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { Notification } from "@platform/database/types";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { ROUTES } from "../../constants/routes";
import { Button, cn } from "@platform/ui";
import { BellOff, Check, CheckCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "../layout/PageHeader";
import {
  updateNotificationAction,
  markAllNotificationsReadAction,
} from "../../app/actions/notifications";
export function NotificationInboxView({
  items,
  total,
  filter,
  page,
}: {
  items: Notification[];
  total: number;
  filter: string;
  page: number;
}) {
  const { t, locale, isRTL } = useAdminLocale();
  const c = t.communications;
  const labels: Record<string, string> = c;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const run = async (work: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await work();
      window.dispatchEvent(new Event("platform:notifications-changed"));
      router.refresh();
    } catch {
      toast.error(c.failed);
    } finally {
      setBusy(false);
    }
  };

  const filters = ["all", "unread", "hidden"] as const;
  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;
  const pageLink =
    "inline-flex min-h-10 items-center gap-1.5 rounded-full border border-m3-outline px-4 text-sm font-medium text-m3-primary";

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      <PageHeader
        actions={
          <Button variant="outline" size="sm" disabled={busy} onClick={() => run(() => markAllNotificationsReadAction())}>
            <CheckCheck className="size-4" aria-hidden />
            {c.allRead}
          </Button>
        }
      />
      <nav aria-label={c.notifications} className="flex flex-wrap gap-2" data-page-toolbar>
        {filters.map((f) => (
          <Link
            key={f}
            href={ROUTES.notifications({ filter: f })}
            aria-current={f === filter ? "page" : undefined}
            className={cn(
              "inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors",
              f === filter
                ? "border-transparent bg-secondary-container text-on-secondary-container"
                : "border-outline-variant text-on-surface-variant hover:bg-surface-container-high",
            )}
          >
            {f === filter && <Check className="size-4" aria-hidden />}
            {labels[f]}
          </Link>
        ))}
      </nav>
      {!items.length && (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-outline-variant bg-surface-container-low px-6 py-16 text-center" data-page-section>
          <span className="grid size-12 place-items-center rounded-2xl bg-secondary-container text-on-secondary-container" aria-hidden>
            <BellOff className="size-6" />
          </span>
          <p className="text-sm text-on-surface-variant">{c.empty}</p>
        </div>
      )}
      {items.length > 0 && (
        <ul className="space-y-3">
          {items.map((n) => {
            const text = notificationText(n, t, locale);
            const href = notificationHref(n);
            return (
              <li key={n.id}>
                <article
                  className={cn(
                    "flex gap-4 rounded-3xl border p-5",
                    n.is_read
                      ? "border-outline-variant bg-surface-container-lowest"
                      : "border-transparent bg-surface-container-low",
                  )}
                  data-page-section
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-1.5 size-2.5 shrink-0 rounded-full",
                      n.is_read ? "bg-transparent" : "bg-m3-primary",
                    )}
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <h2 className={cn("text-on-surface", n.is_read ? "font-medium" : "font-semibold")}>
                        <bdi dir="auto">{text.title}</bdi>
                      </h2>
                      <time className="text-xs text-on-surface-variant" dateTime={new Date(n.created_at).toISOString()}>
                        {new Date(n.created_at).toLocaleString(locale === "ar" ? "ar-u-nu-latn" : "en-GB")}
                      </time>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-on-surface-variant">{text.message}</p>
                    <div className="flex flex-wrap items-center gap-1 pt-1">
                      {href && (
                        <Link
                          href={href}
                          onClick={() => void run(() => updateNotificationAction(n.id, "read"))}
                          className="inline-flex min-h-9 items-center rounded-full bg-secondary-container px-4 text-sm font-medium text-on-secondary-container"
                        >
                          {c.open}
                        </Link>
                      )}
                      {(
                        [
                          n.is_read ? "unread" : "read",
                          filter === "hidden" ? "unhide" : "hide",
                          "delete",
                        ] as const
                      ).map((change) => (
                        <Button
                          key={change}
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          className={change === "delete" ? "text-m3-error" : undefined}
                          onClick={() => run(() => updateNotificationAction(n.id, change))}
                        >
                          {labels[change]}
                        </Button>
                      ))}
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
      {(page > 1 || page * 30 < total) && (
        <nav className="flex items-center justify-between gap-4">
          {page > 1 ? (
            <Link href={ROUTES.notifications({ filter, page: page - 1 })} className={pageLink}>
              <PrevIcon className="size-4" aria-hidden />
              {t.approvals.previous}
            </Link>
          ) : <span />}
          {page * 30 < total && (
            <Link href={ROUTES.notifications({ filter, page: page + 1 })} className={pageLink}>
              {t.approvals.next}
              <NextIcon className="size-4" aria-hidden />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
