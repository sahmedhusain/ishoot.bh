import { isValidEmail } from "../constants/validation";
import {
  serverTemplates,
  formatMessage,
  serverMessages,
} from "@platform/locales";

import crypto from "crypto";
import { runAtomicMutation } from "../api/atomic";
import { listTableRows, upsertTableRow } from "../api/tables";
import { claimUploadOrLink } from "../services/uploads";
import { advanceDealForEvent } from "./crm";
import { validateSignatureImage } from "../services/signature-image";

export type ClientSignableType = "quotation" | "invoice";

export const SIGNABLE_STATUSES: Record<ClientSignableType, readonly string[]> =
  {
    quotation: ["issued", "accepted"],
    invoice: ["sent", "partially_paid", "overdue", "paid"],
  };

export const SIGNING_LINK_DAYS = { min: 1, max: 30, default: 7 } as const;

const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

const toIso = (v: unknown): string | null => {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return new Date(v).toISOString();
  return null;
};

const toDateStr = (v: unknown): string => {
  const iso = toIso(v);
  return iso ? iso.slice(0, 10) : new Date().toISOString().slice(0, 10);
};

export interface ClientSignableDocument {
  type: ClientSignableType;
  id: string;
  number: string;
  language: "ar" | "en";
  status: string;
  issueDate: string;
  untilDate: string;
  currency: string;
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  vatPercentage: number;
  vatEnabled: boolean;
  otherTaxes: Array<{
    code: string;
    nameEn: string;
    nameAr: string;
    rate: number;
    amount: number;
  }>;
  totalAmount: number;
  clientName: string;
  clientCompany: string | null;
  clientEmail: string | null;
  lines: Array<{
    descriptionEn: string;
    descriptionAr: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  terms: string | null;
  dealId: string | null;
}

export async function loadSignableDocument(
  type: ClientSignableType,
  id: string,
  _client?: unknown,
): Promise<ClientSignableDocument | null> {
  if (type === "quotation") {
    const [quotations, contacts, allLines, allTaxes] = await Promise.all([
      listTableRows<Record<string, any>>("sales", "quotation"),
      listTableRows<Record<string, any>>("sales", "crm_contact"),
      listTableRows<Record<string, any>>("sales", "quotation_line_item", "order_index ASC"),
      listTableRows<Record<string, any>>("finance", "document_tax", "display_order ASC"),
    ]);
    const q = quotations.find((r) => r.id === id);
    if (!q) return null;
    const client = q.clientId ? contacts.find((c) => c.id === q.clientId) : null;
    const lineItems = allLines
      .filter((l) => l.quotationId === id)
      .sort((a, b) => Number(a.orderIndex ?? 0) - Number(b.orderIndex ?? 0));
    const taxes = allTaxes
      .filter((t) => t.quotationId === id)
      .sort((a, b) => Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0));
    const language = q.language === "en" ? "en" : "ar";
    return {
      type,
      id: String(q.id),
      number: String(q.quotationNumber ?? ""),
      language,
      status: String(q.status ?? ""),
      issueDate: toDateStr(q.issueDate),
      untilDate: toDateStr(q.validUntilDate),
      currency: String(q.currency ?? "BHD"),
      subtotal: Number(q.subtotal ?? 0),
      discountAmount: Number(q.discountAmount ?? 0),
      vatAmount: Number(q.vatAmount ?? 0),
      vatPercentage: Number(q.vatPercentage ?? 0),
      vatEnabled: Boolean(q.vatEnabled),
      totalAmount: Number(q.totalAmount ?? 0),
      otherTaxes: taxes.map((x) => ({
        code: String(x.code ?? ""),
        nameEn: String(x.nameEn ?? ""),
        nameAr: String(x.nameAr ?? ""),
        rate: Number(x.ratePercent ?? 0),
        amount: Number(x.amount ?? 0),
      })),
      clientName: [client?.firstName, client?.lastName].filter(Boolean).join(" "),
      clientCompany: client?.companyName ?? null,
      clientEmail: client?.email ?? null,
      lines: lineItems.map((l) => ({
        descriptionEn: String(l.descriptionEn ?? ""),
        descriptionAr: l.descriptionAr ?? null,
        quantity: Number(l.quantity ?? 0),
        unitPrice: Number(l.unitPrice ?? 0),
        lineTotal: Number(l.lineTotal ?? 0),
      })),
      terms:
        (language === "ar" ? q.termsAr || q.termsEn : q.termsEn || q.termsAr) ??
        null,
      dealId: q.dealId ?? null,
    };
  }

