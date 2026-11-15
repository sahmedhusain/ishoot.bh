import {
  removeStatusWindow,
  replaceStatusWindow,
  syncStatusWindows,
  type StatusWindowInput,
} from "@platform/api-client";
import { listTableRows } from "../api/tables";

const DAY = 86_400_000;
const MEETINGS_AHEAD = 14 * DAY;
const LEAVE_AHEAD = 60 * DAY;

function meetingPeople(event: { createdById: string | null; visibility: string; audienceUserIds: string[] }) {
  const people = new Set<string>();
  if (event.createdById) people.add(event.createdById);
  if (event.visibility === "private" || event.visibility === "custom")
    for (const id of event.audienceUserIds || []) people.add(id);
  return Array.from(people).slice(0, 500);
}

type MeetingRow = {
  id: string;
  startDate: Date | string;
  endDate: Date | string;
  allDay: boolean;
  eventType: string;
  createdById: string | null;
  visibility: string;
  audienceUserIds: string[];
};

function meetingWindow(event: MeetingRow): StatusWindowInput | null {
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  if (event.eventType !== "meeting" || event.allDay || end <= start) return null;
  const userIds = meetingPeople(event);
  if (!userIds.length) return null;
  return { sourceId: event.id, kind: "meeting", startsAt: start.toISOString(), endsAt: end.toISOString(), userIds };
}

function quietly(what: string, error: unknown) {
  console.error(`Updating statuses for ${what} failed; the next full sync repairs it:`, error);
}

export async function syncMeetingStatus(eventId: string) {
  try {
    const events = await listTableRows<any>("workflow", "calendar_event");
    const event = events.find((e) => e.id === eventId);
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
  startDate: Date | string;
  endDate: Date | string;
  employee: { userId: string | null };
  leaveType: { code: string };
};

function leaveWindow(leave: LeaveRow): StatusWindowInput | null {
  const userId = leave.employee?.userId;
  if (leave.status !== "approved" || !userId) return null;
  const startsAt = new Date(leave.startDate);
  startsAt.setHours(0, 0, 0, 0);
  const endsAt = new Date(leave.endDate);
  endsAt.setHours(24, 0, 0, 0);
  if (endsAt <= startsAt) return null;
  return {
    sourceId: leave.id,
    kind: leave.leaveType?.code === "sick" ? "sick" : "leave",
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    userIds: [userId],
  };
}

export async function syncLeaveStatus(leaveId: string) {
  try {
    const [leaves, employees, leaveTypes] = await Promise.all([
      listTableRows<any>("hr", "leave_request"),
      listTableRows<any>("hr", "employee").catch(() => []),
      listTableRows<any>("hr", "leave_type").catch(() => []),
    ]);
    const raw = leaves.find((l) => l.id === leaveId);
    const leave = raw
      ? {
          ...raw,
          employee: employees.find((e) => e.id === raw.employeeId) || { userId: null },
          leaveType: leaveTypes.find((lt) => lt.id === raw.leaveTypeId) || { code: "" },
        }
      : null;
    const window = leave ? leaveWindow(leave) : null;
    if (window) await replaceStatusWindow("staff", "leave", window);
    else await removeStatusWindow("staff", "leave", leaveId);
  } catch (error) {
    quietly("a leave request", error);
  }
}

export async function syncAllStatusWindows(now = new Date()) {
  const from = new Date(now.getTime() - DAY);
  const meetingsUntil = new Date(now.getTime() + MEETINGS_AHEAD);
  const leaveUntil = new Date(now.getTime() + LEAVE_AHEAD);
  const [allEvents, allLeaves, employees, leaveTypes] = await Promise.all([
    listTableRows<any>("workflow", "calendar_event").catch(() => []),
    listTableRows<any>("hr", "leave_request").catch(() => []),
    listTableRows<any>("hr", "employee").catch(() => []),
    listTableRows<any>("hr", "leave_type").catch(() => []),
  ]);
  const empMap = new Map<string, any>(employees.map((e): [any, any] => [e.id, e]));
  const ltMap = new Map<string, any>(leaveTypes.map((lt): [any, any] => [lt.id, lt]));
  const meetings = allEvents
    .filter(
      (e) =>
        e.eventType === "meeting" &&
        !e.allDay &&
        new Date(e.endDate || 0) > from &&
        new Date(e.startDate || 0) < meetingsUntil,
    )
    .slice(0, 5000);
  const leave = allLeaves
    .filter(
      (l) =>
        l.status === "approved" &&
        new Date(l.endDate || 0) >= from &&
        new Date(l.startDate || 0) < leaveUntil,
    )
    .slice(0, 5000)
    .map((l) => ({
      ...l,
      employee: empMap.get(l.employeeId) || { userId: null },
      leaveType: ltMap.get(l.leaveTypeId) || { code: "" },
    }));
  const meetingWindows = (meetings || []).map(meetingWindow).filter((w): w is StatusWindowInput => !!w);
  const leaveWindows = (leave || []).map(leaveWindow).filter((w): w is StatusWindowInput => !!w);
  await syncStatusWindows("staff", "calendar", from.toISOString(), meetingsUntil.toISOString(), meetingWindows);
  await syncStatusWindows("staff", "leave", from.toISOString(), leaveUntil.toISOString(), leaveWindows);
  return { meetings: meetingWindows.length, leave: leaveWindows.length };
}
