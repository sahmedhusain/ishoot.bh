import { isValidEmail } from "../constants/validation";
import {
  serverTemplates,
  formatMessage,
  serverMessages,
} from "@platform/locales";

import { db } from "../db";
import { ProfileChangeRequest } from "../types";
import { assertActorNotOnLeave } from "./leave";

export async function requestProfileChange(
  userId: string,
  proposed: { fullName?: string; email?: string },
  requestedById: string,
): Promise<ProfileChangeRequest> {
  await assertActorNotOnLeave(requestedById);

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, fullName: true, email: true, managerId: true },
  });

  if (!user) throw new Error(serverMessages.userNotFound);

  if (
    proposed.fullName !== undefined &&
    (!proposed.fullName.trim() || proposed.fullName.trim().length > 150)
  )
    throw new Error(serverMessages.profileSecurityError7);
  if (
    proposed.email !== undefined &&
    (!isValidEmail(proposed.email.trim()) ||
      proposed.email.trim().length > 254)
  )
    throw new Error(serverMessages.enterAValidEMailAddress);
  if (
    (!proposed.fullName || proposed.fullName.trim() === user.fullName) &&
    (!proposed.email ||
      proposed.email.trim().toLowerCase() === user.email.toLowerCase())
  )
    throw new Error(serverMessages.profileSecurityError8);

  // Check email uniqueness if email is changing
  if (
    proposed.email &&
    proposed.email.toLowerCase().trim() !== user.email.toLowerCase().trim()
  ) {
    const existing = await db.user.findUnique({
      where: { email: proposed.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new Error(serverMessages.theProposedEmailIsAlreadyInUse);
    }
  }

  const oldValues = {
    fullName: user.fullName,
    email: user.email,
  };

  const newValues = {
    fullName: proposed.fullName?.trim() || user.fullName,
    email: proposed.email?.toLowerCase().trim() || user.email,
  };

  // Supersede previous pending profile changes
  await db.profileChangeRequest.updateMany({
    where: { userId, status: "pending" },
    data: { status: "cancelled" },
  });

  const request = await db.profileChangeRequest.create({
    data: {
      userId,
      requestedById,
      managerId: user.managerId || null,
      status: "pending",
      oldValues,
      newValues,
    },
  });

  return {
    ...request,
    oldValues: request.oldValues as any,
    newValues: request.newValues as any,
    reviewedAt: request.reviewedAt?.toISOString() || null,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}

/** Applies an approval decided by the approval engine (which enforces who may decide). */
export async function approveProfileChange(
  requestId: string,
  deciderId: string,
  notes?: string,
): Promise<{ success: boolean; request: ProfileChangeRequest }> {
  await assertActorNotOnLeave(deciderId);

  const req = await db.profileChangeRequest.findUnique({
    where: { id: requestId },
    include: {
      user: {
        select: { id: true, managerId: true, fullName: true, email: true },
      },
    },
  });

  if (!req) throw new Error(serverMessages.profileChangeRequestNotFound);
  if (req.status !== "pending") {
    throw new Error(
      formatMessage(
        serverTemplates.profileChangeRequestCannotBeApprovedCurrent,
        { 0: req.status },
      ),
    );
  }

  const newVals = req.newValues as { fullName?: string; email?: string };

  const updated = await db.$transaction(async (tx) => {
    // Check email uniqueness again inside the transaction
    if (newVals.email && newVals.email !== req.user.email) {
      const emailConflict = await tx.user.findFirst({
        where: { email: newVals.email, id: { not: req.userId } },
      });
      if (emailConflict) {
        throw new Error(serverMessages.emailConflictTheProposedEmailWasClaimed);
      }
    }

    // Update the user's active login identity
    await tx.user.update({
      where: { id: req.userId },
      data: {
        fullName: newVals.fullName || undefined,
        email: newVals.email || undefined,
      },
    });

    // Update employee record if linked
    await tx.employee.updateMany({
      where: { userId: req.userId },
      data: {
        email: newVals.email || undefined,
      },
    });

    const approvedReq = await tx.profileChangeRequest.update({
      where: { id: requestId },
      data: {
        status: "approved",
        reviewedAt: new Date(),
        reviewNotes: notes || null,
      },
    });

    return approvedReq;
  });

  return {
    success: true,
    request: {
      ...updated,
      oldValues: updated.oldValues as any,
      newValues: updated.newValues as any,
      reviewedAt: updated.reviewedAt?.toISOString() || null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  };
}

/** Applies a rejection decided by the approval engine. */
export async function rejectProfileChange(
  requestId: string,
  deciderId: string,
  reason: string,
): Promise<ProfileChangeRequest> {
  await assertActorNotOnLeave(deciderId);

  const req = await db.profileChangeRequest.findUnique({
    where: { id: requestId },
  });

  if (!req) throw new Error(serverMessages.profileChangeRequestNotFound);
  if (req.status !== "pending")
    throw new Error(serverMessages.requestIsNotPending);

  const updated = await db.profileChangeRequest.update({
    where: { id: requestId },
    data: {
      status: "rejected",
      reviewedAt: new Date(),
      reviewNotes: reason,
    },
  });

  return {
    ...updated,
    oldValues: updated.oldValues as any,
    newValues: updated.newValues as any,
    reviewedAt: updated.reviewedAt?.toISOString() || null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function getPendingProfileChangesForManager(
  managerId: string,
): Promise<ProfileChangeRequest[]> {
  const requests = await db.profileChangeRequest.findMany({
    where: {
      status: "pending",
      OR: [{ managerId }, { user: { managerId } }],
    },
    include: {
      user: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return requests.map((r) => ({
    ...r,
    oldValues: r.oldValues as any,
    newValues: r.newValues as any,
    reviewedAt: r.reviewedAt?.toISOString() || null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getProfileChangeRequestsForUser(
  userId: string,
): Promise<ProfileChangeRequest[]> {
  const requests = await db.profileChangeRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return requests.map((r) => ({
    ...r,
    oldValues: r.oldValues as any,
    newValues: r.newValues as any,
    reviewedAt: r.reviewedAt?.toISOString() || null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}
