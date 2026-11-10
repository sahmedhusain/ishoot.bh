import { serverMessages } from "@platform/locales";
import { runAtomicMutation } from "../atomic";
import { submitForApproval } from "../services/approval-engine";
import {
  getSignatureMode,
  resolveSigningSignature,
} from "./signature-policies";
import {
  getInvoice,
  getPayment,
  getQuotation,
  getEmployee,
  updateInvoiceStatus,
} from "../api";

export type SignableDocument = "quotation" | "invoice" | "receipt";

export interface SigningState {
  mode?: "stored" | "live";
  approved: boolean;
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
  try {
    if (type === "quotation") {
      const q = await getQuotation(id).catch(() => null);
      return (
        q && {
          ...q,
          approved: APPROVED_QUOTATION.includes(q.status),
          approvalStatus: undefined,
          signedById: (q as any).signedById || (q as any).signed_by_id,
          signedAt: (q as any).signedAt || (q as any).signed_at,
          signerSignatureUrl:
            (q as any).signerSignatureUrl || (q as any).signer_signature_url,
          signedBy: (q as any).signedBy || null,
          createdById: (q as any).createdById || (q as any).created_by_id,
          salesOwnerId: (q as any).salesOwnerId || (q as any).sales_owner_id,
        }
      );
    }
    if (type === "invoice") {
      const i = await getInvoice(id).catch(() => null);
      return (
        i && {
          ...i,
          approved:
            (i as any).approvalStatus === "approved" && i.status !== "void",
          signedById: (i as any).signedById || (i as any).signed_by_id,
          signedAt: (i as any).signedAt || (i as any).signed_at,
          signerSignatureUrl:
            (i as any).signerSignatureUrl || (i as any).signer_signature_url,
          signedBy: (i as any).signedBy || null,
          createdById: (i as any).createdById || (i as any).created_by_id,
          salesOwnerId: (i as any).salesOwnerId || (i as any).sales_owner_id,
        }
      );
    }
    const p = await getPayment(id).catch(() => null);
    return (
      p && {
        ...p,
        salesOwnerId: null,
        approved: true,
        approvalStatus: undefined,
        status: "recorded",
        signedById: (p as any).signedById || (p as any).signed_by_id,
        signedAt: (p as any).signedAt || (p as any).signed_at,
        signerSignatureUrl:
          (p as any).signerSignatureUrl || (p as any).signer_signature_url,
        signedBy: (p as any).signedBy || null,
        createdById: (p as any).createdById || (p as any).created_by_id,
      }
    );
  } catch (e) {
    return null;
  }
}

export async function getSigningState(
  type: SignableDocument,
  id: string,
): Promise<SigningState> {
  const doc = await load(type, id);
  if (!doc) throw new Error(serverMessages.documentNotFound);
  return {
    approved: doc.approved,
    approvalStatus: (doc as any).approvalStatus || (doc.approved ? "approved" : "draft"),
    signed: !!doc.signedAt,
    signedBy: doc.signedBy
      ? {
          id: doc.signedBy.id,
          name: doc.signedBy.name || doc.signedBy.fullName || "",
        }
      : null,
    signedAt: doc.signedAt ? new Date(doc.signedAt).toISOString() : null,
    signatureUrl: doc.signerSignatureUrl,
    mode: await getSignatureMode(type),
  };
}

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

    const signer = await getEmployee(actorId).catch(() => null);
    if (!signer) throw new Error(serverMessages.documentNotFound);
    if (!(signer as any).isActive && (signer as any).status !== "active")
      throw new Error(serverMessages.inactiveUsersCannotSignDocuments);

    const signerSignatureUrl = await resolveSigningSignature(
      type,
      actorId,
      drawnSignature,
    );

    const { recordSignature } = await import("../api/workflow");
    await recordSignature(id, signerSignatureUrl);

    return getSigningState(type, id);
  });
}

export async function requestInvoiceApproval(id: string, actorId: string) {
  return runAtomicMutation(async () => {
    const invoice = await getInvoice(id).catch(() => null);
    if (!invoice) throw new Error(serverMessages.documentNotFound);

    if (invoice.status === "void")
      throw new Error(serverMessages.voidInvoicesCannotBeApproved);
    if ((invoice as any).approvalStatus === "approved")
      throw new Error(serverMessages.thisInvoiceIsAlreadyApproved);
    if ((invoice as any).approvalStatus === "submitted")
      throw new Error(serverMessages.thisInvoiceIsAlreadyWaitingForApproval);

    await updateInvoiceStatus(id, "submitted");

    return submitForApproval({
      targetType: "invoice",
      targetId: id,
      requesterId: actorId,
      policySnapshot: {
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: Number((invoice as any).totalAmount || invoice.total),
        currency: invoice.currency,
      },
    });
  });
}

export async function assertSigned(type: SignableDocument, id: string) {
  const doc = await load(type, id);
  if (!doc) throw new Error(serverMessages.documentNotFound);
  if (!doc.signedAt)
    throw new Error(serverMessages.signAndStampThisDocumentBeforeSending);
}
