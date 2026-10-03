"use server";

import {
  createMinuteOfMeeting,
  updateMinuteOfMeeting,
  deleteMinuteOfMeeting,
  approveAndSignMom,
  getMinuteOfMeetingById,
  createActivityLog,
  MomAttendee,
  MomDiscussionPoint,
  MomActionItem,
} from "@ishoot/database";
import { revalidatePath } from "next/cache";
import { requirePermission, getCurrentUser } from "../../lib/auth";

export async function createMomAction(data: {
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
}) {
  const actor = await requirePermission("deals", "write");
  const user = await getCurrentUser();

  const mom = await createMinuteOfMeeting({
    ...data,
    createdById: user?.id,
    signatureUrl: user?.signature_url || undefined,
  });

  await createActivityLog({
    user_id: actor.id,
    action: "create",
    entity_type: "mom",
    entity_id: mom.id,
    details: { momNumber: mom.mom_number, title: mom.title },
  });

  revalidatePath("/dashboard/moms");
  return { success: true, mom };
}

export async function updateMomAction(
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
  }>
) {
  const actor = await requirePermission("deals", "write");

  const mom = await updateMinuteOfMeeting(id, data);

  await createActivityLog({
    user_id: actor.id,
    action: "update",
    entity_type: "mom",
    entity_id: id,
    details: { updatedFields: Object.keys(data) },
  });

  revalidatePath("/dashboard/moms");
  revalidatePath(`/dashboard/moms/${id}`);
  return { success: true, mom };
}

export async function deleteMomAction(id: string) {
  const actor = await requirePermission("deals", "delete");

  await deleteMinuteOfMeeting(id);

  await createActivityLog({
    user_id: actor.id,
    action: "delete",
    entity_type: "mom",
    entity_id: id,
  });

  revalidatePath("/dashboard/moms");
  return { success: true };
}

export async function approveAndSignMomAction(id: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("User must be authenticated to approve and sign documents");
  }

  const signatureUrl = user.signature_url || "/brand/signature.svg";
  const mom = await approveAndSignMom(id, user.id, signatureUrl);

  await createActivityLog({
    user_id: user.id,
    action: "approve",
    entity_type: "mom",
    entity_id: id,
    details: { signedBy: user.full_name, signatureUrl },
  });

  revalidatePath("/dashboard/moms");
  revalidatePath(`/dashboard/moms/${id}`);
  return { success: true, mom };
}

export async function shareMomViaEmailAction(id: string, recipientEmail: string) {
  const user = await getCurrentUser();
  const mom = await getMinuteOfMeetingById(id);
  if (!mom) throw new Error("MOM not found");

  await createActivityLog({
    user_id: user?.id || "system",
    action: "export",
    entity_type: "mom",
    entity_id: id,
    details: { channel: "email", recipient: recipientEmail },
  });

  return { success: true, message: `MOM ${mom.mom_number} shared with ${recipientEmail}` };
}
