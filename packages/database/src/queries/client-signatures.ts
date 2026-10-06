import crypto from "crypto";
import type { Prisma } from "@prisma/client";
import { db } from "../db";
import { claimUpload } from "../services/uploads";
import { advanceDealForEvent } from "./crm";

/**
 * Client acceptance of quotations and invoices. Staff either send a time-limited signing link (the
 * client reads the document and its terms, then signs online) or upload a copy the client signed by
 * hand. A quotation signed this way is accepted. Tokens are stored only as SHA-256 hashes.
 */
export type ClientSignableType = "quotation" | "invoice";

export const SIGNABLE_STATUSES: Record<ClientSignableType, readonly string[]> = {
  quotation: ["issued", "accepted"],
  invoice: ["sent", "partially_paid", "overdue", "paid"],
};

export const SIGNING_LINK_DAYS = { min: 1, max: 30, default: 7 } as const;
const MAX_SIGNATURE_BYTES = 200 * 1024;

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export interface ClientSignableDocument {
  type: ClientSignableType;
  id: string;
  number: string;
  language: "ar" | "en";
  status: string;
  issueDate: string;
  /** Due date for an invoice, validity for a quotation. */
  untilDate: string;
  currency: string;
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  vatPercentage: number;
  vatEnabled: boolean;
  totalAmount: number;
  clientName: string;
  clientCompany: string | null;
  clientEmail: string | null;
  lines: Array<{ descriptionEn: string; descriptionAr: string | null; quantity: number; unitPrice: number; lineTotal: number }>;
  terms: string | null;
  dealId: string | null;
}

export async function loadSignableDocument(type: ClientSignableType, id: string, client: Prisma.TransactionClient = db): Promise<ClientSignableDocument | null> {
  const contactSelect = { firstName: true, lastName: true, companyName: true, email: true } as const;
  if (type === "quotation") {
    const q = await client.quotation.findUnique({ where: { id }, include: { client: { select: contactSelect }, lineItems: { orderBy: { orderIndex: "asc" } } } });
    if (!q) return null;
    const language = q.language === "en" ? "en" : "ar";
    return {
      type, id: q.id, number: q.quotationNumber, language, status: q.status,
      issueDate: q.issueDate.toISOString().slice(0, 10), untilDate: q.validUntilDate.toISOString().slice(0, 10),
      currency: q.currency, subtotal: Number(q.subtotal), discountAmount: Number(q.discountAmount), vatAmount: Number(q.vatAmount),
      vatPercentage: Number(q.vatPercentage), vatEnabled: q.vatEnabled, totalAmount: Number(q.totalAmount),
      clientName: [q.client?.firstName, q.client?.lastName].filter(Boolean).join(" "), clientCompany: q.client?.companyName ?? null, clientEmail: q.client?.email ?? null,
      lines: q.lineItems.map((l) => ({ descriptionEn: l.descriptionEn, descriptionAr: l.descriptionAr, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice), lineTotal: Number(l.lineTotal) })),
      terms: (language === "ar" ? q.termsAr || q.termsEn : q.termsEn || q.termsAr) ?? null,
      dealId: q.dealId,
    };
  }
  const inv = await client.invoice.findUnique({ where: { id }, include: { client: { select: contactSelect }, lineItems: { orderBy: { displayOrder: "asc" } } } });
  if (!inv) return null;
  const language = inv.language === "en" ? "en" : "ar";
  return {
    type, id: inv.id, number: inv.invoiceNumber, language, status: inv.status,
    issueDate: inv.issueDate.toISOString().slice(0, 10), untilDate: inv.dueDate.toISOString().slice(0, 10),
    currency: inv.currency, subtotal: Number(inv.subtotal), discountAmount: Number(inv.discountAmount), vatAmount: Number(inv.vatAmount),
    vatPercentage: Number(inv.vatPercentage), vatEnabled: inv.vatEnabled, totalAmount: Number(inv.totalAmount),
    clientName: [inv.client?.firstName, inv.client?.lastName].filter(Boolean).join(" "), clientCompany: inv.client?.companyName ?? null, clientEmail: inv.client?.email ?? null,
    lines: inv.lineItems.map((l) => ({ descriptionEn: l.descriptionEn, descriptionAr: l.descriptionAr, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice), lineTotal: Number(l.lineTotal) })),
    terms: (language === "ar" ? inv.notesAr || inv.notesEn : inv.notesEn || inv.notesAr) ?? null,
    dealId: inv.dealId,
  };
}