  const [invoices, contacts, allLines, allTaxes] = await Promise.all([
    listTableRows<Record<string, any>>("finance", "invoice"),
    listTableRows<Record<string, any>>("sales", "crm_contact"),
    listTableRows<Record<string, any>>("finance", "invoice_line_item", "display_order ASC"),
    listTableRows<Record<string, any>>("finance", "document_tax", "display_order ASC"),
  ]);
  const inv = invoices.find((r) => r.id === id);
  if (!inv) return null;
  const client = inv.clientId ? contacts.find((c) => c.id === inv.clientId) : null;
  const lineItems = allLines
    .filter((l) => l.invoiceId === id)
    .sort((a, b) => Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0));
  const taxes = allTaxes
    .filter((t) => t.invoiceId === id)
    .sort((a, b) => Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0));
  const language = inv.language === "en" ? "en" : "ar";
  return {
    type,
    id: String(inv.id),
    number: String(inv.invoiceNumber ?? ""),
    language,
    status: String(inv.status ?? ""),
    issueDate: toDateStr(inv.issueDate),
    untilDate: toDateStr(inv.dueDate),
    currency: String(inv.currency ?? "BHD"),
    subtotal: Number(inv.subtotal ?? 0),
    discountAmount: Number(inv.discountAmount ?? 0),
    vatAmount: Number(inv.vatAmount ?? 0),
    vatPercentage: Number(inv.vatPercentage ?? 0),
    vatEnabled: Boolean(inv.vatEnabled),
    totalAmount: Number(inv.totalAmount ?? 0),
    otherTaxes: taxes.map((x) => ({
      code: String(x.code ?? ""),
      nameEn: String(x.nameEn ?? ""),
      nameAr: String(x.nameAr ?? ""),
      rate: Number(x.ratePercent ?? 0),
      amount: Number(x.amount ?? 0),
    })),
    clientName: [client?.firstName, client?.lastName].filter(Boolean).join(" "),
    clientCompany: client?.companyName ?? null,
    clientEmail: client?.email ?? null,
    lines: lineItems.map((l) => ({
      descriptionEn: String(l.descriptionEn ?? ""),
      descriptionAr: l.descriptionAr ?? null,
      quantity: Number(l.quantity ?? 0),
      unitPrice: Number(l.unitPrice ?? 0),
      lineTotal: Number(l.lineTotal ?? 0),
    })),
    terms:
      (language === "ar"
        ? inv.notesAr || inv.notesEn
        : inv.notesEn || inv.notesAr) ?? null,
    dealId: inv.dealId ?? null,
  };
}

export type ConsentText = (
  language: "ar" | "en",
  number: string,
  type: ClientSignableType,
) => string;

export function signingTerms(
  doc: ClientSignableDocument,
  consent: ConsentText,
): string {
  return [doc.terms?.trim(), consent(doc.language, doc.number, doc.type)]
    .filter(Boolean)
    .join("\n\n");
}

export function documentFingerprint(doc: ClientSignableDocument): string {
  const payload = JSON.stringify([
    doc.type,
    doc.number,
    doc.currency,
    doc.totalAmount.toFixed(3),
    doc.lines.map((l) => [
      l.descriptionEn,
      l.quantity,
      l.unitPrice.toFixed(3),
      l.lineTotal.toFixed(3),
    ]),
  ]);
  return crypto.createHash("sha256").update(payload).digest("hex");
}

function assertSignable(
  doc: ClientSignableDocument | null,
): asserts doc is ClientSignableDocument {
  if (!doc) throw new Error(serverMessages.documentNotFound);
  if (!SIGNABLE_STATUSES[doc.type].includes(doc.status))
    throw new Error(
      doc.type === "quotation"
        ? "Only issued quotations can be signed by the client"
        : "Only issued invoices can be signed by the client",
    );
}

