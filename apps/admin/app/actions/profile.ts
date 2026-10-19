"use server";
import { serverMessages } from "@ishoot/locales";
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
  phone?: string | null;
}): Promise<{ success: boolean }> {
  return measureOperation("action:updateMyProfileAction", async () => {
    const user = await requireAuth();
    validateActionArguments("updateMyProfileAction", { data });
    if (data.phone === undefined) return { success: true };

    await runAtomicMutation(async () => {
      const phone = data.phone?.trim() || null;
      if (phone && (phone.length > 40 || !/^[+0-9() .-]+$/.test(phone)))
        throw new Error(serverMessages.profilePhoneInvalid);
      await db.user.update({
        where: { id: user.id },
        data: { phone },
        select: { id: true },
      });

      await createActivityLog({
        user_id: user.id,
        action: "update",
        entity_type: "profile",
        entity_id: user.id,
        details: { updatedFields: Object.keys(data) },
      });

      await db.employee.updateMany({
        where: { userId: user.id },
        data: { phone },
      });
    });

    revalidatePath(ROUTES.profile());
    return { success: true };
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
      throw new Error(serverMessages.mustProvideEitherANewNameOr);
    }

    const { changeRequest, approval } = await runAtomicMutation(async () => {
      // A new request supersedes earlier pending ones, so withdraw their approvals too.
      const superseded = await db.profileChangeRequest.findMany({
        where: { userId: user.id, status: "pending" },
        select: { id: true },
      });
      for (const { id } of superseded)
        await cancelPendingApprovals("profile_change", id);
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
        // The reason travels with the request so the approver sees why the name or e-mail changes.
        diffPayload: {
          before: changeRequest.oldValues,
          after: changeRequest.newValues,
          reason: data.reason?.trim().slice(0, 500) || null,
        },
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
    validateActionArguments("decideProfileChangeAction", {
      requestId,
      decision,
      notes,
    });

    const { outcome } = await runAtomicMutation(async () => {
      const pending = await findPendingApproval("profile_change", requestId);
      if (!pending)
        throw new Error(serverMessages.thisProfileChangeHasNoPendingApproval);
      const outcome = await decideApprovalRequest(
        pending.id,
        actor.id,
        decision,
        notes,
      );

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
      const approval = await submitForApproval({
        targetType: "signature_change",
        targetId: change.id,
        requesterId: user.id,
        policySnapshot: { previous: change.previousUrl ? "replaced" : "first" },
      });
      await createActivityLog({
        user_id: user.id,
        action: "request",
        entity_type: "signature_change",
        entity_id: change.id,
        details: { approvalStatus: approval.status },
      });
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
      await createActivityLog({
        user_id: user.id,
        action: "cancel",
        entity_type: "signature_change",
        entity_id: id,
      });
    });
    revalidatePath(ROUTES.profile());
    return { success: true };
  });
}

/** Withdraw only the signed-in person's pending identity edit and its approval. */
export async function cancelMyProfileChangeAction(id: string) {
  validateActionArguments("cancelMyProfileChangeAction", { id });
  const user = await requireAuth();
  await runAtomicMutation(async () => {
    await db.$queryRaw`SELECT id FROM "ProfileChangeRequest" WHERE id=${id} FOR UPDATE`;
    const request = await db.profileChangeRequest.findUnique({
      where: { id },
      select: { userId: true, status: true },
    });
    if (!request || request.userId !== user.id)
      throw new Error(serverMessages.profileChangeRequestNotFound);
    if (request.status !== "pending")
      throw new Error(serverMessages.profileSecurityError6);
    await cancelPendingApprovals("profile_change", id);
    await db.profileChangeRequest.update({
      where: { id },
      data: { status: "cancelled" },
    });
    await createActivityLog({
      user_id: user.id,
      action: "cancel",
      entity_type: "profile_change_request",
      entity_id: id,
    });
  });
  revalidatePath(ROUTES.profile());
  revalidatePath(ROUTES.approvals());
}
