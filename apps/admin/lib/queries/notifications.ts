import { db } from "../atomic";
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

export async function createNotification(data: {
  user_id: string;
  title: string;
  message: string;
  type?: "info" | "warning" | "success" | "action";
  entity_type?: string;
  entity_id?: string;
  message_key?: string;
  message_params?: Record<string, string>;
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
