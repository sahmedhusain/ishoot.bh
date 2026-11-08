import { serverMessages } from "@platform/locales";
import { db } from "../atomic";
import type { Prisma } from "@prisma/client";
import {
  MinuteOfMeetingItem,
  MomAttendee,
  MomDiscussionPoint,
  MomActionItem,
} from "../types";

export function mapPrismaMom(m: any): MinuteOfMeetingItem {
  return {
    id: m.id,
    mom_number: m.momNumber,
    title: m.title,
    title_ar: m.titleAr || undefined,
    meeting_date: m.meetingDate.toISOString().split("T")[0],
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
    created_at: m.createdAt.toISOString(),
    updated_at: m.updatedAt.toISOString(),
  };
}

export async function getMinutesOfMeetings(filters?: {
  status?: string;
  clientId?: string;
  dealId?: string;
  search?: string;
}): Promise<MinuteOfMeetingItem[]> {
  try {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.clientId) where.clientId = filters.clientId;
    if (filters?.dealId) where.dealId = filters.dealId;
    if (filters?.search) {
      where.OR = [
        { momNumber: { contains: filters.search, mode: "insensitive" } },
        { title: { contains: filters.search, mode: "insensitive" } },
        { titleAr: { contains: filters.search, mode: "insensitive" } },
        { agenda: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const moms = await db.minuteOfMeeting.findMany({
      where,
      include: {
        deal: { select: { title: true } },
        client: {
          select: { firstName: true, lastName: true, companyName: true },
        },
        createdBy: { select: { fullName: true } },
        approvedBy: { select: { fullName: true } },
      },
      orderBy: { meetingDate: "desc" },
    });

    return moms.map(mapPrismaMom);
  } catch (error) {
    console.error("Error fetching Minutes of Meetings:", error);
    throw error;
  }
}

export async function getMinuteOfMeetingById(
  id: string,
): Promise<MinuteOfMeetingItem | null> {
  try {
    const mom = await db.minuteOfMeeting.findUnique({
      where: { id },
      include: {
        deal: { select: { title: true } },
        client: {
          select: { firstName: true, lastName: true, companyName: true },
        },
        createdBy: { select: { fullName: true, signatureUrl: true } },
        approvedBy: { select: { fullName: true, signatureUrl: true } },
      },
    });

    return mom ? mapPrismaMom(mom) : null;
  } catch (error) {
    console.error(`Error fetching MOM with id ${id}:`, error);
    throw error;
  }
}

export async function getNextMomNumber(
  client: Prisma.TransactionClient = db,
): Promise<string> {
  const prefix = `MOM-${new Date().getFullYear()}-`;
  const [row] = (await client.$queryRaw<Array<{ next: number }>>`
    SELECT COALESCE(MAX(CAST(substring("momNumber" FROM '[0-9]+$') AS integer)), 0) + 1 AS next
    FROM "MinuteOfMeeting" WHERE "momNumber" LIKE ${`${prefix}%`}
  `) || [];
  return `${prefix}${String(row?.next ?? 1).padStart(3, "0")}`;
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
  const created = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(19041005)::text`;
    const momNumber = await getNextMomNumber(tx);
    return tx.minuteOfMeeting.create({
      data: {
        momNumber,
        title: data.title,
        titleAr: data.titleAr || null,
        meetingDate: new Date(data.meetingDate),
        startTime: data.startTime || null,
        endTime: data.endTime || null,
        location: data.location || null,
        dealId: data.dealId || null,
        clientId: data.clientId || null,
        attendees: (data.attendees || []) as any,
        agenda: data.agenda,
        discussionPoints: (data.discussionPoints || []) as any,
        actionItems: (data.actionItems || []) as any,
        decisions: (data.decisions || []) as any,
        notes: data.notes || null,
        status: data.status || "draft",
        createdById: data.createdById || null,
        signatureUrl: data.signatureUrl || null,
      },
      include: {
        deal: { select: { title: true } },
        client: {
          select: { firstName: true, lastName: true, companyName: true },
        },
        createdBy: { select: { fullName: true } },
        approvedBy: { select: { fullName: true } },
      },
    });
  });
  return mapPrismaMom(created);
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
  try {
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.titleAr !== undefined) updateData.titleAr = data.titleAr;
    if (data.meetingDate !== undefined)
      updateData.meetingDate = new Date(data.meetingDate);
    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.endTime !== undefined) updateData.endTime = data.endTime;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.dealId !== undefined) updateData.dealId = data.dealId;
    if (data.clientId !== undefined) updateData.clientId = data.clientId;
    if (data.attendees !== undefined)
      updateData.attendees = data.attendees as any;
    if (data.agenda !== undefined) updateData.agenda = data.agenda;
    if (data.discussionPoints !== undefined)
      updateData.discussionPoints = data.discussionPoints as any;
    if (data.actionItems !== undefined)
      updateData.actionItems = data.actionItems as any;
    if (data.decisions !== undefined)
      updateData.decisions = data.decisions as any;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.approvedById !== undefined)
      updateData.approvedById = data.approvedById;
    if (data.signatureUrl !== undefined)
      updateData.signatureUrl = data.signatureUrl;
    if (data.pdfStoragePath !== undefined)
      updateData.pdfStoragePath = data.pdfStoragePath;

    const updated = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "MinuteOfMeeting" WHERE id = ${id} FOR UPDATE`;
      const current = await tx.minuteOfMeeting.findUnique({
        where: { id },
        select: { status: true },
      });
      if (!current || ["approved", "shared"].includes(current.status))
        throw new Error(serverMessages.signedMeetingsCannotBeEdited);
      return tx.minuteOfMeeting.update({
        where: { id },
        data: updateData,
        include: {
          deal: { select: { title: true } },
          client: {
            select: { firstName: true, lastName: true, companyName: true },
          },
          createdBy: { select: { fullName: true } },
          approvedBy: { select: { fullName: true } },
        },
      });
    });
    return mapPrismaMom(updated);
  } catch (error) {
    console.error(`Error updating MOM ${id}:`, error);
    throw error;
  }
}

export async function deleteMinuteOfMeeting(id: string): Promise<boolean> {
  try {
    await db.minuteOfMeeting.delete({ where: { id } });
    return true;
  } catch (error) {
    console.error(`Error deleting MOM ${id}:`, error);
    throw error;
  }
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
