"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  installSoundUnlock,
  playNotificationSound,
  RealtimeProvider,
  RESYNC,
  showDesktopNotification,
  useRealtime,
  useRealtimeClient,
} from "@platform/ui";
import { notificationCategory, presenceSilences } from "@platform/contracts";
import type { InboxItem, MutedRecord, MyStatus, NotificationPreferences } from "@platform/api-client";
import { useCopy } from "../CopyProvider";

type Live = {
  preferences: NotificationPreferences | null;
  mutes: MutedRecord[];
  status: MyStatus | null;
  reload: () => Promise<void>;
  setPreferences: (p: NotificationPreferences) => void;
  setStatus: (s: MyStatus) => void;
};
const LiveContext = React.createContext<Live>({
  preferences: null,
  mutes: [],
  status: null,
  reload: async () => {},
  setPreferences: () => {},
  setStatus: () => {},
});
export const useItLive = () => React.useContext(LiveContext);

function Settings({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = React.useState<NotificationPreferences | null>(null);
  const [mutes, setMutes] = React.useState<MutedRecord[]>([]);
  const [status, setStatus] = React.useState<MyStatus | null>(null);
  const reload = React.useCallback(async () => {
    try {
      const response = await fetch("/api/notifications?view=settings", { cache: "no-store" });
      if (!response.ok) return;
      const body = (await response.json()) as { preferences: NotificationPreferences; mutes?: MutedRecord[]; status: MyStatus | null };
      setPreferences(body.preferences);
      setMutes(body.mutes ?? []);
      setStatus(body.status);
    } catch {

    }
  }, []);
  React.useEffect(() => {
    void reload();
    return installSoundUnlock();
  }, [reload]);
  useRealtime(() => void reload(), ["notification.preferences", "presence.changed"]);
  const value = React.useMemo(() => ({ preferences, mutes, status, reload, setPreferences, setStatus }), [preferences, mutes, status, reload]);
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

function Alerts() {
  const { copy } = useCopy();
  const router = useRouter();
  const client = useRealtimeClient();
  const { preferences, status } = useItLive();
  const latest = React.useRef({ preferences, status, copy });
  React.useEffect(() => {
    latest.current = { preferences, status, copy };
  }, [preferences, status, copy]);
  const refreshTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useRealtime(
    (event) => {
      const { preferences: prefs, status: me, copy } = latest.current;
      const data = event.data ?? {};

      if (event.type === RESYNC || (event.type === "entity.changed" && data.resource === "it_support")) {
        if (refreshTimer.current) clearTimeout(refreshTimer.current);
        refreshTimer.current = setTimeout(() => router.refresh(), 600);
      }
      const leader = client?.isLeader() ?? true;
      const quiet =
        (!!prefs?.mutedUntil && new Date(prefs.mutedUntil).getTime() > Date.now()) || presenceSilences(me?.presence.status);
      const ring = (sound: string) => {
        if (leader && (prefs?.soundEnabled ?? true)) void playNotificationSound(sound, prefs?.volume ?? 70);
      };

      if (event.type === "entity.changed" && data.resource === "it_support" && data.event === "created" && !quiet) {
        const ticketsSetting = prefs?.categories.find((c) => c.category === "it_tickets");
        if (ticketsSetting?.muted) return;
        if (ticketsSetting?.sound !== false) ring(prefs?.sound ?? "chime");
        if ((prefs?.popupsEnabled ?? true) && document.visibilityState === "visible")
          toast(copy.live.newTicket, { action: { label: copy.live.open, onClick: () => router.push(`/tickets/${String(data.id)}`) } });
        if (leader && prefs?.desktopEnabled)
          showDesktopNotification(copy.live.newTicket, { tag: String(data.id), onClick: () => router.push(`/tickets/${String(data.id)}`) });
        return;
      }

      if (event.type !== "notification.created" || data.silent === true || typeof data.id !== "string") return;
      const category = typeof data.category === "string" ? data.category : "";
      const setting = prefs?.categories.find((c) => c.category === category);
      if (!(notificationCategory(category)?.mandatory ?? false) && (quiet || setting?.muted)) return;
      if (setting?.sound !== false) ring(data.priority === "urgent" ? "alert" : (prefs?.sound ?? "chime"));
      void (async () => {
        const response = await fetch(`/api/notifications?id=${encodeURIComponent(data.id as string)}`, { cache: "no-store" });
        if (!response.ok) return;
        const item = (await response.json()) as InboxItem;
        const open = item.actionUrl?.startsWith("/") ? () => router.push(item.actionUrl!) : undefined;
        if ((prefs?.popupsEnabled ?? true) && document.visibilityState === "visible")
          toast(item.title, { description: item.body, action: open ? { label: copy.live.open, onClick: open } : undefined });
        if (leader && prefs?.desktopEnabled) showDesktopNotification(item.title, { body: item.body, tag: item.id, onClick: open });
      })().catch(() => {});
    },
    ["notification.created", "entity.changed"],
  );
  return null;
}

const reportActivity = (state: "active" | "idle") => {
  void fetch("/api/realtime/activity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state }),
    keepalive: true,
  }).catch(() => {});
};

export function ItLive({ children }: { children: React.ReactNode }) {
  return (
    <RealtimeProvider url="/api/realtime/stream" onActivity={reportActivity}>
      <Settings>
        <Alerts />
        {children}
      </Settings>
    </RealtimeProvider>
  );
}
