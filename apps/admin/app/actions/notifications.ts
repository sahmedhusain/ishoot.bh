'use server';

import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@ishoot/database';
import { revalidatePath } from 'next/cache';

export async function getNotificationsAction(userId?: string) {
  return await getNotifications(userId);
}

export async function markNotificationReadAction(id: string) {
  const success = await markNotificationRead(id);
  revalidatePath('/dashboard');
  return { success };
}

export async function markAllNotificationsReadAction(userId?: string) {
  const success = await markAllNotificationsRead(userId);
  revalidatePath('/dashboard');
  return { success };
}
