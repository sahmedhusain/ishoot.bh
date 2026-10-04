"use server";
import { measureOperation, runAtomicMutation } from "@ishoot/database";
import { validateActionArguments } from "../../lib/action-input";
import {
  requestProfileChange,
  submitForApproval,
  findPendingApproval,
  decideApprovalRequest,
  cancelPendingApprovals,
  db,
  createActivityLog,
  claimUpload,
} from "@ishoot/database";
import { revalidatePath } from "next/cache";
import { requireAuth } from "../../lib/auth";

export async function updateMyProfileAction(data: {
  phone?: string;
  signature_url?: string;
}): Promise<{ success: boolean; user?: any }> {
  return measureOperation("action:updateMyProfileAction", async () => {
    const user = await requireAuth();
    validateActionArguments("updateMyProfileAction", { data });

    const { updatedUser } = await runAtomicMutation(async () => {
      // Validate signature url if provided
      if (data.signature_url && data.signature_url.startsWith("/api/files/")) {
        const upload = await db.uploadObject.findUnique({ where: { fileUrl: data.signature_url } });
        if (
          !upload ||
          upload.isPublic ||
          !["image/png", "image/jpeg", "image/webp"].includes(upload.mimeType)
        ) {
          throw new Error("Choose a private signature image uploaded by you");
        }
        await claimUpload(db, data.signature_url, user.id);
        await db.attachment.create({
          data: {
            entityType: "user_signature",
            entityId: user.id,
            fileUrl: data.signature_url,
            fileName: upload.fileName,
            fileSize: upload.fileSize,
            mimeType: upload.mimeType,
          },
        });
      }

      const updated = await db.user.update({
        where: { id: user.id },
        data: {
          phone: data.phone,
          signatureUrl: data.signature_url,
        },
      });

      await createActivityLog({
        user_id: user.id,
        action: "update",
        entity_type: "profile",
        entity_id: user.id,
        details: { updatedFields: Object.keys(data) },
      });

      return { updatedUser: updated };
    });

    revalidatePath("/dashboard/profile");
    return { success: true, user: updatedUser };
  });
}

export async function requestIdentityChangeAction(data: {
  fullName?: string;
  email?: string;
  reason?: string;
}) {
  return measureOperation("action:requestIdentityChangeAction", async () => {
    const user = await requireAuth();
    validateActionArguments("requestIdentityChangeAction", { data });

    if (!data.fullName && !data.email) {
      throw new Error("Must provide either a new name or a new email");
    }

    const { changeRequest, approval } = await runAtomicMutation(async () => {
      // A new request supersedes earlier pending ones, so withdraw their approvals too.
      const superseded = await db.profileChangeRequest.findMany({
        where: { userId: user.id, status: "pending" },
        select: { id: true },
      });
      for (const { id } of superseded) await cancelPendingApprovals("profile_change", id);
      const changeRequest = await requestProfileChange(
        user.id,
        {
          ...(data.fullName ? { fullName: data.fullName.trim() } : {}),
          ...(data.email ? { email: data.email.trim().toLowerCase() } : {}),
        },
        user.id,
      );

      await createActivityLog({
        user_id: user.id,
        action: "request_change",
        entity_type: "profile_change_request",
        entity_id: changeRequest.id,
        details: { newValues: changeRequest.newValues },
      });
      const approval = await submitForApproval({
        targetType: "profile_change",
        targetId: changeRequest.id,
        requesterId: user.id,
        diffPayload: { before: changeRequest.oldValues, after: changeRequest.newValues },
      });

      return { changeRequest, approval };
    });

    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard/approvals");
    return { success: true, changeRequest, approvalStatus: approval.status };
  });
}

export async function decideProfileChangeAction(
  requestId: string,
  decision: "approved" | "rejected",
  notes?: string,
) {
  return measureOperation("action:decideProfileChangeAction", async () => {
    const actor = await requireAuth();
    validateActionArguments("decideProfileChangeAction", { requestId, decision, notes });

    const { outcome } = await runAtomicMutation(async () => {
      const pending = await findPendingApproval("profile_change", requestId);
      if (!pending) throw new Error("This profile change has no pending approval");
      const outcome = await decideApprovalRequest(pending.id, actor.id, decision, notes);

      await createActivityLog({
        user_id: actor.id,
        action: `profile_change_${decision}`,
        entity_type: "profile_change_request",
        entity_id: requestId,
        details: { decision, notes, approvalStatus: outcome.status },
      });

      return { outcome };
    });

    revalidatePath("/dashboard/approvals");
    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard/users");
    return { success: true, approvalStatus: outcome.status };
  });
}
