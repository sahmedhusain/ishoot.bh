"use server";

import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@ishoot/database";
import { revalidatePath } from "next/cache";
import { requireAuth } from "../../lib/auth";
import { db } from "@ishoot/database";

export async function getNotificationsAction(userId?: string) {
  const user = await requireAuth();
  return await getNotifications(user.id);
}

export async function markNotificationReadAction(id: string) {
  const user = await requireAuth();
  const notification = await db.notification.findUnique({ where: { id }, select: { userId: true } });
  if (!notification || notification.userId !== user.id) throw new Error("Notification not found");
  const success = await markNotificationRead(id);
  revalidatePath("/dashboard");
  return { success };
}

export async function markAllNotificationsReadAction(userId?: string) {
  const user = await requireAuth();
  const success = await markAllNotificationsRead(user.id);
  revalidatePath("/dashboard");
  return { success };
}