/** E-signature consent wording in the document language, supplied by the app (it owns the translations). */
export type ConsentText = (language: "ar" | "en", number: string, type: ClientSignableType) => string;

/** What the client agreed to: the document's own terms plus the e-signature consent, in its language. */
export function signingTerms(doc: ClientSignableDocument, consent: ConsentText): string {
  return [doc.terms?.trim(), consent(doc.language, doc.number, doc.type)].filter(Boolean).join("\n\n");
}

/** Number, currency, total and lines: if any of these change after signing, the signature no longer matches. */
export function documentFingerprint(doc: ClientSignableDocument): string {
  const payload = JSON.stringify([doc.type, doc.number, doc.currency, doc.totalAmount.toFixed(3), doc.lines.map((l) => [l.descriptionEn, l.quantity, l.unitPrice.toFixed(3), l.lineTotal.toFixed(3)])]);
  return crypto.createHash("sha256").update(payload).digest("hex");
}

function assertSignable(doc: ClientSignableDocument | null): asserts doc is ClientSignableDocument {
  if (!doc) throw new Error("Document not found");
  if (!SIGNABLE_STATUSES[doc.type].includes(doc.status))
    throw new Error(doc.type === "quotation" ? "Only issued quotations can be signed by the client" : "Only issued invoices can be signed by the client");
}

const endOfDayBahrain = (isoDate: string) => new Date(`${isoDate}T23:59:59+03:00`);

async function signedRecord(type: ClientSignableType, id: string, client: Prisma.TransactionClient = db) {
  return client.clientSignature.findFirst({ where: { documentType: type, documentId: id, status: "signed" } });
}

/** Creates a fresh signing link (any earlier unused link for the document stops working). Returns the raw token once. */
export async function createSigningLink(
  type: ClientSignableType,
  id: string,
  actorId: string,
  options: { days?: number; recipientEmail?: string | null } = {},
) {
  const doc = await loadSignableDocument(type, id);
  assertSignable(doc);
  if (await signedRecord(type, id)) throw new Error("The client has already signed this document");
  const days = Math.round(options.days ?? SIGNING_LINK_DAYS.default);
  if (!(days >= SIGNING_LINK_DAYS.min && days <= SIGNING_LINK_DAYS.max)) throw new Error(`A link can stay open for ${SIGNING_LINK_DAYS.min} to ${SIGNING_LINK_DAYS.max} days`);
  let expiresAt = new Date(Date.now() + days * 86_400_000);
  // A quotation cannot be signed after it stops being valid.
  if (type === "quotation") {
    const validUntil = endOfDayBahrain(doc.untilDate);
    if (validUntil <= new Date()) throw new Error("This quotation has expired. Issue a new revision to the client.");
    if (validUntil < expiresAt) expiresAt = validUntil;
  }
  const email = options.recipientEmail?.trim() || doc.clientEmail || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid e-mail address");
  const token = crypto.randomBytes(32).toString("base64url");
  await db.clientSignature.updateMany({ where: { documentType: type, documentId: id, status: "pending" }, data: { status: "revoked", revokedAt: new Date() } });
  const record = await db.clientSignature.create({
    data: { documentType: type, documentId: id, method: "link", status: "pending", tokenHash: hashToken(token), expiresAt, recipientEmail: email, createdById: actorId },
  });
  await db.activityLog.create({ data: { userId: actorId, action: "create", entityType: `${type}_signing_link`, entityId: id, details: { signatureId: record.id, expiresAt: expiresAt.toISOString(), recipientEmail: email } } });
  return { token, record };
}