const endOfDayUtc = (isoDate: string) =>
  new Date(`${isoDate}T23:59:59.999Z`);

async function signedRecord(type: ClientSignableType, id: string) {
  const rows = await listTableRows<Record<string, any>>("system", "client_signature");
  return (
    rows.find(
      (r) => r.documentType === type && r.documentId === id && r.status === "signed",
    ) ?? null
  );
}

async function revokePendingSignatures(type: ClientSignableType, id: string) {
  const rows = await listTableRows<Record<string, any>>("system", "client_signature");
  const nowIso = new Date().toISOString();
  for (const r of rows) {
    if (r.documentType === type && r.documentId === id && r.status === "pending") {
      await upsertTableRow("system", "client_signature", {
        id: r.id,
        status: "revoked",
        revokedAt: nowIso,
      });
    }
  }
}

export async function createSigningLink(
  type: ClientSignableType,
  id: string,
  actorId: string,
  options: { days?: number; recipientEmail?: string | null } = {},
) {
  const doc = await loadSignableDocument(type, id);
  assertSignable(doc);
  if (await signedRecord(type, id))
    throw new Error(serverMessages.theClientHasAlreadySignedThisDocument);
  const days = Math.round(options.days ?? SIGNING_LINK_DAYS.default);
  if (!(days >= SIGNING_LINK_DAYS.min && days <= SIGNING_LINK_DAYS.max))
    throw new Error(
      formatMessage(serverTemplates.aLinkCanStayOpenFor0, {
        0: SIGNING_LINK_DAYS.min,
        1: SIGNING_LINK_DAYS.max,
      }),
    );
  let expiresAt = new Date(Date.now() + days * 86_400_000);
  if (type === "quotation") {
    const validUntil = endOfDayUtc(doc.untilDate);
    if (validUntil <= new Date())
      throw new Error(serverMessages.thisQuotationHasExpiredIssueANew);
    if (validUntil < expiresAt) expiresAt = validUntil;
  }
  const email = options.recipientEmail?.trim() || doc.clientEmail || null;
  if (email && !isValidEmail(email))
    throw new Error(serverMessages.enterAValidEMailAddress);
  const token = crypto.randomBytes(32).toString("base64url");
  await revokePendingSignatures(type, id);
  const record = await upsertTableRow<Record<string, any>>("system", "client_signature", {
    id: crypto.randomUUID(),
    documentType: type,
    documentId: id,
    method: "link",
    status: "pending",
    tokenHash: hashToken(token),
    expiresAt: expiresAt.toISOString(),
    recipientEmail: email,
    createdById: actorId,
  });
  await upsertTableRow("system", "activity_log", {
    id: crypto.randomUUID(),
    userId: actorId,
    action: "create",
    entityType: `${type}_signing_link`,
    entityId: id,
    details: {
      signatureId: record.id,
      expiresAt: expiresAt.toISOString(),
      recipientEmail: email,
    },
  });
  return { token, record };
}

export async function revokeSigningLink(signatureId: string, actorId: string) {
  const rows = await listTableRows<Record<string, any>>("system", "client_signature");
  const record = rows.find((r) => r.id === signatureId);
  if (!record) throw new Error(serverMessages.documentNotFound);
  if (record.status !== "pending")
    throw new Error(serverMessages.onlyAnUnusedLinkCanBeCancelled);
  await upsertTableRow("system", "client_signature", {
    id: signatureId,
    status: "revoked",
    revokedAt: new Date().toISOString(),
  });
  await upsertTableRow("system", "activity_log", {
    id: crypto.randomUUID(),
    userId: actorId,
    action: "revoke",
    entityType: `${record.documentType}_signing_link`,
    entityId: record.documentId,
    details: { signatureId },
  });
  return record;
}

async function acceptQuotationForSignature(
  doc: ClientSignableDocument,
  evidence: string,
) {
  if (doc.type !== "quotation" || doc.status !== "issued") return;
  await upsertTableRow("sales", "quotation", {
    id: doc.id,
    status: "accepted",
    acceptanceEvidence: evidence.slice(0, 500),
  });
  await advanceDealForEvent(null, doc.dealId, "quotation_accepted");
}

