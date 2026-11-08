import { serverMessages } from "@platform/locales";
import { db, runAtomicMutation } from "../atomic";
import { submitForApproval } from "../services/approval-engine";
import {
  getSignatureMode,
  resolveSigningSignature,
} from "./signature-policies";

export type SignableDocument = "quotation" | "invoice" | "receipt";

export interface SigningState {
  /** "live": the signer draws the signature when signing; "stored": their saved signature is applied. */
  mode?: "stored" | "live";
  /** Approved for sending (quotations: approved and later; invoices: approval granted; receipts: recorded). */
  approved: boolean;
  /** Invoice approval status, for the request-approval step. */
  approvalStatus?: string;
  signed: boolean;
  signedBy: { id: string; name: string } | null;
  signedAt: string | null;
  signatureUrl: string | null;
}

const APPROVED_QUOTATION = [
  "approved",
  "issued",
  "accepted",
  "rejected",
  "expired",
  "converted",
];

async function load(type: SignableDocument, id: string) {
  const select = {
    signedById: true,
    signedAt: true,
    signerSignatureUrl: true,
    signedBy: { select: { id: true, fullName: true } },
  } as const;
  if (type === "quotation") {
    const q = await db.quotation.findUnique({
      where: { id },
      select: {
        ...select,
        status: true,
        createdById: true,
        salesOwnerId: true,
      },
    });
    return (
      q && {
        ...q,
        approved: APPROVED_QUOTATION.includes(q.status),
        approvalStatus: undefined,
      }
    );
  }
  if (type === "invoice") {
    const i = await db.invoice.findUnique({
      where: { id },
      select: {
        ...select,
        status: true,
        approvalStatus: true,
        createdById: true,
        salesOwnerId: true,
      },
    });
    return (
      i && {
        ...i,
        approved: i.approvalStatus === "approved" && i.status !== "void",
      }
    );
  }
  const p = await db.payment.findUnique({
    where: { id },
    select: { ...select, createdById: true },
  });
  return (
    p && {
      ...p,
      salesOwnerId: null,
      approved: true,
      approvalStatus: undefined,
      status: "recorded",
    }
  );
}

export async function getSigningState(
  type: SignableDocument,
  id: string,
): Promise<SigningState> {
  const doc = await load(type, id);
  if (!doc) throw new Error(serverMessages.documentNotFound);
  return {
    approved: doc.approved,
    approvalStatus: doc.approvalStatus,
    signed: !!doc.signedAt,
    signedBy: doc.signedBy
      ? { id: doc.signedBy.id, name: doc.signedBy.fullName }
      : null,
    signedAt: doc.signedAt ? doc.signedAt.toISOString() : null,
    signatureUrl: doc.signerSignatureUrl,
    mode: await getSignatureMode(type),
  };
}

/** Who may sign: the person credited with the document, its issuer, or someone allowed to send such documents. */
export async function canSignDocument(
  type: SignableDocument,
  id: string,
  actor: { id: string },
  hasSendPermission: boolean,
) {
  const doc = await load(type, id);
  if (!doc) return false;
  return (
    hasSendPermission ||
    doc.createdById === actor.id ||
    doc.salesOwnerId === actor.id
  );
}

/**
 * Signs and stamps an approved document with the signer's approved signature (snapshotted, so a
 * later signature change never alters an issued document). Unapproved or already-signed documents are refused.
 */
export async function signDocument(
  type: SignableDocument,
  id: string,
  actorId: string,
  drawnSignature?: string | null,
) {
  return runAtomicMutation(async () => {
    const doc = await load(type, id);
    if (!doc) throw new Error(serverMessages.documentNotFound);
    if (!doc.approved)
      throw new Error(serverMessages.thisDocumentMustBeApprovedBeforeIt);
    if (doc.signedAt)
      throw new Error(serverMessages.thisDocumentIsAlreadySigned);
    const signer = await db.user.findUniqueOrThrow({
      where: { id: actorId },
      select: { isActive: true },
    });
    if (!signer.isActive)
      throw new Error(serverMessages.inactiveUsersCannotSignDocuments);
    // The saved signature, or one drawn now when this document type must be signed on the spot.
    const signerSignatureUrl = await resolveSigningSignature(
      type,
      actorId,
      drawnSignature,
    );
    const data = {
      signedById: actorId,
      signedAt: new Date(),
      signerSignatureUrl,
    };
    if (type === "quotation")
      await db.quotation.update({ where: { id }, data });
    else if (type === "invoice")
      await db.invoice.update({ where: { id }, data });
    else await db.payment.update({ where: { id }, data });
    return getSigningState(type, id);
  });
}

/** Sends an invoice for approval (applied at once when the invoice policy is off or the requester auto-approves). */
export async function requestInvoiceApproval(id: string, actorId: string) {
  return runAtomicMutation(async () => {
    const invoice = await db.invoice.findUniqueOrThrow({
      where: { id },
      select: {
        approvalStatus: true,
        status: true,
        invoiceNumber: true,
        totalAmount: true,
        currency: true,
      },
    });
    if (invoice.status === "void")
      throw new Error(serverMessages.voidInvoicesCannotBeApproved);
    if (invoice.approvalStatus === "approved")
      throw new Error(serverMessages.thisInvoiceIsAlreadyApproved);
    if (invoice.approvalStatus === "submitted")
      throw new Error(serverMessages.thisInvoiceIsAlreadyWaitingForApproval);
    await db.invoice.update({
      where: { id },
      data: { approvalStatus: "submitted" },
    });
    return submitForApproval({
      targetType: "invoice",
      targetId: id,
      requesterId: actorId,
      policySnapshot: {
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: Number(invoice.totalAmount),
        currency: invoice.currency,
      },
    });
  });
}

/** Sending to a client needs a signed document. */
export async function assertSigned(type: SignableDocument, id: string) {
  const doc = await load(type, id);
  if (!doc) throw new Error(serverMessages.documentNotFound);
  if (!doc.signedAt)
    throw new Error(serverMessages.signAndStampThisDocumentBeforeSending);
}
