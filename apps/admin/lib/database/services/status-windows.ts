// Sends meetings and approved leave to the realtime service as status windows (docs/adr/0012), so people show as
// "In a meeting" or "On leave" while they last. Each change is sent right after it is saved; a full sync of the coming
// weeks runs regularly and repairs anything missed (realtime unreachable, a change made by another path). A failure
// never blocks the change itself: statuses are informative.
import {
  removeStatusWindow,
  replaceStatusWindow,
  syncStatusWindows,
  type StatusWindowInput,
} from "@platform/api-client";
import { db } from "../db";

const DAY = 86_400_000;
/** How far ahead the full sync covers meetings, and leave. */
const MEETINGS_AHEAD = 14 * DAY;
const LEAVE_AHEAD = 60 * DAY;

/** The people in a meeting: its organiser, and those chosen for a private or custom event. */
function meetingPeople(event: { createdById: string | null; visibility: string; audienceUserIds: string[] }) {
  const people = new Set<string>();
  if (event.createdById) people.add(event.createdById);
  if (event.visibility === "private" || event.visibility === "custom")
    for (const id of event.audienceUserIds) people.add(id);
  return Array.from(people).slice(0, 500);
}

type MeetingRow = {
  id: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  eventType: string;
  createdById: string | null;
  visibility: string;
  audienceUserIds: string[];
};

function meetingWindow(event: MeetingRow): StatusWindowInput | null {
  if (event.eventType !== "meeting" || event.allDay || event.endDate <= event.startDate) return null;
  const userIds = meetingPeople(event);
  if (!userIds.length) return null;
  return { sourceId: event.id, kind: "meeting", startsAt: event.startDate.toISOString(), endsAt: event.endDate.toISOString(), userIds };
}

const meetingSelect = {
  id: true,
  startDate: true,
  endDate: true,
  allDay: true,
  eventType: true,
  createdById: true,
  visibility: true,
  audienceUserIds: true,
} as const;

function quietly(what: string, error: unknown) {
  console.error(`Updating statuses for ${what} failed; the next full sync repairs it:`, error);
}

/** Sends one calendar event's window (or removes it when it is no longer a timed meeting). */
export async function syncMeetingStatus(eventId: string) {
  try {
    const event = await db.calendarEvent.findUnique({ where: { id: eventId }, select: meetingSelect });
    const window = event ? meetingWindow(event) : null;
    if (window) await replaceStatusWindow("staff", "calendar", window);
    else await removeStatusWindow("staff", "calendar", eventId);
  } catch (error) {
    quietly("a calendar event", error);
  }
}

type LeaveRow = {
  id: string;
  status: string;
  startDate: Date;
  endDate: Date;
  employee: { userId: string | null };
  leaveType: { code: string };
};

/** Leave covers whole days: from the start day's midnight to the end of the end day (server time). */
function leaveWindow(leave: LeaveRow): StatusWindowInput | null {
  const userId = leave.employee.userId;
  if (leave.status !== "approved" || !userId) return null;
  const startsAt = new Date(leave.startDate);
  startsAt.setHours(0, 0, 0, 0);
  const endsAt = new Date(leave.endDate);
  endsAt.setHours(24, 0, 0, 0);
  if (endsAt <= startsAt) return null;
  return {
    sourceId: leave.id,
    kind: leave.leaveType.code === "sick" ? "sick" : "leave",
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    userIds: [userId],
  };
}

const leaveSelect = {
  id: true,
  status: true,
  startDate: true,
  endDate: true,
  employee: { select: { userId: true } },
  leaveType: { select: { code: true } },
} as const;

/** Sends one leave request's window when approved, and removes it otherwise (rejected, cancelled). */
export async function syncLeaveStatus(leaveId: string) {
  try {
    const leave = await db.leaveRequest.findUnique({ where: { id: leaveId }, select: leaveSelect });
    const window = leave ? leaveWindow(leave) : null;
    if (window) await replaceStatusWindow("staff", "leave", window);
    else await removeStatusWindow("staff", "leave", leaveId);
  } catch (error) {
    quietly("a leave request", error);
  }
}

/** Replaces realtime's picture of the coming weeks' meetings and approved leave with the current one. */
export async function syncAllStatusWindows(now = new Date()) {
  const from = new Date(now.getTime() - DAY);
  const meetingsUntil = new Date(now.getTime() + MEETINGS_AHEAD);
  const leaveUntil = new Date(now.getTime() + LEAVE_AHEAD);
  const [meetings, leave] = await Promise.all([
    db.calendarEvent.findMany({
      where: { eventType: "meeting", allDay: false, endDate: { gt: from }, startDate: { lt: meetingsUntil } },
      select: meetingSelect,
      take: 5000,
    }),
    db.leaveRequest.findMany({
      where: { status: "approved", endDate: { gte: from }, startDate: { lt: leaveUntil } },
      select: leaveSelect,
      take: 5000,
    }),
  ]);
  const meetingWindows = (meetings || []).map(meetingWindow).filter((w): w is StatusWindowInput => !!w);
  const leaveWindows = (leave || []).map(leaveWindow).filter((w): w is StatusWindowInput => !!w);
  await syncStatusWindows("staff", "calendar", from.toISOString(), meetingsUntil.toISOString(), meetingWindows);
  await syncStatusWindows("staff", "leave", from.toISOString(), leaveUntil.toISOString(), leaveWindows);
  return { meetings: meetingWindows.length, leave: leaveWindows.length };
}