export async function revokeSigningLink(signatureId: string, actorId: string) {
  const record = await db.clientSignature.findUniqueOrThrow({ where: { id: signatureId } });
  if (record.status !== "pending") throw new Error("Only an unused link can be cancelled");
  await db.clientSignature.update({ where: { id: signatureId }, data: { status: "revoked", revokedAt: new Date() } });
  await db.activityLog.create({ data: { userId: actorId, action: "revoke", entityType: `${record.documentType}_signing_link`, entityId: record.documentId, details: { signatureId } } });
  return record;
}

/** Marks a quotation accepted inside the signing transaction (the same effect as staff recording acceptance). */
async function acceptQuotationForSignature(tx: Prisma.TransactionClient, doc: ClientSignableDocument, evidence: string) {
  if (doc.type !== "quotation" || doc.status !== "issued") return;
  await tx.quotation.update({ where: { id: doc.id }, data: { status: "accepted", acceptanceEvidence: evidence.slice(0, 500) } });
  await advanceDealForEvent(tx, doc.dealId, "quotation_accepted");
}

/** Records a copy the client signed by hand (PDF or image uploaded by staff). */
export async function recordSignedCopy(
  type: ClientSignableType,
  id: string,
  actorId: string,
  input: { signerName: string; signerTitle?: string | null; signedAt: string; fileUrl: string; fileName?: string | null },
) {
  const signerName = input.signerName?.trim();
  if (!signerName || signerName.length < 2 || signerName.length > 120) throw new Error("Enter the name of the person who signed");
  const signedAt = new Date(input.signedAt);
  if (Number.isNaN(signedAt.getTime()) || signedAt.getTime() > Date.now() + 86_400_000) throw new Error("Enter the date it was signed");
  return db.$transaction(async (tx) => {
    const doc = await loadSignableDocument(type, id, tx);
    assertSignable(doc);
    if (await signedRecord(type, id, tx)) throw new Error("The client has already signed this document");
    const upload = await claimUpload(tx, input.fileUrl, actorId);
    await tx.clientSignature.updateMany({ where: { documentType: type, documentId: id, status: "pending" }, data: { status: "revoked", revokedAt: new Date() } });
    const record = await tx.clientSignature.create({
      data: {
        documentType: type, documentId: id, method: "upload", status: "signed",
        signerName, signerTitle: input.signerTitle?.trim().slice(0, 120) || null, signedAt,
        signedFileUrl: upload.fileUrl, documentHash: documentFingerprint(doc), termsAccepted: true, createdById: actorId,
      },
    });
    await tx.attachment.create({
      data: { fileName: (input.fileName || upload.fileName || "signed-copy").slice(0, 200), fileUrl: upload.fileUrl, fileSize: upload.fileSize, mimeType: upload.mimeType, entityType: type, entityId: id, uploadedById: actorId },
    });
    await acceptQuotationForSignature(tx, doc, `Signed copy uploaded (${signerName})`);
    await tx.activityLog.create({ data: { userId: actorId, action: "sign", entityType: type, entityId: id, details: { clientSignature: record.id, method: "upload", signerName } } });
    return record;
  });
}

/** The live link behind a token, or why it cannot be used. Expired links are marked as such. */
export async function getSigningSession(token: string, consent: ConsentText) {
  if (typeof token !== "string" || token.length < 30 || token.length > 100) return { state: "invalid" as const };
  const record = await db.clientSignature.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.method !== "link") return { state: "invalid" as const };
  const doc = await loadSignableDocument(record.documentType as ClientSignableType, record.documentId);
  if (!doc) return { state: "invalid" as const };
  if (record.status === "signed") return { state: "signed" as const, record, doc };
  if (record.status !== "pending") return { state: record.status === "expired" ? ("expired" as const) : ("revoked" as const), record, doc };
  if (!record.expiresAt || record.expiresAt <= new Date()) {
    await db.clientSignature.update({ where: { id: record.id }, data: { status: "expired" } });
    return { state: "expired" as const, record, doc };
  }
  if (!SIGNABLE_STATUSES[doc.type].includes(doc.status)) return { state: "unavailable" as const, record, doc };
  if (!record.viewedAt) await db.clientSignature.update({ where: { id: record.id }, data: { viewedAt: new Date() } });
  return { state: "open" as const, record, doc, terms: signingTerms(doc, consent) };
}

