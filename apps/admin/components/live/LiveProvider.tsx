"use client";
import * as React from "react";
import {
  installSoundUnlock,
  RealtimeProvider,
  useRealtime,
  type PresenceTone,
} from "@platform/ui";
import { presenceSilences, presenceTone } from "@platform/contracts";
import type { MyStatus, NotificationPreferences, Presence } from "@platform/api-client";

type MutedRecord = { entityType: string; entityId: string; until: string | null; createdAt: string };
type Settings = {
  preferences: NotificationPreferences | null;
  mutes: MutedRecord[];
  categories: string[];
  reload: () => Promise<void>;
  setPreferences: (next: NotificationPreferences) => void;
};

const SettingsContext = React.createContext<Settings>({
  preferences: null,
  mutes: [],
  categories: [],
  reload: async () => {},
  setPreferences: () => {},
});

export const useNotificationSettings = () => React.useContext(SettingsContext);

function NotificationSettingsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<Omit<Settings, "reload" | "setPreferences">>({
    preferences: null,
    mutes: [],
    categories: [],
  });
  const reload = React.useCallback(async () => {
    try {
      const response = await fetch("/api/notifications?view=settings", { cache: "no-store" });
      if (response.ok) setState(await response.json());
    } catch {
    }
  }, []);
  React.useEffect(() => {
    void reload();
  }, [reload]);
  useRealtime(() => void reload(), ["notification.preferences"]);
  const setPreferences = React.useCallback(
    (preferences: NotificationPreferences) => setState((s) => ({ ...s, preferences })),
    [],
  );
  const value = React.useMemo(() => ({ ...state, reload, setPreferences }), [state, reload, setPreferences]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

type PresenceState = {
  selfId: string;
  get: (id: string) => Presence | undefined;
  track: (id: string) => () => void;
  mine: MyStatus | null;
  setMine: (status: MyStatus) => void;
  version: number;
};

const PresenceContext = React.createContext<PresenceState | null>(null);

function PresenceProvider({ selfId, children }: { selfId: string; children: React.ReactNode }) {
  const cache = React.useRef(new Map<string, Presence>());
  const tracked = React.useRef(new Map<string, number>());
  const pending = React.useRef(new Set<string>());
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [version, setVersion] = React.useState(0);
  const [mine, setMine] = React.useState<MyStatus | null>(null);

  const fetchNow = React.useCallback(async (ids: string[]) => {
    for (let i = 0; i < ids.length; i += 200) {
      try {
        const response = await fetch(`/api/presence?ids=${encodeURIComponent(ids.slice(i, i + 200).join(","))}`, { cache: "no-store" });
        if (!response.ok) continue;
        const { items } = (await response.json()) as { items: Presence[] };
        for (const p of items) cache.current.set(p.userId, p);
      } catch {
      }
    }
    setVersion((v) => v + 1);
  }, []);
  const schedule = React.useCallback(
    (ids: Iterable<string>) => {
      for (const id of Array.from(ids)) pending.current.add(id);
      if (timer.current) return;
      timer.current = setTimeout(() => {
        timer.current = null;
        const ids = Array.from(pending.current);
        pending.current.clear();
        if (ids.length) void fetchNow(ids);
      }, 120);
    },
    [fetchNow],
  );
  const refreshMine = React.useCallback(async () => {
    try {
      const response = await fetch("/api/presence/me", { cache: "no-store" });
      if (response.ok) setMine((await response.json()) as MyStatus);
    } catch {
    }
  }, []);

  React.useEffect(() => {
    void refreshMine();
    const every = setInterval(() => schedule(tracked.current.keys()), 60_000);
    return () => clearInterval(every);
  }, [refreshMine, schedule]);

  useRealtime(
    (event) => {
      const userId = typeof event.data?.userId === "string" ? event.data.userId : null;
      if (userId && !tracked.current.has(userId) && userId !== selfId) return;
      schedule(userId ? [userId] : tracked.current.keys());
      if (!userId || userId === selfId) void refreshMine();
    },
    ["presence.changed"],
  );

  const value = React.useMemo<PresenceState>(
    () => ({
      selfId,
      get: (id) => cache.current.get(id),
      track: (id) => {
        tracked.current.set(id, (tracked.current.get(id) ?? 0) + 1);
        if (!cache.current.has(id)) schedule([id]);
        return () => {
          const n = (tracked.current.get(id) ?? 1) - 1;
          if (n <= 0) tracked.current.delete(id);
          else tracked.current.set(id, n);
        };
      },
      mine,
      setMine,
      version,
    }),
    [selfId, schedule, mine, version],
  );
  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export function usePresence(userId: string | null | undefined): Presence | undefined {
  const ctx = React.useContext(PresenceContext);
  React.useEffect(() => (ctx && userId ? ctx.track(userId) : undefined), [ctx, userId]);
  return ctx && userId ? ctx.get(userId) : undefined;
}

export function useMyStatus() {
  const ctx = React.useContext(PresenceContext);
  return { mine: ctx?.mine ?? null, setMine: ctx?.setMine ?? (() => {}) };
}

export function presenceLook(status: string | null | undefined): { tone: PresenceTone; doNotDisturb: boolean } {
  return { tone: presenceTone(status) as PresenceTone, doNotDisturb: presenceSilences(status) };
}

function SoundUnlock() {
  React.useEffect(() => installSoundUnlock(), []);
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

export function LiveProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  return (
    <RealtimeProvider url="/api/realtime/stream" onActivity={reportActivity}>
      <NotificationSettingsProvider>
        <PresenceProvider selfId={userId}>
          <SoundUnlock />
          {children}
        </PresenceProvider>
      </NotificationSettingsProvider>
    </RealtimeProvider>
  );
}
