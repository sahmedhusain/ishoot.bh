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
  const { t, locale } = useAdminLocale();
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

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold">{c.notifications}</h1>
      <nav className="flex flex-wrap gap-3">
        {["all", "unread", "hidden"].map((f) => (
          <Link
            className={`rounded-full border px-4 py-2 ${f === filter ? "border-accent bg-accent/10" : ""}`}
            key={f}
            href={ROUTES.notifications({ filter: f })}
          >
            {labels[f]}
          </Link>
        ))}
        <button
          disabled={busy}
          className="text-accent"
          onClick={() => run(() => markAllNotificationsReadAction())}
        >
          {c.allRead}
        </button>
      </nav>
      {!items.length && <p>{c.empty}</p>}
      {items.map((n) => {
        const text = notificationText(n, t, locale);
        const href = notificationHref(n);
        return (
          <article
            key={n.id}
            className="rounded-2xl border border-ink/10 p-5 space-y-3"
          >
            <h2 className={n.is_read ? "font-medium" : "font-bold"}>
              {text.title}
            </h2>
            <p className="whitespace-pre-wrap text-sm">{text.message}</p>
            <time className="text-xs text-ink-muted">
              {new Date(n.created_at).toLocaleString(
                locale === "ar" ? "ar-BH-u-nu-latn" : "en-GB",
              )}
            </time>
            <div className="flex flex-wrap gap-4 text-sm">
              {href && (
                <Link
                  href={href}
                  onClick={() =>
                    void run(() => updateNotificationAction(n.id, "read"))
                  }
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
                <button
                  key={change}
                  disabled={busy}
                  className={
                    change === "delete" ? "text-rose-600" : "text-accent"
                  }
                  onClick={() =>
                    run(() => updateNotificationAction(n.id, change))
                  }
                >
                  {labels[change]}
                </button>
              ))}
            </div>
          </article>
        );
      })}
      <nav className="flex gap-4">
        {page > 1 && (
          <Link href={ROUTES.notifications({ filter, page: page - 1 })}>
            {t.approvals.previous}
          </Link>
        )}
        {page * 30 < total && (
          <Link href={ROUTES.notifications({ filter, page: page + 1 })}>
            {t.approvals.next}
          </Link>
        )}
      </nav>
    </div>
  );
}
