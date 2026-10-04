"use server";
import { ROUTES } from "../../constants/routes";
import { measureOperation } from "@ishoot/database";
import { runAtomicMutation } from "@ishoot/database";
import { validateActionArguments } from "../../lib/action-input";

import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  createActivityLog,
} from "@ishoot/database";
import { revalidatePath } from "next/cache";
import { requirePermission } from "../../lib/auth";

function assertEventWindow(start: string | undefined, end: string | undefined) {
  if (start === undefined && end === undefined) return;
  const startAt = new Date(start ?? ""), endAt = new Date(end ?? "");
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()))
    throw new Error("Provide a valid start and end time");
  if (endAt < startAt) throw new Error("The event cannot end before it starts");
}

export async function createCalendarEventAction(data: {
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
}) {
  return measureOperation("action:createCalendarEventAction", async () => {
    const user = await requirePermission("calendar", "write");
    validateActionArguments("createCalendarEventAction", { data });
    if (data.deal_id) await requirePermission("deals", "read");
    assertEventWindow(data.start_date, data.end_date);
    const { event } = await runAtomicMutation(async () => {
      const event = await createCalendarEvent({
        ...data,
        created_by: user.id,
      });
      await createActivityLog({
        user_id: user.id,
        action: "create",
        entity_type: "calendar_event",
        entity_id: event.id,
        details: { title: data.title, event_type: data.event_type },
      });
      return { event };
    });

    revalidatePath(ROUTES.calendar);
    revalidatePath(ROUTES.home);
    return { success: true, event };
  });
}

export async function updateCalendarEventAction(
  id: string,
  data: {
    title: string;
    title_ar?: string;
    description?: string;
    start_date: string;
    end_date: string;
    all_day?: boolean;
    location?: string;
    color?: string;
    event_type?: "meeting" | "shoot" | "deadline" | "reminder";
    deal_id?: string | null;
  },
) {
  return measureOperation("action:updateCalendarEventAction", async () => {
    const user = await requirePermission("calendar", "write");
    validateActionArguments("updateCalendarEventAction", { id, data });
    if (data.deal_id) await requirePermission("deals", "read");
    if (!data.title?.trim()) throw new Error("Event title is required");
    assertEventWindow(data.start_date, data.end_date);
    const { event } = await runAtomicMutation(async () => {
      const event = await updateCalendarEvent(id, {
        title: data.title.trim(),
        title_ar: data.title_ar ?? "",
        description: data.description ?? "",
        start_date: data.start_date,
        end_date: data.end_date,
        all_day: data.all_day,
        location: data.location ?? "",
        color: data.color,
        event_type: data.event_type,
        deal_id: data.deal_id ?? "",
      });
      if (!event) throw new Error("Event could not be saved");
      await createActivityLog({
        user_id: user.id,
        action: "update",
        entity_type: "calendar_event",
        entity_id: id,
        details: { title: data.title, event_type: data.event_type },
      });
      return { event };
    });

    revalidatePath(ROUTES.calendar);
    revalidatePath(ROUTES.home);
    return { success: true, event };
  });
}

export async function deleteCalendarEventAction(id: string) {
  return measureOperation("action:deleteCalendarEventAction", async () => {
    const user = await requirePermission("calendar", "delete");
    validateActionArguments("deleteCalendarEventAction", { id });
    await runAtomicMutation(async () => {
      await deleteCalendarEvent(id);
      await createActivityLog({
        user_id: user.id,
        action: "delete",
        entity_type: "calendar_event",
        entity_id: id,
      });
      return {};
    });

    revalidatePath(ROUTES.calendar);
    revalidatePath(ROUTES.home);
    return { success: true };
  });
}
