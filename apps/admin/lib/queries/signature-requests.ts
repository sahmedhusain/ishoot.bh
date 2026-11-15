import { isValidEmail } from "../constants/validation";
import {
  serverTemplates,
  formatMessage,
  serverMessages,
} from "@platform/locales";

import crypto from "crypto";
import { runAtomicMutation } from "../api/atomic";
import { listTableRows, upsertTableRow } from "../api/tables";
import { SIGNING_REQUEST_DAYS } from "../constants/signatures";
import { validateSignatureImage } from "../services/signature-image";
import { getAssetHandover, signAssetHandover } from "./assets";

export type SignatureRequestType = "asset_handover";

const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

async function assertSignable(type: SignatureRequestType, id: string) {
  if (type === "asset_handover") {
    const handovers = await listTableRows<any>("itsm", "asset_handover");
    const handover = handovers.find((h) => h.id === id);
    if (!handover) throw new Error(serverMessages.handoverNotFound);
    if (handover.status !== "awaiting_employee")
      throw new Error(serverMessages.thisHandoverIsNotWaitingFor);
    return;
  }
  throw new Error(serverMessages.unknownDocumentType);
}

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
        formatMessage(serverTemplates.aLinkCanStayOpenFor0, {
          0: SIGNING_REQUEST_DAYS.min,
          1: SIGNING_REQUEST_DAYS.max,
        }),
      );
    const email = options.recipientEmail?.trim() || null;
    if (email && !isValidEmail(email))
      throw new Error(serverMessages.enterAValidEMailAddress);
    const token = crypto.randomBytes(32).toString("base64url");
    const existingReqs = await listTableRows<any>("workflow", "signature_request").catch(() => []);
    for (const r of existingReqs.filter(
      (row) => row.documentType === type && row.documentId === id && row.status === "pending",
    )) {
      await upsertTableRow("workflow", "signature_request", {
        ...r,
        status: "revoked",
        revokedAt: new Date().toISOString(),
      });
    }
    const expiresAtIso = new Date(Date.now() + days * 86_400_000).toISOString();
    const record = await upsertTableRow<any>("workflow", "signature_request", {
      id: crypto.randomUUID(),
      documentType: type,
      documentId: id,
      tokenHash: hashToken(token),
      status: "pending",
      expiresAt: expiresAtIso,
      recipientEmail: email,
      recipientPhone: options.recipientPhone?.trim().slice(0, 30) || null,
      createdById: actorId,
    });
    await upsertTableRow("system", "activity_log", {
      id: crypto.randomUUID(),
      userId: actorId,
      action: "create",
      entityType: `${type}_signing_link`,
      entityId: id,
      details: {
        requestId: record.id,
        expiresAt: expiresAtIso,
      },
    });
    return { token, record };
  });
}

export async function revokeSignatureRequest(
  requestId: string,
  actorId: string,
) {
  const rows = await listTableRows<any>("workflow", "signature_request");
  const record = rows.find((r) => r.id === requestId);
  if (!record) throw new Error(serverMessages.signingLinkNotFound);
  if (record.status !== "pending")
    throw new Error(serverMessages.onlyAnUnusedLinkCanBeCancelled);
  await upsertTableRow("workflow", "signature_request", {
    ...record,
    id: requestId,
    status: "revoked",
    revokedAt: new Date().toISOString(),
  });
  await upsertTableRow("system", "activity_log", {
    id: crypto.randomUUID(),
    userId: actorId,
    action: "revoke",
    entityType: `${record.documentType}_signing_link`,
    entityId: record.documentId,
    details: { requestId },
  });
  return record;
}

export async function listSignatureRequests(
  type: SignatureRequestType,
  id: string,
) {
  const allRows = await listTableRows<any>("workflow", "signature_request", "created_at DESC").catch(() => []);
  const rows = allRows
    .filter((r) => r.documentType === type && r.documentId === id)
    .slice(0, 10);
  const now = new Date();
  return rows.map((r) => {
    const exp = new Date(r.expiresAt || 0);
    return {
      id: r.id,
      status: (r.status === "pending" && exp <= now
        ? "expired"
        : r.status) as "pending" | "signed" | "revoked" | "expired",
      recipientEmail: r.recipientEmail,
      expiresAt: exp.toISOString(),
      viewedAt: r.viewedAt ? new Date(r.viewedAt).toISOString() : null,
      signedAt: r.signedAt ? new Date(r.signedAt).toISOString() : null,
      signerName: r.signerName,
      createdAt: new Date(r.createdAt || Date.now()).toISOString(),
    };
  });
}

export async function getSignatureRequestSession(token: string) {
  if (typeof token !== "string" || token.length < 30 || token.length > 100)
    return { state: "invalid" as const };
  const rows = await listTableRows<any>("workflow", "signature_request").catch(() => []);
  const tokenHash = hashToken(token);
  const record = rows.find((r) => r.tokenHash === tokenHash);
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
  if (new Date(record.expiresAt || 0) <= new Date()) {
    await upsertTableRow("workflow", "signature_request", {
      ...record,
      status: "expired",
    });
    return { state: "expired" as const, record, handover };
  }
  if (handover.status !== "awaiting_employee")
    return { state: "unavailable" as const, record, handover };
  if (!record.viewedAt)
    await upsertTableRow("workflow", "signature_request", {
      ...record,
      viewedAt: new Date().toISOString(),
    });
  return { state: "open" as const, record, handover };
}

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
    const freshRows = await listTableRows<any>("workflow", "signature_request");
    const fresh = freshRows.find((r) => r.id === record.id);
    if (!fresh || fresh.status !== "pending" || new Date(fresh.expiresAt || 0) <= signedAt)
      throw new Error(serverMessages.thisSigningLinkIsNoLongerValid);
    await upsertTableRow("workflow", "signature_request", {
      ...fresh,
      status: "signed",
      signerName,
      signatureData: input.signatureData,
      signedAt: signedAt.toISOString(),
      signedIp: input.ip?.slice(0, 64) || null,
      signedUserAgent: input.userAgent?.slice(0, 300) || null,
    });
    await signAssetHandover(
      record.documentId,
      { signature: input.signatureData, signer_name: signerName },
      record.createdById,
      "link",
    );
    await upsertTableRow("system", "activity_log", {
      id: crypto.randomUUID(),
      userId: record.createdById,
      action: "sign",
      entityType: "asset_handover",
      entityId: record.documentId,
      details: { requestId: record.id, method: "link", signerName },
      ipAddress: input.ip?.slice(0, 64) || null,
      userAgent: input.userAgent?.slice(0, 300) || null,
    });
    return { documentId: record.documentId, signedAt: signedAt.toISOString() };
  });
}
