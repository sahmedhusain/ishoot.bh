import { serverMessages } from "@ishoot/locales";
import { db } from "../db";
import { Notification } from "../types";

function mapNotification(n: any): Notification {
  return {
    id: n.id,
    user_id: n.userId,
    title: n.title,
    message: n.message,
    type: n.type as any,
    entity_type: n.entityType || undefined,
    entity_id: n.entityId || undefined,
    message_key: n.messageKey || undefined,
    message_params:
      (n.messageParams as Record<string, string> | null) || undefined,
    action_url: n.actionUrl || undefined,
    is_read: n.isRead,
    created_at: n.createdAt.toISOString(),
  };
}

export async function getNotifications(
  userId?: string,
): Promise<Notification[]> {
  try {
    const where: any = { hiddenAt: null, createdAt: { lte: new Date() } };
    if (userId) where.userId = userId;

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return notifications.map(mapNotification);
  } catch (e) {
    console.error("Error fetching notifications from DB:", e);
    throw e;
  }
}

export async function markNotificationRead(id: string): Promise<boolean> {
  try {
    await db.notification.update({
      where: { id },
      data: { isRead: true },
    });
    return true;
  } catch (e) {
    console.error(`Error marking notification ${id} read:`, e);
    return false;
  }
}

export async function markAllNotificationsRead(
  userId?: string,
): Promise<boolean> {
  try {
    const where: any = { isRead: false, createdAt: { lte: new Date() } };
    if (userId) where.userId = userId;
    await db.notification.updateMany({
      where,
      data: { isRead: true },
    });
    return true;
  } catch (e) {
    console.error("Error marking all notifications read:", e);
    return false;
  }
}

export async function createNotification(data: {
  user_id: string;
  title: string;
  message: string;
  type?: "info" | "warning" | "success" | "action";
  entity_type?: string;
  entity_id?: string;
  message_key?: string;
  message_params?: Record<string,string>;
}): Promise<Notification> {
  const created = await db.notification.create({
    data: {
      userId: data.user_id,
      title: data.title,
      message: data.message,
      type: data.type || "info",
      entityType: data.entity_type || null,
      entityId: data.entity_id || null,
      messageKey: data.message_key || null,
      messageParams: data.message_params,
    },
  });
  return mapNotification(created);
}

/** A paginated inbox scoped to one recipient, including hidden messages on request. */
export async function notificationInbox(
  userId: string,
  filter = "all",
  page = 1,
) {
  const where = {
    userId,
    createdAt: { lte: new Date() },
    ...(filter === "hidden" ? { hiddenAt: { not: null } } : { hiddenAt: null }),
    ...(filter === "unread" ? { isRead: false } : {}),
  };
  const [rows, total] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * 30,
      take: 30,
    }),
    db.notification.count({ where }),
  ]);
  return { items: rows.map(mapNotification), total };
}
export async function updateOwnNotification(
  userId: string,
  id: string,
  change: "read" | "unread" | "hide" | "unhide" | "delete",
) {
  if (change === "delete") {
    const result = await db.notification.deleteMany({ where: { id, userId } });
    if (!result.count) throw new Error(serverMessages.notificationNotFound);
    return;
  }
  const data =
    change === "read"
      ? { isRead: true }
      : change === "unread"
        ? { isRead: false }
        : change === "hide"
          ? { hiddenAt: new Date(), isRead: true }
          : { hiddenAt: null };
  const result = await db.notification.updateMany({
    where: { id, userId },
    data,
  });
  if (!result.count) throw new Error(serverMessages.notificationNotFound);
}

/** A bounded header preview, with an exact unread count across the recipient's entire inbox. */
export async function notificationPreview(userId: string, unreadOnly = false) {
  const base = { userId, hiddenAt: null, createdAt: { lte: new Date() } };
  const [rows, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: { ...base, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 8,
    }),
    db.notification.count({ where: { ...base, isRead: false } }),
  ]);
  return { items: rows.map(mapNotification), unreadCount };
}
