import { deliverNotifications } from "../api/inbox";
import { Notification } from "../types";

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
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await deliverNotifications([
    {
      id,
      realm: "staff",
      recipient: data.user_id,
      priority: data.type === "warning" ? "high" : "normal",
      title: data.title,
      body: data.message,
      entityType: data.entity_type || undefined,
      entityId: data.entity_id || undefined,
      messageKey:
        data.message_key && /^[A-Za-z0-9_.-]{1,200}$/.test(data.message_key)
          ? data.message_key
          : undefined,
      messageParams: data.message_params,
      createdAt,
    },
  ]);
  return {
    id,
    user_id: data.user_id,
    title: data.title,
    message: data.message,
    type: data.type || "info",
    entity_type: data.entity_type,
    entity_id: data.entity_id,
    message_key: data.message_key,
    message_params: data.message_params,
    is_read: false,
    created_at: createdAt,
  };
}
