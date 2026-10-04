import { db } from "../db";
import { CalendarEvent } from "../types";

export function mapEvent(e: any): CalendarEvent {
  return {
    id: e.id,
    title: e.title,
    title_ar: e.titleAr || undefined,
    description: e.description || undefined,
    start_date: e.startDate.toISOString(),
    end_date: e.endDate.toISOString(),
    all_day: e.allDay,
    location: e.location || undefined,
    color: e.color || "#09937F",
    event_type: e.eventType as any,
    deal_id: e.dealId || undefined,
    created_by: e.createdById || undefined,
    google_event_id: e.googleEventId || undefined,
    google_calendar_id: e.googleCalendarId || undefined,
    recurrence: e.recurrence || undefined,
    reminders: (e.reminders as any) || undefined,
    attendees: (e.attendees as any) || undefined,
    created_at: e.createdAt.toISOString(),
    updated_at: e.updatedAt.toISOString(),
    deal: e.deal
      ? {
          id: e.deal.id,
          title: e.deal.title,
          value: Number(e.deal.dealValue),
          currency: e.deal.currency as any,
          stage: e.deal.dealStage as any,
          probability: e.deal.probability,
          created_at: e.deal.createdAt.toISOString(),
          updated_at: e.deal.updatedAt.toISOString(),
        }
      : undefined,
  };
}

export async function getCalendarEvents(
  startDate?: Date,
  endDate?: Date,
  limit?: number,
): Promise<CalendarEvent[]> {
  try {
    const where: any = {};
    if (startDate && endDate) {
      where.startDate = { lte: endDate };
      where.endDate = { gte: startDate };
    } else if (startDate) {
      where.endDate = { gte: startDate };
    }

    const events = await db.calendarEvent.findMany({
      where,
      take: limit,
      include: { deal: true },
      orderBy: { startDate: "asc" },
    });
    return events.map(mapEvent);
  } catch (e) {
    console.error("Error fetching calendar events from DB:", e);
    throw e;
  }
}

export async function getCalendarEventById(
  id: string,
): Promise<CalendarEvent | null> {
  try {
    const event = await db.calendarEvent.findUnique({
      where: { id },
      include: { deal: true },
    });
    return event ? mapEvent(event) : null;
  } catch (e) {
    console.error(`Error fetching calendar event ${id}:`, e);
    throw e;
  }
}

export async function createCalendarEvent(data: {
  title: string;
  title_ar?: string;
  description?: string;
  start_date: string;
  end_date: string;
  all_day?: boolean;
  location?: string;
  color?: string;
  event_type?: "meeting" | "shoot" | "deadline" | "reminder";
  deal_id?: string;
  created_by?: string;
  google_event_id?: string;
  google_calendar_id?: string;
}): Promise<CalendarEvent> {
  const created = await db.calendarEvent.create({
    data: {
      title: data.title,
      titleAr: data.title_ar || null,
      description: data.description || null,
      startDate: new Date(data.start_date),
      endDate: new Date(data.end_date),
      allDay: data.all_day ?? false,
      location: data.location || null,
      color: data.color || "#09937F",
      eventType: data.event_type || "meeting",
      dealId: data.deal_id || null,
      createdById: data.created_by || null,
      googleEventId: data.google_event_id || null,
      googleCalendarId: data.google_calendar_id || null,
    },
    include: { deal: true },
  });
  return mapEvent(created);
}

export async function updateCalendarEvent(
  id: string,
  data: Partial<CalendarEvent>,
): Promise<CalendarEvent | null> {
  try {
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    // Empty optional fields are cleared, not stored as empty strings.
    if (data.title_ar !== undefined) updateData.titleAr = data.title_ar || null;
    if (data.description !== undefined)
      updateData.description = data.description || null;
    if (data.start_date !== undefined)
      updateData.startDate = new Date(data.start_date);
    if (data.end_date !== undefined)
      updateData.endDate = new Date(data.end_date);
    if (data.all_day !== undefined) updateData.allDay = data.all_day;
    if (data.location !== undefined) updateData.location = data.location || null;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.event_type !== undefined) updateData.eventType = data.event_type;
    if (data.deal_id !== undefined) updateData.dealId = data.deal_id || null;
    if (data.google_event_id !== undefined)
      updateData.googleEventId = data.google_event_id;
    if (data.google_calendar_id !== undefined)
      updateData.googleCalendarId = data.google_calendar_id;

    const updated = await db.calendarEvent.update({
      where: { id },
      data: updateData,
      include: { deal: true },
    });
    return mapEvent(updated);
  } catch (e) {
    console.error(`Error updating calendar event ${id}:`, e);
    throw e;
  }
}

export async function deleteCalendarEvent(id: string): Promise<boolean> {
  try {
    await db.calendarEvent.delete({ where: { id } });
    return true;
  } catch (e) {
    console.error(`Error deleting calendar event ${id}:`, e);
    throw e;
  }
}
