"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  playNotificationSound,
  showDesktopNotification,
  useRealtime,
  useRealtimeClient,
} from "@platform/ui";
import { notificationCategory, presenceSilences } from "@platform/contracts";
import type { InboxItem } from "@platform/api-client";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { fromInbox, notificationHref, notificationText } from "../../lib/notification-display";
import { updateNotificationAction } from "../../app/actions/notifications";
import { useMyStatus, useNotificationSettings } from "./LiveProvider";

type Created = { id?: unknown; category?: unknown; priority?: unknown; silent?: unknown };

export function NotificationAlerts() {
  const { t, locale } = useAdminLocale();
  const router = useRouter();
  const client = useRealtimeClient();
  const { preferences } = useNotificationSettings();
  const { mine } = useMyStatus();
  const latest = React.useRef({ preferences, mine, t, locale });
  React.useEffect(() => {
    latest.current = { preferences, mine, t, locale };
  }, [preferences, mine, t, locale]);

  useRealtime(
    (event) => {
      if (event.type !== "notification.created") return;
      const data = (event.data ?? {}) as Created;
      if (typeof data.id !== "string" || data.silent === true) return;
      const { preferences: prefs, mine: me, t, locale } = latest.current;
      const category = typeof data.category === "string" ? data.category : "";
      const mandatory = notificationCategory(category)?.mandatory ?? false;
      const setting = prefs?.categories.find((c) => c.category === category);
      const mutedAll = !!prefs?.mutedUntil && new Date(prefs.mutedUntil).getTime() > Date.now();
      const doNotDisturb = presenceSilences(me?.presence.status);
      if (!mandatory && (mutedAll || doNotDisturb || setting?.muted)) return;

      const leader = client?.isLeader() ?? true;
      const visible = document.visibilityState === "visible";
      const popups = prefs?.popupsEnabled ?? true;
      if (leader && (prefs?.soundEnabled ?? true) && setting?.sound !== false)
        void playNotificationSound(data.priority === "urgent" ? "alert" : (prefs?.sound ?? "chime"), prefs?.volume ?? 70);
      if (!(popups && visible) && !(leader && prefs?.desktopEnabled)) return;

      void (async () => {
        const response = await fetch(`/api/notifications?id=${encodeURIComponent(data.id as string)}`, { cache: "no-store" });
        if (!response.ok) return;
        const item = fromInbox((await response.json()) as InboxItem);
        const text = notificationText(item, t, locale);
        const href = notificationHref(item);
        const open = () => {
          void updateNotificationAction(item.id, "read").catch(() => {});
          if (href) router.push(href);
        };
        if (popups && document.visibilityState === "visible") {
          const show = data.priority === "urgent" ? toast.warning : toast;
          show(text.title, {
            id: `notification-${item.id}`,
            description: text.message,
            duration: data.priority === "urgent" || data.priority === "high" ? 10_000 : 6_000,
            action: href ? { label: t.liveNotifications.open, onClick: open } : undefined,
          });
        }
        if (leader && prefs?.desktopEnabled)
          showDesktopNotification(text.title, {
            body: text.message,
            tag: item.id,
            icon: "/favicon.ico",
            requireInteraction: data.priority === "urgent",
            onClick: open,
          });
      })().catch(() => {});
    },
    ["notification.created"],
  );
  return null;
}
