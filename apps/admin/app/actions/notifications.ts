"use server";
import { serverMessages } from "@platform/locales";
import { measureOperation } from "@platform/database";
import { validateActionArguments } from "../../lib/action-input";

import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@platform/database";
import { requireAuth } from "../../lib/auth";
import { db } from "@platform/database";

export async function markNotificationReadAction(id: string) {
  return measureOperation("action:markNotificationReadAction", async () => {
    const user = await requireAuth();
    validateActionArguments("markNotificationReadAction", { id });
    const notification = await db.notification.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!notification || notification.userId !== user.id)
      throw new Error(serverMessages.notificationNotFound);
    const success = await markNotificationRead(id);
    return { success };
  });
}

export async function markAllNotificationsReadAction(userId?: string) {
  return measureOperation("action:markAllNotificationsReadAction", async () => {
    const user = await requireAuth();
    validateActionArguments("markAllNotificationsReadAction", { userId });
    const success = await markAllNotificationsRead(user.id);
    return { success };
  });
}

/** Changes only the signed-in person's own message. */
export async function updateNotificationAction(
  id: string,
  change: "read" | "unread" | "hide" | "unhide" | "delete",
) {
  validateActionArguments("updateNotificationAction", { id, change });
  const user = await requireAuth();
  const { updateOwnNotification } =
    await import("@platform/database/queries/notifications");
  await updateOwnNotification(user.id, id, change);
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/notifications");
}
