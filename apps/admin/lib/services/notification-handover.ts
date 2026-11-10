import {
  deliverNotifications,
  isApiError,
  type NewNotification,
} from "@platform/api-client";
import { Database } from "@platform/database/decimal";
import { db } from "../atomic";

type PendingRow = {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  entityType: string | null;
  entityId: string | null;
  messageKey: string | null;
  messageParams: Database.JsonValue | null;
  actionUrl: string | null;
  eventKey: string | null;
  isRead: boolean;
  hiddenAt: Date | null;
  createdAt: Date;
};

const cut = (text: string, max: number) =>
  Array.from(text).length > max ? Array.from(text).slice(0, max - 1).join("") + "…" : text;

export function toNewNotification(row: PendingRow): NewNotification {
  const params: Record<string, string> = {};
  if (row.messageParams && typeof row.messageParams === "object" && !Array.isArray(row.messageParams)) {
    for (const [key, value] of Object.entries(row.messageParams).slice(0, 30)) {
      if (value === null || value === undefined || key.length > 64) continue;
      params[key] = cut(typeof value === "string" ? value : JSON.stringify(value), 1000);
    }
  }
  const actionUrl =
    row.actionUrl && row.actionUrl.startsWith("/") && !row.actionUrl.startsWith("//") ? row.actionUrl : undefined;
  return {
    id: row.id,
    realm: "staff",
    recipient: row.userId,
    priority: row.type === "warning" ? "high" : undefined,
    title: cut(row.title.trim() || row.messageKey || "Notification", 300),
    body: cut(row.message, 2000),
    messageKey: row.messageKey && /^[A-Za-z0-9_.-]{1,200}$/.test(row.messageKey) ? row.messageKey : undefined,
    messageParams: params,
    actionUrl: actionUrl && actionUrl.length <= 1000 ? actionUrl : undefined,
    entityType: row.entityType ? cut(row.entityType, 100) : undefined,
    entityId: row.entityId ? cut(row.entityId, 100) : undefined,
    dedupeKey: row.eventKey ? cut(row.eventKey, 200) : undefined,
    createdAt: row.createdAt.toISOString(),
    readAt: row.isRead ? row.createdAt.toISOString() : null,
    archivedAt: row.hiddenAt ? row.hiddenAt.toISOString() : null,
  };
}

export async function handOverNotifications(limit = 200): Promise<number> {
  return db.$transaction(
    async (tx) => {
      const rows = await tx.$queryRaw<PendingRow[]>`
        SELECT "id", "userId", "title", "message", "type", "entityType", "entityId", "messageKey", "messageParams",
               "actionUrl", "eventKey", "isRead", "hiddenAt", "createdAt"
        FROM "Notification"
        WHERE "handedOverAt" IS NULL
        ORDER BY "createdAt"
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED`;
      if (!rows.length) return 0;
      const items = rows.map(toNewNotification);
      try {
        await deliverNotifications(items);
      } catch (error) {
        if (!isApiError(error) || error.status !== 422) throw error;
        for (const item of items) {
          try {
            await deliverNotifications([item]);
          } catch (single) {
            if (!isApiError(single) || single.status !== 422) throw single;
            console.error(`notify refused notification ${item.id}; it is not handed over again`, single.code);
          }
        }
      }
      await tx.notification.updateMany({
        where: { id: { in: rows.map((r) => r.id) } },
        data: { handedOverAt: new Date() },
      });
      return rows.length;
    },
    { timeout: 60_000, maxWait: 10_000 },
  );
}

let running: Promise<void> | undefined;

export function flushNotifications(): Promise<void> {
  running ??= (async () => {
    try {
      const pending = await db.notification.findFirst({ where: { handedOverAt: null }, select: { id: true } });
      if (!pending) return;
      while ((await handOverNotifications()) === 200);
    } finally {
      running = undefined;
    }
  })();
  return running;
}
