'use server';

import {
  createCalendarEvent,
  deleteCalendarEvent,
  createActivityLog,
} from '@ishoot/database';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '../../lib/auth';

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
  const user = await requirePermission('calendar', 'write');
  const event = await createCalendarEvent({
    ...data,
    created_by: user.id,
  });

  await createActivityLog({
    user_id: user.id,
    action: 'create',
    entity_type: 'calendar_event',
    entity_id: event.id,
    details: { title: data.title, event_type: data.event_type },
  });

  revalidatePath('/dashboard/calendar');
  revalidatePath('/dashboard');
  return { success: true, event };
}

export async function deleteCalendarEventAction(id: string) {
  const user = await requirePermission('calendar', 'delete');
  await deleteCalendarEvent(id);

  await createActivityLog({
    user_id: user.id,
    action: 'delete',
    entity_type: 'calendar_event',
    entity_id: id,
  });

  revalidatePath('/dashboard/calendar');
  revalidatePath('/dashboard');
  return { success: true };
}
