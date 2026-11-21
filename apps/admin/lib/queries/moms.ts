import { serverMessages } from "@platform/locales";
import { listTableRows } from "../api/tables";
import {
  MinuteOfMeetingItem,
  MomAttendee,
  MomDiscussionPoint,
  MomActionItem,
} from "../types";

const toIso = (val: unknown): string => {
  if (!val) return new Date().toISOString();
  const d = val instanceof Date ? val : new Date(String(val));
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

export function mapDatabaseMom(m: any): MinuteOfMeetingItem {
  return {
    id: m.id,
    mom_number: m.momNumber,
    title: m.title,
    title_ar: m.titleAr || undefined,
    meeting_date: toIso(m.meetingDate).split("T")[0],
    start_time: m.startTime || undefined,
    end_time: m.endTime || undefined,
    location: m.location || undefined,
    deal_id: m.dealId || undefined,
    deal_title: m.deal?.title || undefined,
    client_id: m.clientId || undefined,
    client_name: m.client
      ? `${m.client.firstName} ${m.client.lastName || ""}`.trim() ||
        m.client.companyName ||
        undefined
      : undefined,
    attendees: (m.attendees as MomAttendee[]) || [],
    agenda: m.agenda,
    discussion_points: (m.discussionPoints as MomDiscussionPoint[]) || [],
    action_items: (m.actionItems as MomActionItem[]) || [],
    decisions: (m.decisions as string[]) || [],
    notes: m.notes || undefined,
    status: (m.status as any) || "draft",
    created_by_id: m.createdById || undefined,
    created_by_name: m.createdBy?.fullName || undefined,
    approved_by_id: m.approvedById || undefined,
    approved_by_name: m.approvedBy?.fullName || undefined,
    signature_url: m.signatureUrl || undefined,
    pdf_storage_path: m.pdfStoragePath || undefined,
    created_at: toIso(m.createdAt),
    updated_at: toIso(m.updatedAt),
  };
}

export async function getMinutesOfMeetings(filters?: {
  status?: string;
  clientId?: string;
  dealId?: string;
  projectId?: string;
  departmentId?: string;
  teamId?: string;
  search?: string;
}): Promise<MinuteOfMeetingItem[]> {
  try {
    const { listMOMs } = await import("../api/workflow");
    const apiMoms = await listMOMs({
      status: filters?.status,
      clientId: filters?.clientId,
      dealId: filters?.dealId,
      projectId: filters?.projectId,
      departmentId: filters?.departmentId,
      teamId: filters?.teamId,
    });
    let mapped = (apiMoms || []).map(mapApiMomToItem);
    if (filters?.status) mapped = mapped.filter((m) => m.status === filters.status);
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      mapped = mapped.filter(
        (m) =>
          m.title.toLowerCase().includes(s) ||
          (m.title_ar && m.title_ar.toLowerCase().includes(s)) ||
          m.mom_number.toLowerCase().includes(s) ||
          (m.agenda && m.agenda.toLowerCase().includes(s)),
      );
    }
    return mapped;
  } catch (e) {
    console.warn("api-client listMOMs failed:", e);
    return [];
  }
}

export async function getMinuteOfMeetingById(
  id: string,
): Promise<MinuteOfMeetingItem | null> {
  try {
    const { getMOM, listMOMs } = await import("../api/workflow");
    let mom = await getMOM(id).catch(() => null);
    if (!mom) {
      const all = await listMOMs().catch(() => []);
      const matched: any = (all || []).find(
        (m: any) =>
          (m.id || m.ID) === id || (m.momNumber || m.MomNumber) === id,
      );
      if (matched) {
        mom = await getMOM(matched.id || matched.ID).catch(() => null);
      }
    }
    if (mom) {
      return mapApiMomToItem(mom);
    }
  } catch (e) {
    console.warn(`api-client getMOM ${id} failed:`, e);
  }

  try {
    const rows = await listTableRows<any>("workflow", "minute_of_meeting");
    const mom = rows.find((r) => r.id === id || r.momNumber === id);
    return mom ? mapApiMomToItem(mom) : null;
  } catch (error) {
    console.error(`Error fetching MOM with id ${id}:`, error);
    return null;
  }
}

