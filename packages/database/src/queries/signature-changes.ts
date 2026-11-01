import {
  serverTemplates,
  formatMessage,
  serverMessages,
} from "@platform/locales";

import { db, runAtomicMutation } from "../db";
import { lookupFile } from "@platform/api-client";
import { claimUpload } from "../services/uploads";

export interface SignatureChangeRow {
  id: string;
  signatureUrl: string;
  previousUrl: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  reviewedBy: string | null;
  reviewNotes: string | null;
  decidedAt: string | null;
  createdAt: string;
}

const map = (c: {
  id: string;
  signatureUrl: string;
  previousUrl: string | null;
  status: string;
  reviewNotes: string | null;
  decidedAt: Date | null;
  createdAt: Date;
  reviewedBy?: { fullName: string } | null;
}): SignatureChangeRow => ({
  id: c.id,
  signatureUrl: c.signatureUrl,
  previousUrl: c.previousUrl,
  status: c.status as SignatureChangeRow["status"],
  reviewedBy: c.reviewedBy?.fullName ?? null,
  reviewNotes: c.reviewNotes,
  decidedAt: c.decidedAt ? c.decidedAt.toISOString() : null,
  createdAt: c.createdAt.toISOString(),
});

/** Files a drawn signature (a private PNG the user just uploaded) as a pending change; one at a time. */
export async function requestSignatureChange(userId: string, fileUrl: string) {
  return runAtomicMutation(async () => {
    const upload = await lookupFile(fileUrl);
    if (
      !upload ||
      upload.isPublic ||
      upload.ownerId !== userId ||
      upload.mimeType !== "image/png"
    )
      throw new Error(serverMessages.drawYourSignatureOnThePadAnd);
    if (
      await db.signatureChange.findFirst({
        where: { userId, status: "pending" },
        select: { id: true },
      })
    )
      throw new Error(serverMessages.youAlreadyHaveASignatureChangeWaiting);
    await claimUpload(fileUrl, userId);
    const user = await db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { signatureUrl: true },
    });
    const change = await db.signatureChange.create({
      data: { userId, signatureUrl: fileUrl, previousUrl: user.signatureUrl },
    });
    await db.attachment.create({
      data: {
        entityType: "user_signature",
        entityId: userId,
        fileUrl,
        fileName: upload.fileName,
        fileSize: upload.fileSize,
        mimeType: upload.mimeType,
        uploadedById: userId,
      },
    });
    return map(change);
  });
}

/** Applies an approved signature to the user. */
export async function approveSignatureChange(
  id: string,
  deciderId: string,
  notes?: string | null,
) {
  const change = await db.signatureChange.findUniqueOrThrow({ where: { id } });
  if (change.status !== "pending")
    throw new Error(
      formatMessage(serverTemplates.signatureChangeIs0, { 0: change.status }),
    );
  await db.signatureChange.update({
    where: { id },
    data: {
      status: "approved",
      reviewedById: deciderId,
      reviewNotes: notes || null,
      decidedAt: new Date(),
    },
  });
  await db.user.update({
    where: { id: change.userId },
    data: { signatureUrl: change.signatureUrl },
  });
}

export async function rejectSignatureChange(
  id: string,
  deciderId: string,
  notes?: string | null,
) {
  const change = await db.signatureChange.findUniqueOrThrow({
    where: { id },
    select: { status: true },
  });
  if (change.status !== "pending")
    throw new Error(
      formatMessage(serverTemplates.signatureChangeIs0, { 0: change.status }),
    );
  await db.signatureChange.update({
    where: { id },
    data: {
      status: "rejected",
      reviewedById: deciderId,
      reviewNotes: notes || null,
      decidedAt: new Date(),
    },
  });
}

export async function cancelSignatureChange(id: string, userId: string) {
  return runAtomicMutation(async () => {
    const change = await db.signatureChange.findUniqueOrThrow({
      where: { id },
      select: { status: true, userId: true },
    });
    if (change.userId !== userId)
      throw new Error(serverMessages.onlyTheOwnerCanWithdrawThisSignature);
    if (change.status !== "pending")
      throw new Error(serverMessages.onlyPendingChangesCanBeWithdrawn);
    await db.approvalRequest.updateMany({
      where: {
        targetType: "signature_change",
        targetId: id,
        status: "pending",
      },
      data: { status: "cancelled" },
    });
    await db.signatureChange.update({
      where: { id },
      data: { status: "cancelled", decidedAt: new Date() },
    });
  });
}

/** The user's signature change log, newest first. */
export async function listSignatureChanges(
  userId: string,
  take = 20,
): Promise<SignatureChangeRow[]> {
  const rows = await db.signatureChange.findMany({
    where: { userId },
    include: { reviewedBy: { select: { fullName: true } } },
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows.map(map);
}