export async function recordSignedCopy(
  type: ClientSignableType,
  id: string,
  actorId: string,
  input: {
    signerName: string;
    signerTitle?: string | null;
    signedAt: string;
    fileUrl: string;
    fileName?: string | null;
  },
) {
  const signerName = input.signerName?.trim();
  if (!signerName || signerName.length < 2 || signerName.length > 120)
    throw new Error(serverMessages.enterTheNameOfThePersonWho);
  const signedAt = new Date(input.signedAt);
  if (
    Number.isNaN(signedAt.getTime()) ||
    signedAt.getTime() > Date.now() + 86_400_000
  )
    throw new Error(serverMessages.enterTheDateItWasSigned);
  return runAtomicMutation(async () => {
    const doc = await loadSignableDocument(type, id);
    assertSignable(doc);
    if (await signedRecord(type, id))
      throw new Error(serverMessages.theClientHasAlreadySignedThisDocument);
    const upload = await claimUploadOrLink(input.fileUrl, actorId);
    await revokePendingSignatures(type, id);
    const record = await upsertTableRow<Record<string, any>>("system", "client_signature", {
      id: crypto.randomUUID(),
      documentType: type,
      documentId: id,
      method: "upload",
      status: "signed",
      signerName,
      signerTitle: input.signerTitle?.trim().slice(0, 120) || null,
      signedAt: signedAt.toISOString(),
      signedFileUrl: upload.fileUrl,
      documentHash: documentFingerprint(doc),
      termsAccepted: true,
      createdById: actorId,
    });
    await upsertTableRow("notify", "attachment", {
      id: crypto.randomUUID(),
      fileName: (input.fileName || upload.fileName || "signed-copy").slice(0, 200),
      fileUrl: upload.fileUrl,
      fileSize: upload.fileSize,
      mimeType: upload.mimeType,
      entityType: type,
      entityId: id,
      uploadedById: actorId,
    });
    await acceptQuotationForSignature(doc, `Signed copy uploaded (${signerName})`);
    await upsertTableRow("system", "activity_log", {
      id: crypto.randomUUID(),
      userId: actorId,
      action: "sign",
      entityType: type,
      entityId: id,
      details: { clientSignature: record.id, method: "upload", signerName },
    });
    return record;
  });
}

export async function getSigningSession(token: string, consent: ConsentText) {
  if (typeof token !== "string" || token.length < 30 || token.length > 100)
    return { state: "invalid" as const };
  const tokenHash = hashToken(token);
  const rows = await listTableRows<Record<string, any>>("system", "client_signature");
  const record = rows.find((r) => r.tokenHash === tokenHash);
  if (!record || record.method !== "link") return { state: "invalid" as const };
  const doc = await loadSignableDocument(
    record.documentType as ClientSignableType,
    String(record.documentId),
  );
  if (!doc) return { state: "invalid" as const };
  if (record.status === "signed")
    return { state: "signed" as const, record, doc };
  if (record.status !== "pending")
    return {
      state:
        record.status === "expired"
          ? ("expired" as const)
          : ("revoked" as const),
      record,
      doc,
    };
  if (!record.expiresAt || new Date(record.expiresAt) <= new Date()) {
    await upsertTableRow("system", "client_signature", {
      id: record.id,
      status: "expired",
    });
    return { state: "expired" as const, record, doc };
  }
  if (!SIGNABLE_STATUSES[doc.type].includes(doc.status))
    return { state: "unavailable" as const, record, doc };
  if (!record.viewedAt)
    await upsertTableRow("system", "client_signature", {
      id: record.id,
      viewedAt: new Date().toISOString(),
    });
  return {
    state: "open" as const,
    record,
    doc,
    terms: signingTerms(doc, consent),
  };
}

export { validateSignatureImage } from "../services/signature-image";

