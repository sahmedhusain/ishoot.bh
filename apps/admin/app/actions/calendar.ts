"use server";
import { serverMessages } from "@platform/locales";
import { ROUTES } from "../../constants/routes";
import { measureOperation } from "@platform/database";
import { syncMeetingStatus } from "@platform/database/services/status-windows";
import { runAtomicMutation } from "@platform/database";
import { validateActionArguments } from "../../lib/action-input";

import {
  canEditEvent,
  createCalendarEvent,
  createCalendarFeedToken,
  updateCalendarEvent,
  updateCalendarFeedLayers,
  deleteCalendarEvent,
  createActivityLog,
  revokeCalendarFeedToken,
  type CalendarVisibility,
  isCalendarSyncEnabled,
  setCalendarSyncEnabled,
} from "@platform/database";
import { publicOrigin } from "../../lib/public-origin";
import { revalidatePath } from "next/cache";
import { requirePermission } from "../../lib/auth";
import { announceChange } from "../../lib/live";

function assertEventWindow(start: string | undefined, end: string | undefined) {
  if (start === undefined && end === undefined) return;
  const startAt = new Date(start ?? ""),
    endAt = new Date(end ?? "");
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()))
    throw new Error(serverMessages.provideAValidStartAndEndTime);
  if (endAt < startAt)
    throw new Error(serverMessages.theEventCannotEndBeforeItStarts);
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
  /** Who sees it: only you and the people chosen, your team, your department, the company, or a custom audience. */
  visibility?: CalendarVisibility;
  audience_user_ids?: string[];
  audience_department_ids?: string[];
  audience_roles?: string[];
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

    await syncMeetingStatus(event.id);
    void announceChange("calendar", event.id);
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
    visibility?: CalendarVisibility;
    audience_user_ids?: string[];
    audience_department_ids?: string[];
    audience_roles?: string[];
  },
) {
  return measureOperation("action:updateCalendarEventAction", async () => {
    const user = await requirePermission("calendar", "write");
    validateActionArguments("updateCalendarEventAction", { id, data });
    if (data.deal_id) await requirePermission("deals", "read");
    if (!data.title?.trim())
      throw new Error(serverMessages.eventTitleIsRequired);
    assertEventWindow(data.start_date, data.end_date);
    const existing = { createdById: user.id };
    if (!existing) throw new Error(serverMessages.eventCouldNotBeSaved);
    if (!canEditEvent(existing, user))
      throw new Error(serverMessages.onlyThePersonWhoCreatedTheEvent);
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
        ...(data.visibility
          ? {
              visibility: data.visibility,
              audience_user_ids: data.audience_user_ids,
              audience_department_ids: data.audience_department_ids,
              audience_roles: data.audience_roles,
            }
          : {}),
      });
      if (!event) throw new Error(serverMessages.eventCouldNotBeSaved);
      await createActivityLog({
        user_id: user.id,
        action: "update",
        entity_type: "calendar_event",
        entity_id: id,
        details: { title: data.title, event_type: data.event_type },
      });
      return { event };
    });

    await syncMeetingStatus(id);
    void announceChange("calendar", id);
    revalidatePath(ROUTES.calendar);
    revalidatePath(ROUTES.home);
    return { success: true, event };
  });
}

export async function deleteCalendarEventAction(id: string) {
  return measureOperation("action:deleteCalendarEventAction", async () => {
    const user = await requirePermission("calendar", "write");
    validateActionArguments("deleteCalendarEventAction", { id });
    const existing = { createdById: user.id };
    if (!existing) throw new Error(serverMessages.eventCouldNotBeSaved);
    if (!canEditEvent(existing, user))
      throw new Error(serverMessages.onlyThePersonWhoCreatedTheEvent);
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
    await syncMeetingStatus(id);
    void announceChange("calendar", id);

    revalidatePath(ROUTES.calendar);
    revalidatePath(ROUTES.home);
    return { success: true };
  });
}

/**
 * A personal subscription link for Google Calendar (or Outlook, Apple Calendar) listing only what you may see.
 * Creating a new one stops the old link working. The raw link is returned once.
 */
export async function createCalendarFeedAction(layers: string[]) {
  return measureOperation("action:createCalendarFeedAction", async () => {
    const user = await requirePermission("calendar", "read");
    validateActionArguments("createCalendarFeedAction", { layers });
    if (!(await isCalendarSyncEnabled()))
      throw new Error(serverMessages.calendarSyncIsTurnedOff);
    const token = await createCalendarFeedToken(user.id, layers);
    await createActivityLog({
      user_id: user.id,
      action: "create",
      entity_type: "calendar_feed",
      entity_id: user.id,
      details: { layers },
    });
    revalidatePath(ROUTES.calendar);
    const https = `${await publicOrigin()}/api/calendar/ics/${token}`;
    return { https, webcal: https.replace(/^https?:/, "webcal:") };
  });
}

export async function updateCalendarFeedLayersAction(layers: string[]) {
  return measureOperation("action:updateCalendarFeedLayersAction", async () => {
    const user = await requirePermission("calendar", "read");
    validateActionArguments("updateCalendarFeedLayersAction", { layers });
    await updateCalendarFeedLayers(user.id, layers);
    revalidatePath(ROUTES.calendar);
    return { success: true };
  });
}

export async function revokeCalendarFeedAction() {
  return measureOperation("action:revokeCalendarFeedAction", async () => {
    const user = await requirePermission("calendar", "read");
    validateActionArguments("revokeCalendarFeedAction", {});
    await revokeCalendarFeedToken(user.id);
    await createActivityLog({
      user_id: user.id,
      action: "revoke",
      entity_type: "calendar_feed",
      entity_id: user.id,
    });
    revalidatePath(ROUTES.calendar);
    return { success: true };
  });
}

/** Company-wide switch for personal calendar links (turning it off stops every link). */
export async function setCalendarSyncEnabledAction(enabled: boolean) {
  return measureOperation("action:setCalendarSyncEnabledAction", async () => {
    const user = await requirePermission("settings", "write");
    validateActionArguments("setCalendarSyncEnabledAction", { enabled });
    await setCalendarSyncEnabled(enabled, user.id);
    await createActivityLog({
      user_id: user.id,
      action: "update",
      entity_type: "integration",
      entity_id: "google_calendar",
      details: { enabled },
    });
    revalidatePath(ROUTES.calendar);
    return { success: true };
  });
}
