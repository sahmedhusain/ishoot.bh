export async function notifyUsersWithPermission(
  _resource: string,
  _action: string,
  _notification: {
    title: string;
    message: string;
    message_key: string;
    message_params: Record<string, string>;
    type?: "info" | "warning" | "success" | "action";
    entity_type: string;
    entity_id: string;
    action_url?: string;
  },
): Promise<void> {
  // Web app notifications can be routed to notification service or logged
}
