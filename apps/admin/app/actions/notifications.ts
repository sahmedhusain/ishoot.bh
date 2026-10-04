"use server";
import { measureOperation } from "@ishoot/database";
import { validateActionArguments } from "../../lib/action-input";

import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@ishoot/database";
import { requireAuth } from "../../lib/auth";
import { db } from "@ishoot/database";

export async function markNotificationReadAction(id: string) {
  return measureOperation("action:markNotificationReadAction", async () => {
    const user = await requireAuth();
    validateActionArguments("markNotificationReadAction", { id });
    const notification = await db.notification.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!notification || notification.userId !== user.id)
      throw new Error("Notification not found");
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
