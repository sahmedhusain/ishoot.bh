"use server";
import { ROUTES } from "../../constants/routes";
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
  requestSignatureChange,
  cancelSignatureChange,
} from "@ishoot/database";
import { revalidatePath } from "next/cache";
import { requireAuth } from "../../lib/auth";

export async function updateMyProfileAction(data: {
  phone?: string;
}): Promise<{ success: boolean; user?: any }> {
  return measureOperation("action:updateMyProfileAction", async () => {
    const user = await requireAuth();
    validateActionArguments("updateMyProfileAction", { data });

    const { updatedUser } = await runAtomicMutation(async () => {
      const updated = await db.user.update({
        where: { id: user.id },
        data: { phone: data.phone },
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

    revalidatePath(ROUTES.profile());
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

    revalidatePath(ROUTES.profile());
    revalidatePath(ROUTES.approvals());
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

    revalidatePath(ROUTES.approvals());
    revalidatePath(ROUTES.profile());
    revalidatePath(ROUTES.users.list);
    return { success: true, approvalStatus: outcome.status };
  });
}

/** Submit a signature drawn on the pad; it replaces the current one only once approved. */
export async function requestSignatureChangeAction(fileUrl: string) {
  return measureOperation("action:requestSignatureChangeAction", async () => {
    const user = await requireAuth();
    validateActionArguments("requestSignatureChangeAction", { fileUrl });
    const result = await runAtomicMutation(async () => {
      const change = await requestSignatureChange(user.id, fileUrl);
      const approval = await submitForApproval({ targetType: "signature_change", targetId: change.id, requesterId: user.id, policySnapshot: { previous: change.previousUrl ? "replaced" : "first" } });
      await createActivityLog({ user_id: user.id, action: "request", entity_type: "signature_change", entity_id: change.id, details: { approvalStatus: approval.status } });
      return { change, approvalStatus: approval.status };
    });
    revalidatePath(ROUTES.profile());
    revalidatePath(ROUTES.approvals());
    return { success: true, ...result };
  });
}

export async function cancelSignatureChangeAction(id: string) {
  return measureOperation("action:cancelSignatureChangeAction", async () => {
    const user = await requireAuth();
    validateActionArguments("cancelSignatureChangeAction", { id });
    await runAtomicMutation(async () => {
      await cancelSignatureChange(id, user.id);
      await createActivityLog({ user_id: user.id, action: "cancel", entity_type: "signature_change", entity_id: id });
    });
    revalidatePath(ROUTES.profile());
    return { success: true };
  });
}
