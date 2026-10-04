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
    message_params: (n.messageParams as Record<string, string> | null) || undefined,
    action_url: n.actionUrl || undefined,
    is_read: n.isRead,
    created_at: n.createdAt.toISOString(),
  };
}

export async function getNotifications(
  userId?: string,
): Promise<Notification[]> {
  try {
    const where: any = {};
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
    const where: any = { isRead: false };
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
}): Promise<Notification> {
  const created = await db.notification.create({
    data: {
      userId: data.user_id,
      title: data.title,
      message: data.message,
      type: data.type || "info",
      entityType: data.entity_type || null,
      entityId: data.entity_id || null,
    },
  });
  return mapNotification(created);
}
