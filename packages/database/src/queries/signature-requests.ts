import { serverTemplates, formatMessage, serverMessages } from "@ishoot/locales";

import crypto from "crypto";
import { db, runAtomicMutation } from "../db";
import { SIGNING_REQUEST_DAYS } from "../constants/signatures";
import { validateSignatureImage } from "../services/signature-image";
import { getAssetHandover, signAssetHandover } from "./assets";

/**
 * One-time links for staff to sign a document on their own device, like the client signing link for
 * quotations: an employee receiving or returning company equipment reads the handover and signs it there.
 * The raw token is shown once; only its SHA-256 hash is stored.
 */
export type SignatureRequestType = "asset_handover";

const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

async function assertSignable(type: SignatureRequestType, id: string) {
  if (type === "asset_handover") {
    const handover = await db.assetHandover.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!handover) throw new Error(serverMessages.handoverNotFound);
    if (handover.status !== "awaiting_employee")
      throw new Error(serverMessages.thisHandoverIsNotWaitingFor);
    return;
  }
  throw new Error(serverMessages.unknownDocumentType);
}

/** A fresh link for the document; any earlier unused link stops working. Returns the raw token once. */
export async function createSignatureRequest(
  type: SignatureRequestType,
  id: string,
  actorId: string,
  options: {
    days?: number;
    recipientEmail?: string | null;
    recipientPhone?: string | null;
  } = {},
) {
  return runAtomicMutation(async () => {
    await assertSignable(type, id);
    const days = Math.round(options.days ?? SIGNING_REQUEST_DAYS.default);
    if (!(days >= SIGNING_REQUEST_DAYS.min && days <= SIGNING_REQUEST_DAYS.max))
      throw new Error(
        formatMessage(serverTemplates.aLinkCanStayOpenFor0, { 0: SIGNING_REQUEST_DAYS.min, 1: SIGNING_REQUEST_DAYS.max }),
      );
    const email = options.recipientEmail?.trim() || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new Error(serverMessages.enterAValidEMailAddress);
    const token = crypto.randomBytes(32).toString("base64url");
    await db.signatureRequest.updateMany({
      where: { documentType: type, documentId: id, status: "pending" },
      data: { status: "revoked", revokedAt: new Date() },
    });
    const record = await db.signatureRequest.create({
      data: {
        documentType: type,
        documentId: id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + days * 86_400_000),
        recipientEmail: email,
        recipientPhone: options.recipientPhone?.trim().slice(0, 30) || null,
        createdById: actorId,
      },
    });
    await db.activityLog.create({
      data: {
        userId: actorId,
        action: "create",
        entityType: `${type}_signing_link`,
        entityId: id,
        details: {
          requestId: record.id,
          expiresAt: record.expiresAt.toISOString(),
        },
      },
    });
    return { token, record };
  });
}

export async function revokeSignatureRequest(
  requestId: string,
  actorId: string,
) {
  const record = await db.signatureRequest.findUnique({
    where: { id: requestId },
  });
  if (!record) throw new Error(serverMessages.signingLinkNotFound);
  if (record.status !== "pending")
    throw new Error(serverMessages.onlyAnUnusedLinkCanBeCancelled);
  await db.signatureRequest.update({
    where: { id: requestId },
    data: { status: "revoked", revokedAt: new Date() },
  });
  await db.activityLog.create({
    data: {
      userId: actorId,
      action: "revoke",
      entityType: `${record.documentType}_signing_link`,
      entityId: record.documentId,
      details: { requestId },
    },
  });
  return record;
}

/** Signing links for a document, newest first (tokens are never returned). */
export async function listSignatureRequests(
  type: SignatureRequestType,
  id: string,
) {
  const rows = await db.signatureRequest.findMany({
    where: { documentType: type, documentId: id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const now = new Date();
  return rows.map((r) => ({
    id: r.id,
    status: (r.status === "pending" && r.expiresAt <= now
      ? "expired"
      : r.status) as "pending" | "signed" | "revoked" | "expired",
    recipientEmail: r.recipientEmail,
    expiresAt: r.expiresAt.toISOString(),
    viewedAt: r.viewedAt?.toISOString() ?? null,
    signedAt: r.signedAt?.toISOString() ?? null,
    signerName: r.signerName,
    createdAt: r.createdAt.toISOString(),
  }));
}

/** The document behind a link, or why the link cannot be used. Expired links are marked as such. */
export async function getSignatureRequestSession(token: string) {
  if (typeof token !== "string" || token.length < 30 || token.length > 100)
    return { state: "invalid" as const };
  const record = await db.signatureRequest.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!record || record.documentType !== "asset_handover")
    return { state: "invalid" as const };
  const handover = await getAssetHandover(record.documentId);
  if (!handover) return { state: "invalid" as const };
  if (record.status === "signed")
    return { state: "signed" as const, record, handover };
  if (record.status !== "pending")
    return {
      state:
        record.status === "expired"
          ? ("expired" as const)
          : ("revoked" as const),
      record,
      handover,
    };
  if (record.expiresAt <= new Date()) {
    await db.signatureRequest.update({
      where: { id: record.id },
      data: { status: "expired" },
    });
    return { state: "expired" as const, record, handover };
  }
  if (handover.status !== "awaiting_employee")
    return { state: "unavailable" as const, record, handover };
  if (!record.viewedAt)
    await db.signatureRequest.update({
      where: { id: record.id },
      data: { viewedAt: new Date() },
    });
  return { state: "open" as const, record, handover };
}

/** The employee signs through the link: the signature is recorded on the handover and it moves to approval. */
export async function signWithSignatureRequest(
  token: string,
  input: {
    signerName: string;
    signatureData: string;
    acknowledged: boolean;
    ip?: string | null;
    userAgent?: string | null;
  },
) {
  const signerName = input.signerName?.trim();
  if (!signerName || signerName.length < 2 || signerName.length > 120)
    throw new Error(serverMessages.enterYourFullName);
  if (input.acknowledged !== true)
    throw new Error(serverMessages.confirmThatYouHaveReadTheHandover);
  validateSignatureImage(input.signatureData);
  const session = await getSignatureRequestSession(token);
  if (session.state !== "open")
    throw new Error(serverMessages.thisSigningLinkIsNoLongerValid);
  const { record } = session;
  return runAtomicMutation(async () => {
    const signedAt = new Date();
    // Only one request can turn the pending link into a signature.
    const claimed = await db.signatureRequest.updateMany({
      where: { id: record.id, status: "pending", expiresAt: { gt: signedAt } },
      data: {
        status: "signed",
        signerName,
        signatureData: input.signatureData,
        signedAt,
        signedIp: input.ip?.slice(0, 64) || null,
        signedUserAgent: input.userAgent?.slice(0, 300) || null,
      },
    });
    if (claimed.count !== 1)
      throw new Error(serverMessages.thisSigningLinkIsNoLongerValid);
    await signAssetHandover(
      record.documentId,
      { signature: input.signatureData, signer_name: signerName },
      record.createdById,
      "link",
    );
    await db.activityLog.create({
      data: {
        userId: record.createdById,
        action: "sign",
        entityType: "asset_handover",
        entityId: record.documentId,
        details: { requestId: record.id, method: "link", signerName },
        ipAddress: input.ip?.slice(0, 64) || null,
        userAgent: input.userAgent?.slice(0, 300) || null,
      },
    });
    return { documentId: record.documentId, signedAt: signedAt.toISOString() };
  });
}
