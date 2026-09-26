'use server';

import {
  createCalendarEvent,
  deleteCalendarEvent,
} from '@ishoot/database';
import { revalidatePath } from 'next/cache';

export async function createCalendarEventAction(data: {
  title: string;
  title_ar?: string;
  description?: string;
  start_date: string;
  end_date: string;
  all_day?: boolean;
  location?: string;
  color?: string;
  event_type?: 'meeting' | 'shoot' | 'deadline' | 'reminder';
  deal_id?: string;
  created_by?: string;
  google_event_id?: string;
  google_calendar_id?: string;
}) {
  const event = await createCalendarEvent(data);
  revalidatePath('/dashboard/calendar');
  revalidatePath('/dashboard');
  return { success: true, event };
}

export async function deleteCalendarEventAction(id: string) {
  await deleteCalendarEvent(id);
  revalidatePath('/dashboard/calendar');
  revalidatePath('/dashboard');
  return { success: true };
}