/** A drawn signature must be a real, reasonably small PNG. */
export function validateSignatureImage(dataUrl: string) {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl ?? "");
  if (!match) throw new Error("Draw your signature to continue");
  const bytes = Buffer.from(match[1], "base64");
  if (bytes.length < 200) throw new Error("Draw your signature to continue");
  if (bytes.length > MAX_SIGNATURE_BYTES) throw new Error("The signature image is too large");
  if (!bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) throw new Error("Draw your signature to continue");
  return bytes;
}

export async function signWithToken(
  token: string,
  input: { signerName: string; signerTitle?: string | null; signatureData: string; termsAccepted: boolean; ip?: string | null; userAgent?: string | null },
  consent: ConsentText,
) {
  const signerName = input.signerName?.trim();
  if (!signerName || signerName.length < 2 || signerName.length > 120) throw new Error("Enter your full name");
  if (input.termsAccepted !== true) throw new Error("Accept the terms and conditions to sign");
  validateSignatureImage(input.signatureData);
  const session = await getSigningSession(token, consent);
  if (session.state !== "open") throw new Error("This signing link is no longer valid");
  const { record } = session;
  return db.$transaction(async (tx) => {
    const doc = await loadSignableDocument(record.documentType as ClientSignableType, record.documentId, tx);
    assertSignable(doc);
    const signedAt = new Date();
    // Only one request can turn the pending link into a signature.
    const claimed = await tx.clientSignature.updateMany({
      where: { id: record.id, status: "pending", expiresAt: { gt: signedAt } },
      data: {
        status: "signed", signerName, signerTitle: input.signerTitle?.trim().slice(0, 120) || null, signatureData: input.signatureData,
        termsText: signingTerms(doc, consent), termsAccepted: true, documentHash: documentFingerprint(doc), signedAt,
        signedIp: input.ip?.slice(0, 64) || null, signedUserAgent: input.userAgent?.slice(0, 300) || null,
      },
    });
    if (claimed.count !== 1) throw new Error("This signing link is no longer valid");
    await acceptQuotationForSignature(tx, doc, `Signed online by ${signerName}`);
    // Logged against the staff member who sent the link; the details name the client signer.
    await tx.activityLog.create({
      data: { userId: record.createdById, action: "sign", entityType: doc.type, entityId: doc.id, details: { clientSignature: record.id, method: "link", signerName }, ipAddress: input.ip?.slice(0, 64) || null, userAgent: input.userAgent?.slice(0, 300) || null },
    });
    return { documentType: doc.type, documentId: doc.id, signedAt: signedAt.toISOString() };
  });
}

/** The signed acceptance shown on the PDF, or null. */
export async function getClientAcceptance(type: ClientSignableType, id: string) {
  const record = await signedRecord(type, id);
  if (!record?.signedAt || !record.signerName) return null;
  return {
    id: record.id,
    method: record.method === "upload" ? ("upload" as const) : ("electronic" as const),
    signerName: record.signerName,
    signerTitle: record.signerTitle,
    signedAt: record.signedAt.toISOString(),
    signatureData: record.signatureData,
    signedFileUrl: record.signedFileUrl,
  };
}

/** Signing history for the staff screen (newest first); tokens are never returned. */
export async function listClientSignatures(type: ClientSignableType, id: string) {
  const rows = await db.clientSignature.findMany({
    where: { documentType: type, documentId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { createdBy: { select: { fullName: true } } },
  });
  const now = new Date();
  return rows.map((r) => ({
    id: r.id,
    method: r.method as "link" | "upload",
    status: (r.status === "pending" && r.expiresAt && r.expiresAt <= now ? "expired" : r.status) as "pending" | "signed" | "revoked" | "expired",
    recipientEmail: r.recipientEmail,
    signerName: r.signerName,
    signerTitle: r.signerTitle,
    signedAt: r.signedAt?.toISOString() ?? null,
    expiresAt: r.expiresAt?.toISOString() ?? null,
    viewedAt: r.viewedAt?.toISOString() ?? null,
    signedFileUrl: r.signedFileUrl,
    hasDrawnSignature: Boolean(r.signatureData),
    createdBy: r.createdBy.fullName,
    createdAt: r.createdAt.toISOString(),
  }));
}
