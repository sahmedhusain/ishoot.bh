import catalog from "../catalog/presence.json";

export type PresenceTone = "available" | "busy" | "away" | "leave" | "offline";
export type PresenceStatusInfo = (typeof catalog.statuses)[number];
export type PresenceDuration = (typeof catalog.durations)[number];

export const PRESENCE_STATUSES: readonly PresenceStatusInfo[] = catalog.statuses;
export const PRESENCE_MANUAL_STATUSES = catalog.statuses.filter((s) => s.manual);
export const PRESENCE_DURATIONS = catalog.durations as readonly PresenceDuration[];
export const PRESENCE_MESSAGE_MAX = catalog.messageMaxLength;

export const presenceStatus = (key: string) =>
  PRESENCE_STATUSES.find((s) => s.key === key);

export const presenceTone = (key: string | null | undefined): PresenceTone =>
  (presenceStatus(key ?? "")?.tone as PresenceTone | undefined) ?? "offline";

export const presenceSilences = (key: string | null | undefined) =>
  presenceStatus(key ?? "")?.silences ?? false;

export function presenceExpiry(duration: PresenceDuration, now = new Date()): Date | null {
  const minutes: Record<string, number> = { "30m": 30, "1h": 60, "2h": 120, "4h": 240 };
  if (duration in minutes) return new Date(now.getTime() + minutes[duration] * 60_000);
  if (duration === "today") {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return end;
  }
  if (duration === "this_week") {
    const end = new Date(now);
    end.setDate(end.getDate() + (7 - end.getDay()));
    end.setHours(0, 0, 0, 0);
    return end;
  }
  return null;
}