export async function signWithToken(
  token: string,
  input: {
    signerName: string;
    signerTitle?: string | null;
    signatureData: string;
    termsAccepted: boolean;
    ip?: string | null;
    userAgent?: string | null;
  },
  consent: ConsentText,
) {
  const signerName = input.signerName?.trim();
  if (!signerName || signerName.length < 2 || signerName.length > 120)
    throw new Error(serverMessages.enterYourFullName);
  if (input.termsAccepted !== true)
    throw new Error(serverMessages.acceptTheTermsAndConditionsToSign);
  validateSignatureImage(input.signatureData);
  const session = await getSigningSession(token, consent);
  if (session.state !== "open")
    throw new Error(serverMessages.thisSigningLinkIsNoLongerValid);
  const { record } = session;
  return runAtomicMutation(async () => {
    const doc = await loadSignableDocument(
      record.documentType as ClientSignableType,
      String(record.documentId),
    );
    assertSignable(doc);
    const signedAt = new Date();
    const freshRows = await listTableRows<Record<string, any>>("system", "client_signature");
    const fresh = freshRows.find((r) => r.id === record.id);
    if (
      !fresh ||
      fresh.status !== "pending" ||
      !fresh.expiresAt ||
      new Date(fresh.expiresAt) <= signedAt
    ) {
      throw new Error(serverMessages.thisSigningLinkIsNoLongerValid);
    }
    await upsertTableRow("system", "client_signature", {
      id: record.id,
      status: "signed",
      signerName,
      signerTitle: input.signerTitle?.trim().slice(0, 120) || null,
      signatureData: input.signatureData,
      termsText: signingTerms(doc, consent),
      termsAccepted: true,
      documentHash: documentFingerprint(doc),
      signedAt: signedAt.toISOString(),
      signedIp: input.ip?.slice(0, 64) || null,
      signedUserAgent: input.userAgent?.slice(0, 300) || null,
    });
    await acceptQuotationForSignature(doc, `Signed online by ${signerName}`);
    await upsertTableRow("system", "activity_log", {
      id: crypto.randomUUID(),
      userId: record.createdById,
      action: "sign",
      entityType: doc.type,
      entityId: doc.id,
      details: { clientSignature: record.id, method: "link", signerName },
      ipAddress: input.ip?.slice(0, 64) || null,
      userAgent: input.userAgent?.slice(0, 300) || null,
    });
    return {
      documentType: doc.type,
      documentId: doc.id,
      signedAt: signedAt.toISOString(),
    };
  });
}

export async function getClientAcceptance(
  type: ClientSignableType,
  id: string,
) {
  const record = await signedRecord(type, id);
  if (!record?.signedAt || !record.signerName) return null;
  return {
    id: String(record.id),
    method:
      record.method === "upload"
        ? ("upload" as const)
        : ("electronic" as const),
    signerName: String(record.signerName),
    signerTitle: record.signerTitle ?? null,
    signedAt: toIso(record.signedAt) ?? new Date().toISOString(),
    signatureData: record.signatureData ?? null,
    signedFileUrl: record.signedFileUrl ?? null,
  };
}

export async function listClientSignatures(
  type: ClientSignableType,
  id: string,
) {
  const [allRows, users] = await Promise.all([
    listTableRows<Record<string, any>>("system", "client_signature", "created_at DESC"),
    listTableRows<Record<string, any>>("identity", "user"),
  ]);
  const userById = new Map(users.map((u) => [String(u.id), String(u.fullName ?? "")]));
  const rows = allRows
    .filter((r) => r.documentType === type && r.documentId === id)
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, 20);
  const now = new Date();
  return rows.map((r) => ({
    id: String(r.id),
    method: r.method as "link" | "upload",
    status: (r.status === "pending" && r.expiresAt && new Date(r.expiresAt) <= now
      ? "expired"
      : r.status) as "pending" | "signed" | "revoked" | "expired",
    recipientEmail: r.recipientEmail ?? null,
    signerName: r.signerName ?? null,
    signerTitle: r.signerTitle ?? null,
    signedAt: toIso(r.signedAt),
    expiresAt: toIso(r.expiresAt),
    viewedAt: toIso(r.viewedAt),
    signedFileUrl: r.signedFileUrl ?? null,
    hasDrawnSignature: Boolean(r.signatureData),
    createdBy: userById.get(String(r.createdById)) ?? "",
    createdAt: toIso(r.createdAt) ?? new Date().toISOString(),
  }));
}
