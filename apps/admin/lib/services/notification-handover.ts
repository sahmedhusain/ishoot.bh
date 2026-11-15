import {
  deliverNotifications,
  isApiError,
  type NewNotification,
} from "@platform/api-client";
import { listTableRows, upsertTableRow } from "../api/tables";

type PendingRow = {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  entityType: string | null;
  entityId: string | null;
  messageKey: string | null;
  messageParams: Record<string, unknown> | null;
  actionUrl: string | null;
  eventKey: string | null;
  isRead: boolean;
  hiddenAt: Date | string | null;
  createdAt: Date | string;
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
  const createdIso = new Date(row.createdAt || Date.now()).toISOString();
  return {
    id: row.id,
    realm: "staff",
    recipient: row.userId,
    priority: row.type === "warning" ? "high" : undefined,
    title: cut((row.title || "").trim() || row.messageKey || "Notification", 300),
    body: cut(row.message || "", 2000),
    messageKey: row.messageKey && /^[A-Za-z0-9_.-]{1,200}$/.test(row.messageKey) ? row.messageKey : undefined,
    messageParams: params,
    actionUrl: actionUrl && actionUrl.length <= 1000 ? actionUrl : undefined,
    entityType: row.entityType ? cut(row.entityType, 100) : undefined,
    entityId: row.entityId ? cut(row.entityId, 100) : undefined,
    dedupeKey: row.eventKey ? cut(row.eventKey, 200) : undefined,
    createdAt: createdIso,
    readAt: row.isRead ? createdIso : null,
    archivedAt: row.hiddenAt ? new Date(row.hiddenAt).toISOString() : null,
  };
}

export async function handOverNotifications(limit = 200): Promise<number> {
  const allRows = await listTableRows<any>("notify", "notification", "created_at ASC").catch(() => []);
  const rows = allRows.filter((r) => !r.handedOverAt).slice(0, limit);
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
  const nowIso = new Date().toISOString();
  await Promise.all(
    rows.map((r) => upsertTableRow("notify", "notification", { ...r, handedOverAt: nowIso })),
  );
  return rows.length;
}

let running: Promise<void> | undefined;

export function flushNotifications(): Promise<void> {
  running ??= (async () => {
    try {
      const allRows = await listTableRows<any>("notify", "notification").catch(() => []);
      const pending = allRows.find((r) => !r.handedOverAt);
      if (!pending) return;
      while ((await handOverNotifications()) === 200);
    } finally {
      running = undefined;
    }
  })();
  return running;
}