function mapApiMomToItem(m: any): MinuteOfMeetingItem {
  let actionItems: any[] = [];
  try {
    const rawAction = m.actionItems ?? m.ActionItems;
    if (rawAction) {
      const parsed = typeof rawAction === "string" ? JSON.parse(rawAction) : rawAction;
      actionItems = Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    actionItems = [];
  }

  const rawAttendees = m.attendees ?? m.Attendees ?? [];
  const attendeesList = Array.isArray(rawAttendees)
    ? rawAttendees.map((att: any) => {
        if (typeof att === "string") {
          try {
            if (att.startsWith("{")) return JSON.parse(att);
          } catch {}
          return { name: att, attended: true };
        }
        return att;
      })
    : [];

  return {
    id: m.id || m.ID,
    mom_number: m.momNumber || m.MomNumber || m.id,
    title: m.title || m.Title || "",
    meeting_date: (m.meetingDate || m.MeetingDate || new Date().toISOString()).slice(0, 10),
    attendees: attendeesList,
    agenda: m.discussion || m.Discussion || "",
    discussion_points: [
      {
        topic: m.title || m.Title || "",
        notes: m.discussion || m.Discussion || "",
      },
    ],
    action_items: actionItems,
    decisions: [],
    status: (m.status || m.Status || "draft") as any,
    created_at: m.createdAt || m.CreatedAt || new Date().toISOString(),
    updated_at: m.createdAt || m.CreatedAt || new Date().toISOString(),
  };
}

export async function getNextMomNumber(): Promise<string> {
  const prefix = `MOM-${new Date().getFullYear()}-`;
  const rows = await listTableRows<any>("workflow", "minute_of_meeting").catch(() => []);
  let maxNum = 0;
  for (const r of rows) {
    const numStr = String(r.momNumber || "");
    if (numStr.startsWith(prefix)) {
      const m = numStr.match(/(\d+)$/);
      if (m) maxNum = Math.max(maxNum, Number(m[1]));
    }
  }
  return `${prefix}${String(maxNum + 1).padStart(3, "0")}`;
}

function mapMomPayload(data: {
  title?: string;
  titleAr?: string;
  meetingDate?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  dealId?: string;
  clientId?: string;
  projectId?: string;
  departmentId?: string;
  teamId?: string;
  organizerId?: string;
  attendees?: MomAttendee[];
  agenda?: string;
  discussionPoints?: MomDiscussionPoint[];
  actionItems?: MomActionItem[];
  decisions?: string[];
  notes?: string;
  status?: string;
  createdById?: string;
  approvedById?: string;
  signatureUrl?: string;
  pdfStoragePath?: string;
}) {
  const discussionText =
    data.discussionPoints !== undefined
      ? JSON.stringify(data.discussionPoints || [])
      : undefined;
  const attendeeNames = data.attendees
    ?.map((a) => a.name.trim())
    .filter(Boolean);
  const attendeeRecords = data.attendees
    ?.filter((a) => a.name.trim() !== "")
    .map((a) => ({
      attendeeType:
        a.attendeeType ||
        (a.employeeId ? "employee" : a.contactId ? "client" : "external"),
      employeeId: a.employeeId || null,
      contactId: a.contactId || null,
      displayName: a.name.trim(),
      email: a.email || null,
      roleTitle: a.role || null,
      attended: Boolean(a.attended),
    }));
  const actionItemRecords = data.actionItems
    ?.filter((item) => item.task.trim() !== "")
    .map((item) => ({
      id: item.id || undefined,
      taskId: item.taskId || null,
      title: item.task.trim(),
      description: item.assignee ? `Assignee: ${item.assignee}` : null,
      assigneeEmployeeId: item.assigneeEmployeeId || null,
      assigneeUserId: item.assigneeUserId || null,
      departmentId: item.departmentId || data.departmentId || null,
      dueDate: item.dueDate
        ? item.dueDate.includes("T")
          ? item.dueDate
          : `${item.dueDate}T00:00:00Z`
        : null,
      status: item.status || "pending",
      createTask: true,
    }));

  return {
    title: data.title,
    titleAr: data.titleAr || null,
    meetingDate: data.meetingDate
      ? data.meetingDate.slice(0, 10)
      : undefined,
    startTime: data.startTime || null,
    endTime: data.endTime || null,
    location: data.location || null,
    dealId: data.dealId || null,
    clientId: data.clientId || null,
    projectId: data.projectId || null,
    departmentId: data.departmentId || null,
    teamId: data.teamId || null,
    organizerId: data.organizerId || null,
    createdById: data.createdById || null,
    approvedById: data.approvedById || null,
    attendees: attendeeNames ?? [],
    agenda: data.agenda ?? "",
    discussion: discussionText ?? "",
    actionItems:
      data.actionItems !== undefined
        ? JSON.stringify(data.actionItems)
        : null,
    decisions: data.decisions ?? [],
    notes: data.notes || null,
    status: data.status || "draft",
    signatureUrl: data.signatureUrl || null,
    pdfStoragePath: data.pdfStoragePath || null,
    attendeeRecords: attendeeRecords ?? [],
    actionItemRecords: actionItemRecords ?? [],
  };
}

export async function createMinuteOfMeeting(data: {
  title: string;
  titleAr?: string;
  meetingDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  dealId?: string;
  clientId?: string;
  projectId?: string;
  departmentId?: string;
  teamId?: string;
  organizerId?: string;
  attendees: MomAttendee[];
  agenda: string;
  discussionPoints: MomDiscussionPoint[];
  actionItems: MomActionItem[];
  decisions?: string[];
  notes?: string;
  status?: string;
  createdById?: string;
  signatureUrl?: string;
}): Promise<MinuteOfMeetingItem> {
  const { createMOM } = await import("../api/workflow");
  const payload = mapMomPayload({
    ...data,
    meetingDate: data.meetingDate || new Date().toISOString().slice(0, 10),
    status: data.status || "draft",
  });
  const created = await createMOM({
    ...payload,
    momNumber: `MOM-${Date.now()}`,
  });
  return mapApiMomToItem(created);
}

export async function updateMinuteOfMeeting(
  id: string,
  data: Partial<{
    title: string;
    titleAr?: string;
    meetingDate: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    dealId?: string;
    clientId?: string;
    projectId?: string;
    departmentId?: string;
    teamId?: string;
    organizerId?: string;
    attendees: MomAttendee[];
    agenda: string;
    discussionPoints: MomDiscussionPoint[];
    actionItems: MomActionItem[];
    decisions?: string[];
    notes?: string;
    status?: string;
    approvedById?: string;
    signatureUrl?: string;
    pdfStoragePath?: string;
  }>,
): Promise<MinuteOfMeetingItem | null> {
  const { getMOM, updateMOM } = await import("../api/workflow");
  const existing = await getMOM(id).catch(() => null);
  if (!existing) throw new Error(serverMessages.signedMeetingsCannotBeEdited);
  if (["approved", "shared"].includes(existing.status) && !data.approvedById) {
    throw new Error(serverMessages.signedMeetingsCannotBeEdited);
  }
  const current = mapApiMomToItem(existing);
  const payload = mapMomPayload({
    title: data.title ?? current.title,
    titleAr: data.titleAr !== undefined ? data.titleAr : current.title_ar,
    meetingDate: data.meetingDate ?? current.meeting_date,
    startTime: data.startTime !== undefined ? data.startTime : current.start_time,
    endTime: data.endTime !== undefined ? data.endTime : current.end_time,
    location: data.location !== undefined ? data.location : current.location,
    dealId: data.dealId !== undefined ? data.dealId : current.deal_id,
    clientId: data.clientId !== undefined ? data.clientId : current.client_id,
    projectId: data.projectId !== undefined ? data.projectId : current.project_id,
    departmentId: data.departmentId !== undefined ? data.departmentId : current.department_id,
    teamId: data.teamId !== undefined ? data.teamId : current.team_id,
    organizerId: data.organizerId !== undefined ? data.organizerId : current.organizer_id,
    attendees: data.attendees ?? current.attendees,
    agenda: data.agenda ?? current.agenda,
    discussionPoints: data.discussionPoints ?? current.discussion_points,
    actionItems: data.actionItems ?? current.action_items,
    decisions: data.decisions ?? current.decisions,
    notes: data.notes !== undefined ? data.notes : current.notes,
    status: data.status ?? current.status,
    approvedById: data.approvedById ?? current.approved_by_id,
    signatureUrl: data.signatureUrl !== undefined ? data.signatureUrl : current.signature_url,
    pdfStoragePath: data.pdfStoragePath !== undefined ? data.pdfStoragePath : current.pdf_storage_path,
  });
  const updated = await updateMOM(id, {
    ...payload,
    replaceRelations:
      data.attendees !== undefined || data.actionItems !== undefined,
  });
  return updated ? mapApiMomToItem(updated) : null;
}

export async function deleteMinuteOfMeeting(id: string): Promise<boolean> {
  const { deleteMOM } = await import("../api/workflow");
  await deleteMOM(id);
  return true;
}

export async function approveAndSignMom(
  id: string,
  userId: string,
  signatureUrl: string,
): Promise<MinuteOfMeetingItem | null> {
  return updateMinuteOfMeeting(id, {
    status: "approved",
    approvedById: userId,
    signatureUrl,
  });
}
