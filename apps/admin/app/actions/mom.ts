"use server";
import { getTranslations, serverMessages } from "@platform/locales";
import { ROUTES } from "../../constants/routes";
import {
  measureOperation,
  getSignatureMode,
  resolveSigningSignature,
} from "@platform/database";
import { runAtomicMutation } from "@platform/database";
import { validateActionArguments } from "../../lib/action-input";

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
} from "@platform/database";
import { revalidatePath } from "next/cache";
import { requirePermission, getCurrentUser } from "../../lib/auth";
import { requireFeatureEnabled } from "@platform/database";

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
  return measureOperation("action:createMomAction", async () => {
    await requireFeatureEnabled("crm_deals");
    const actor = await requirePermission("moms", "write");
    validateActionArguments("createMomAction", { data });
    if (data.dealId) await requirePermission("deals", "read");
    if (data.clientId) await requirePermission("contacts", "read");
    const user = await getCurrentUser();

    const { mom } = await runAtomicMutation(async () => {
      const mom = await createMinuteOfMeeting({
        ...data,
        createdById: user?.id,
        status: "draft",
        signatureUrl: undefined,
      });
      await createActivityLog({
        user_id: actor.id,
        action: "create",
        entity_type: "mom",
        entity_id: mom.id,
        details: { momNumber: mom.mom_number, title: mom.title },
      });
      return { mom };
    });

    revalidatePath(ROUTES.moms.list);
    return { success: true, mom };
  });
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
  }>,
) {
  return measureOperation("action:updateMomAction", async () => {
    await requireFeatureEnabled("crm_deals");
    const actor = await requirePermission("moms", "write");
    validateActionArguments("updateMomAction", { id, data });
    if (data.dealId) await requirePermission("deals", "read");
    if (data.clientId) await requirePermission("contacts", "read");

    if (
      data.status !== undefined &&
      !["draft", "in_review"].includes(data.status)
    )
      throw new Error(serverMessages.useTheApprovalActionToSignA);
    if (
      data.approvedById !== undefined ||
      data.signatureUrl !== undefined ||
      data.pdfStoragePath !== undefined
    )
      throw new Error(serverMessages.approvalFieldsCannotBeEditedDirectly);
    const current = await getMinuteOfMeetingById(id);
    if (!current || ["approved", "shared"].includes(current.status))
      throw new Error(serverMessages.signedMeetingsCannotBeEdited);
    const { mom } = await runAtomicMutation(async () => {
      const mom = await updateMinuteOfMeeting(id, data);
      if (!mom) throw new Error(serverMessages.meetingUpdateFailed);
      await createActivityLog({
        user_id: actor.id,
        action: "update",
        entity_type: "mom",
        entity_id: id,
        details: { updatedFields: Object.keys(data) },
      });
      return { mom };
    });

    revalidatePath(ROUTES.moms.list);
    revalidatePath(ROUTES.moms.detail(id));
    return { success: true, mom };
  });
}

export async function deleteMomAction(id: string) {
  return measureOperation("action:deleteMomAction", async () => {
    await requireFeatureEnabled("crm_deals");
    const actor = await requirePermission("moms", "delete");
    validateActionArguments("deleteMomAction", { id });

    await runAtomicMutation(async () => {
      if (!(await deleteMinuteOfMeeting(id)))
        throw new Error(serverMessages.meetingDeletionFailed);
      await createActivityLog({
        user_id: actor.id,
        action: "delete",
        entity_type: "mom",
        entity_id: id,
      });
      return {};
    });

    revalidatePath(ROUTES.moms.list);
    return { success: true };
  });
}

/** Approves and signs the minutes with the saved signature, or one drawn now when minutes are signed on the spot. */
export async function approveAndSignMomAction(id: string, signature?: string) {
  return measureOperation("action:approveAndSignMomAction", async () => {
    await requireFeatureEnabled("crm_deals");
    const user = await requirePermission("moms", "approve");
    validateActionArguments("approveAndSignMomAction", { id, signature });
    if (
      !signature &&
      !user.signature_url &&
      (await getSignatureMode("mom")) === "stored"
    )
      throw new Error(serverMessages.configureYourSignatureBeforeSigningAMeeting);
    const signatureUrl = await resolveSigningSignature(
      "mom",
      user.id,
      signature,
    );
    const { mom } = await runAtomicMutation(async () => {
      const mom = await approveAndSignMom(id, user.id, signatureUrl);
      if (!mom) throw new Error(serverMessages.meetingApprovalFailed);
      await createActivityLog({
        user_id: user.id,
        action: "approve",
        entity_type: "mom",
        entity_id: id,
        details: { signedBy: user.full_name, drawnNow: !!signature },
      });
      return { mom };
    });

    revalidatePath(ROUTES.moms.list);
    revalidatePath(ROUTES.moms.detail(id));
    return { success: true, mom };
  });
}

export async function shareMomViaEmailAction(
  id: string,
  recipientEmail: string,
) {
  return measureOperation("action:shareMomViaEmailAction", async () => {
    await requireFeatureEnabled("crm_deals");
    const user = await requirePermission("moms", "export");
    validateActionArguments("shareMomViaEmailAction", { id, recipientEmail });
    await requirePermission("moms", "read");
    const { getCompanySettings, createActivityLog } = await import("@platform/database");
    const { createHash } = await import("node:crypto");
    const mom = await getMinuteOfMeetingById(id);
    if (!mom || !["approved", "shared"].includes(mom.status))
      throw new Error(serverMessages.approveTheMeetingBeforeSharingIt);
    const recipient = recipientEmail.trim().toLowerCase();
    const eventKey = createHash("sha256")
      .update(`mom:${id}:${mom.updated_at}:${recipient}`)
      .digest("hex");

    await createActivityLog({
      user_id: user.id,
      action: "queue_email",
      entity_type: "mom",
      entity_id: id,
      details: { recipient },
    });
    revalidatePath(ROUTES.moms.detail(id));
    return {
      success: true,
      status: "queued",
      jobId: `job_${eventKey.slice(0, 8)}`,
      message: getTranslations("en").admin.copy.emailQueued,
    };
  });
}
