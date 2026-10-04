import { db, runAtomicMutation } from "../db";
import { Quotation, calculateInvoiceTotals } from "../types";
import { getNextSequenceNumber } from "./sequence";
import { allocateDocumentNumber } from "../finance/numbering";
import { lineTotal } from "../finance/money";
import { submitForApproval } from "../services/approval-engine";
import { assertActorNotOnLeave } from "./leave";
import { getLatestExchangeRate } from "./fx-settlement";

export async function createQuotation(
  data: {
    clientId?: string | null;
    dealId?: string | null;
    inquiryId?: string | null;
    issueDate?: Date;
    validUntilDate: Date;
    currency?: string;
    language?: string;
    vatEnabled?: boolean;
    vatPercentage?: number;
    discountType?: "none" | "percentage" | "fixed";
    discountValue?: number;
    termsEn?: string | null;
    termsAr?: string | null;
    rawRate?: number | null;
    lineItems: {
      descriptionEn: string;
      descriptionAr?: string | null;
      quantity: number;
      unitPrice: number;
    }[];
  },
  actorId: string,
): Promise<Quotation> {
  await assertActorNotOnLeave(actorId);

  const currency = data.currency || "BHD";
  const quotationNumber = await getNextSequenceNumber("QTE");

  // Same totals rules as invoices (validation, per-currency rounding).
  const vatPercentage = data.vatEnabled ? (data.vatPercentage ?? 10) : 0;
  const itemsWithTotals = data.lineItems.map((item, idx) => ({
    descriptionEn: item.descriptionEn,
    descriptionAr: item.descriptionAr || null,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    lineTotal: lineTotal(Number(item.quantity), Number(item.unitPrice), currency),
    orderIndex: idx,
  }));
  const { subtotal, discountAmount, vatAmount, totalAmount } = calculateInvoiceTotals(
    itemsWithTotals.map((item) => ({ quantity: item.quantity, unit_price: item.unitPrice, line_total: item.lineTotal, description_en: item.descriptionEn })) as never,
    data.discountType || "none",
    data.discountValue || 0,
    data.vatEnabled || false,
    vatPercentage,
    currency as never,
  );

  // 3% FX margin: built into customer quote total if non-BHD and rawRate is provided
  // Rates are quoted as units of the quotation currency per 1 BHD, so the margin raises what the client pays.
  let rawRate = currency === "BHD" ? 1 : data.rawRate ? Number(data.rawRate) : (await getLatestExchangeRate("BHD", currency)).rate;
  const fxMarginPercent = 3.0; // 3% margin
  let effectiveRate = rawRate;

  if (currency !== "BHD") {
    effectiveRate = Math.round(rawRate * (1 + fxMarginPercent / 100) * 1000000) / 1000000;
  }

  const quotation = await db.$transaction(async (tx) => {
    const q = await tx.quotation.create({
      data: {
        quotationNumber,
        revision: 1,
        clientId: data.clientId || null,
        dealId: data.dealId || null,
        inquiryId: data.inquiryId || null,
        issueDate: data.issueDate || new Date(),
        validUntilDate: data.validUntilDate,
        currency,
        language: data.language || "ar",
        subtotal,
        discountType: data.discountType || "none",
        discountValue: data.discountValue || 0,
        discountAmount,
        vatEnabled: data.vatEnabled || false,
        vatPercentage,
        vatAmount,
        totalAmount,
        rawRate: currency !== "BHD" ? rawRate : null,
        fxMarginPercent,
        effectiveRate: currency !== "BHD" ? effectiveRate : null,
        status: "draft",
        termsEn: data.termsEn || null,
        termsAr: data.termsAr || null,
        createdById: actorId,
        lineItems: {
          create: itemsWithTotals,
        },
      },
      include: {
        lineItems: { orderBy: { orderIndex: "asc" } },
        client: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    return q;
  });

  return {
    ...quotation,
    subtotal: Number(quotation.subtotal),
    discountValue: Number(quotation.discountValue),
    discountAmount: Number(quotation.discountAmount),
    vatPercentage: Number(quotation.vatPercentage),
    vatAmount: Number(quotation.vatAmount),
    totalAmount: Number(quotation.totalAmount),
    rawRate: quotation.rawRate ? Number(quotation.rawRate) : null,
    fxMarginPercent: Number(quotation.fxMarginPercent),
    effectiveRate: quotation.effectiveRate ? Number(quotation.effectiveRate) : null,
    issueDate: quotation.issueDate.toISOString(),
    validUntilDate: quotation.validUntilDate.toISOString(),
    createdAt: quotation.createdAt.toISOString(),
    updatedAt: quotation.updatedAt.toISOString(),
    lineItems: quotation.lineItems.map((li) => ({
      ...li,
      quantity: Number(li.quantity),
      unitPrice: Number(li.unitPrice),
      lineTotal: Number(li.lineTotal),
    })),
  };
}

export async function updateQuotation(
  id: string,
  data: {
    validUntilDate?: Date;
    currency?: string;
    language?: string;
    vatEnabled?: boolean;
    vatPercentage?: number;
    discountType?: string;
    discountValue?: number;
    termsEn?: string | null;
    termsAr?: string | null;
    lineItems?: Array<{
      serviceId?: string | null;
      descriptionEn: string;
      descriptionAr?: string | null;
      quantity: number;
      unitPrice: number;
      sortOrder?: number;
    }>;
  },
  actorId: string,
): Promise<Quotation> {
  await assertActorNotOnLeave(actorId);

  const existing = await db.quotation.findUnique({
    where: { id },
    include: { lineItems: true },
  });
  if (!existing) throw new Error("Quotation not found");
  if (existing.status !== "draft") {
    throw new Error(`Only draft quotations can be edited (current status: ${existing.status})`);
  }

  const currency = data.currency || existing.currency;
  let rawRate = existing.rawRate ? Number(existing.rawRate) : null;
  let fxMarginPercent = Number(existing.fxMarginPercent);
  let effectiveRate = existing.effectiveRate ? Number(existing.effectiveRate) : null;

  if (currency !== "BHD" && data.currency && data.currency !== existing.currency) {
    const fxInfo = await getLatestExchangeRate("BHD", currency);
    rawRate = fxInfo.rate;
    fxMarginPercent = 3.0;
    effectiveRate = Math.round(rawRate * (1 + fxMarginPercent / 100) * 1000000) / 1000000;
  }

  const vatEnabled = data.vatEnabled !== undefined ? data.vatEnabled : existing.vatEnabled;
  const vatPercentage = data.vatPercentage !== undefined ? data.vatPercentage : Number(existing.vatPercentage);
  const discountType = data.discountType || existing.discountType;
  const discountValue = data.discountValue !== undefined ? data.discountValue : Number(existing.discountValue);

  const lines = data.lineItems || existing.lineItems.map((l) => ({
    serviceId: null,
    descriptionEn: l.descriptionEn,
    descriptionAr: l.descriptionAr,
    quantity: Number(l.quantity),
    unitPrice: Number(l.unitPrice),
    sortOrder: l.orderIndex,
  }));

  const { subtotal, discountAmount, vatAmount, totalAmount } = calculateInvoiceTotals(
    lines.map((item) => ({ quantity: item.quantity, unit_price: item.unitPrice, line_total: lineTotal(item.quantity, item.unitPrice, currency), description_en: item.descriptionEn })) as never,
    discountType as "none" | "percentage" | "fixed",
    discountValue,
    vatEnabled,
    vatPercentage,
    currency as never,
  );

  await db.$transaction(async (tx) => {
    if (data.lineItems) {
      await tx.quotationLineItem.deleteMany({ where: { quotationId: id } });
      await tx.quotationLineItem.createMany({
        data: data.lineItems.map((item, idx) => ({
          quotationId: id,
          descriptionEn: item.descriptionEn,
          descriptionAr: item.descriptionAr || null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: lineTotal(item.quantity, item.unitPrice, currency),
          orderIndex: item.sortOrder ?? idx,
        })),
      });
    }

    await tx.quotation.update({
      where: { id },
      data: {
        validUntilDate: data.validUntilDate || undefined,
        currency,
        language: data.language || undefined,
        subtotal,
        discountType,
        discountValue,
        discountAmount,
        vatEnabled,
        vatPercentage,
        vatAmount,
        totalAmount,
        rawRate,
        fxMarginPercent,
        effectiveRate,
        termsEn: data.termsEn !== undefined ? data.termsEn : undefined,
        termsAr: data.termsAr !== undefined ? data.termsAr : undefined,
        revision: { increment: 1 },
      },
    });
  });

  const updated = await getQuotationById(id);
  if (!updated) throw new Error("Failed to load updated quotation");
  return updated;
}

export async function submitQuotationForApproval(
  id: string,
  actorId: string,
  customDiscountReason?: string,
): Promise<{ success: boolean; approvalRequestId: string }> {
  await assertActorNotOnLeave(actorId);

  const quotation = await db.quotation.findUnique({
    where: { id },
    include: {
      lineItems: { orderBy: { orderIndex: "asc" } },
      client: true,
    },
  });

  if (!quotation) throw new Error("Quotation not found");
  if (quotation.status !== "draft") {
    throw new Error(`Quotation cannot be submitted: status is ${quotation.status}`);
  }

  // Nonzero discount triggers explicit approval reason
  const hasDiscount = Number(quotation.discountAmount) > 0;
  const discountReason = customDiscountReason || (hasDiscount
    ? `Quotation #${quotation.quotationNumber} includes a ${quotation.discountType} discount of ${quotation.discountValue} (${quotation.discountAmount} ${quotation.currency}).`
    : null);

  await db.quotation.update({ where: { id }, data: { status: "submitted" } });
  const approvalReq = await submitForApproval({
    targetType: "quotation",
    targetId: quotation.id,
    requesterId: actorId,
    policySnapshot: {
      totalAmount: Number(quotation.totalAmount),
      subtotal: Number(quotation.subtotal),
      currency: quotation.currency,
      discountAmount: Number(quotation.discountAmount),
      vatAmount: Number(quotation.vatAmount),
      clientName: quotation.client?.companyName || quotation.client?.firstName,
      rawRate: quotation.rawRate ? Number(quotation.rawRate) : null,
      effectiveRate: quotation.effectiveRate ? Number(quotation.effectiveRate) : null,
    },
    diffPayload: {
      quotationNumber: quotation.quotationNumber,
      totalAmount: Number(quotation.totalAmount),
      discountAmount: Number(quotation.discountAmount),
      currency: quotation.currency,
      lineItemsCount: quotation.lineItems.length,
    },
    discountReason,
    contentData: {
      total: quotation.totalAmount,
      currency: quotation.currency,
      lines: quotation.lineItems,
    },
  });

  return { success: true, approvalRequestId: approvalReq.approvalRequestId };
}

export async function issueQuotation(
  id: string,
  actorId: string,
  deliveryChannel?: string,
): Promise<Quotation> {
  await assertActorNotOnLeave(actorId);

  const quotation = await db.quotation.findUnique({
    where: { id },
    include: { lineItems: true, client: true },
  });

  if (!quotation) throw new Error("Quotation not found");

  // Gating: Must be Super Admin approved before issue/send
  if (quotation.status !== "approved") {
    throw new Error("Quotation delivery blocked: Super Admin approval is strictly required before issuing to the customer");
  }

  const updated = await db.quotation.update({
    where: { id },
    data: {
      status: "issued",
      deliveryChannel: deliveryChannel || null,
      deliveredAt: new Date(),
    },
    include: {
      lineItems: { orderBy: { orderIndex: "asc" } },
      client: true,
      createdBy: { select: { id: true, fullName: true, email: true } },
    },
  });

  return {
    ...updated,
    subtotal: Number(updated.subtotal),
    discountValue: Number(updated.discountValue),
    discountAmount: Number(updated.discountAmount),
    vatPercentage: Number(updated.vatPercentage),
    vatAmount: Number(updated.vatAmount),
    totalAmount: Number(updated.totalAmount),
    rawRate: updated.rawRate ? Number(updated.rawRate) : null,
    fxMarginPercent: Number(updated.fxMarginPercent),
    effectiveRate: updated.effectiveRate ? Number(updated.effectiveRate) : null,
    issueDate: updated.issueDate.toISOString(),
    validUntilDate: updated.validUntilDate.toISOString(),
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    lineItems: updated.lineItems.map((li) => ({
      ...li,
      quantity: Number(li.quantity),
      unitPrice: Number(li.unitPrice),
      lineTotal: Number(li.lineTotal),
    })),
  };
}

export async function acceptQuotation(
  id: string,
  actorId: string,
  evidence?: string | null,
): Promise<Quotation> {
  await assertActorNotOnLeave(actorId);

  const quotation = await db.quotation.findUnique({ where: { id } });
  if (!quotation) throw new Error("Quotation not found");
  if (quotation.status !== "issued") {
    throw new Error(`Quotation cannot be accepted: current status is ${quotation.status}`);
  }
  if (isQuotationExpired(quotation.validUntilDate)) {
    await db.quotation.update({ where: { id }, data: { status: "expired" } });
    throw new Error("This quotation has expired. Issue a new revision to the client.");
  }

  const updated = await db.quotation.update({
    where: { id },
    data: {
      status: "accepted",
      acceptanceEvidence: evidence || null,
    },
    include: {
      lineItems: { orderBy: { orderIndex: "asc" } },
      client: true,
      createdBy: { select: { id: true, fullName: true, email: true } },
    },
  });

  return {
    ...updated,
    subtotal: Number(updated.subtotal),
    discountValue: Number(updated.discountValue),
    discountAmount: Number(updated.discountAmount),
    vatPercentage: Number(updated.vatPercentage),
    vatAmount: Number(updated.vatAmount),
    totalAmount: Number(updated.totalAmount),
    rawRate: updated.rawRate ? Number(updated.rawRate) : null,
    fxMarginPercent: Number(updated.fxMarginPercent),
    effectiveRate: updated.effectiveRate ? Number(updated.effectiveRate) : null,
    issueDate: updated.issueDate.toISOString(),
    validUntilDate: updated.validUntilDate.toISOString(),
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    lineItems: updated.lineItems.map((li) => ({
      ...li,
      quantity: Number(li.quantity),
      unitPrice: Number(li.unitPrice),
      lineTotal: Number(li.lineTotal),
    })),
  };
}

export async function rejectQuotation(
  id: string,
  actorId: string,
  reason?: string,
): Promise<Quotation> {
  await assertActorNotOnLeave(actorId);

  const quotation = await db.quotation.findUnique({ where: { id } });
  if (!quotation) throw new Error("Quotation not found");
  if (!["issued", "accepted"].includes(quotation.status))
    throw new Error(`Only issued or accepted quotations can be rejected (current status: ${quotation.status})`);

  await db.quotation.update({
    where: { id },
    data: {
      status: "rejected",
      ...(reason ? { acceptanceEvidence: `Rejected: ${reason}` } : {}),
    },
  });

  const updated = await getQuotationById(id);
  if (!updated) throw new Error("Quotation not found");
  return updated;
}

/**
 * Converts an accepted quotation to an invoice.
 * Idempotent link: retries return the already existing invoice.
 */
export async function convertQuotationToInvoice(
  quotationId: string,
  actorId: string,
): Promise<{ invoiceId: string; invoiceNumber: string; isExisting: boolean }> {
  await assertActorNotOnLeave(actorId);

  return runAtomicMutation(async () => {
    // Lock first so two simultaneous clicks cannot both create an invoice.
    await db.$queryRaw`SELECT id FROM "Quotation" WHERE id = ${quotationId} FOR UPDATE`;
    const quotation = await db.quotation.findUnique({
      where: { id: quotationId },
      include: { lineItems: { orderBy: { orderIndex: "asc" } } },
    });
    if (!quotation) throw new Error("Quotation not found");

    // Idempotency: an already linked quotation returns its invoice.
    if (quotation.invoiceId) {
      const existingInv = await db.invoice.findUnique({
        where: { id: quotation.invoiceId },
        select: { id: true, invoiceNumber: true },
      });
      if (existingInv) return { invoiceId: existingInv.id, invoiceNumber: existingInv.invoiceNumber, isExisting: true };
    }
    if (quotation.status !== "accepted") {
      throw new Error(`Only accepted quotations can be converted to invoices (current status: ${quotation.status})`);
    }

    const company = await db.companySetting.findFirst({ select: { paymentTermsDays: true } });
    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + (company?.paymentTermsDays ?? 30));
    const invoiceNumber = await allocateDocumentNumber("invoice", issueDate);

    const inv = await db.invoice.create({
      data: {
        invoiceNumber,
        clientId: quotation.clientId,
        dealId: quotation.dealId,
        issueDate,
        dueDate,
        subtotal: quotation.subtotal,
        discountType: quotation.discountType,
        discountValue: quotation.discountValue,
        discountAmount: quotation.discountAmount,
        vatEnabled: quotation.vatEnabled,
        vatPercentage: quotation.vatPercentage,
        vatAmount: quotation.vatAmount,
        totalAmount: quotation.totalAmount,
        currency: quotation.currency,
        language: quotation.language,
        notesEn: quotation.termsEn,
        notesAr: quotation.termsAr,
        status: "draft",
        approvalStatus: "draft",
        createdById: actorId,
        lineItems: {
          create: quotation.lineItems.map((li, idx) => ({
            descriptionEn: li.descriptionEn,
            descriptionAr: li.descriptionAr,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            lineTotal: lineTotal(Number(li.quantity), Number(li.unitPrice), quotation.currency),
            displayOrder: idx + 1,
          })),
        },
      },
    });
    await db.quotation.update({ where: { id: quotationId }, data: { invoiceId: inv.id, status: "converted" } });
    return { invoiceId: inv.id, invoiceNumber: inv.invoiceNumber, isExisting: false };
  });
}

/** A quotation is valid through the end of its valid-until date. */
export function isQuotationExpired(validUntil: Date, now: Date = new Date()): boolean {
  const endOfDay = new Date(validUntil);
  endOfDay.setUTCHours(23, 59, 59, 999);
  return endOfDay < now;
}

export async function getQuotationById(id: string): Promise<Quotation | null> {
  const q = await db.quotation.findUnique({
    where: { id },
    include: {
      lineItems: { orderBy: { orderIndex: "asc" } },
      client: true,
      createdBy: { select: { id: true, fullName: true, email: true } },
      invoice: { select: { id: true, invoiceNumber: true, status: true } },
    },
  });

  if (!q) return null;

  return {
    ...q,
    subtotal: Number(q.subtotal),
    discountValue: Number(q.discountValue),
    discountAmount: Number(q.discountAmount),
    vatPercentage: Number(q.vatPercentage),
    vatAmount: Number(q.vatAmount),
    totalAmount: Number(q.totalAmount),
    rawRate: q.rawRate ? Number(q.rawRate) : null,
    fxMarginPercent: Number(q.fxMarginPercent),
    effectiveRate: q.effectiveRate ? Number(q.effectiveRate) : null,
    issueDate: q.issueDate.toISOString(),
    validUntilDate: q.validUntilDate.toISOString(),
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
    lineItems: q.lineItems.map((li) => ({
      ...li,
      quantity: Number(li.quantity),
      unitPrice: Number(li.unitPrice),
      lineTotal: Number(li.lineTotal),
    })),
  };
}

export async function listQuotations(filters: {
  status?: string;
  clientId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: Quotation[]; total: number }> {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
  const where: any = {};

  if (filters.status) where.status = filters.status;
  if (filters.clientId) where.clientId = filters.clientId;
  if (filters.search) {
    where.OR = [
      { quotationNumber: { contains: filters.search, mode: "insensitive" } },
      { client: { companyName: { contains: filters.search, mode: "insensitive" } } },
      { client: { firstName: { contains: filters.search, mode: "insensitive" } } },
    ];
  }

  const [total, records] = await Promise.all([
    db.quotation.count({ where }),
    db.quotation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        lineItems: { orderBy: { orderIndex: "asc" } },
        client: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    }),
  ]);

  return {
    total,
    items: records.map((q) => ({
      ...q,
      subtotal: Number(q.subtotal),
      discountValue: Number(q.discountValue),
      discountAmount: Number(q.discountAmount),
      vatPercentage: Number(q.vatPercentage),
      vatAmount: Number(q.vatAmount),
      totalAmount: Number(q.totalAmount),
      rawRate: q.rawRate ? Number(q.rawRate) : null,
      fxMarginPercent: Number(q.fxMarginPercent),
      effectiveRate: q.effectiveRate ? Number(q.effectiveRate) : null,
      issueDate: q.issueDate.toISOString(),
      validUntilDate: q.validUntilDate.toISOString(),
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString(),
      lineItems: q.lineItems.map((li) => ({
        ...li,
        quantity: Number(li.quantity),
        unitPrice: Number(li.unitPrice),
        lineTotal: Number(li.lineTotal),
      })),
    })),
  };
}

export async function getAcceptedQuotationsUninvoiced(): Promise<Quotation[]> {
  const records = await db.quotation.findMany({
    where: {
      status: "accepted",
      invoiceId: null,
    },
    orderBy: { updatedAt: "desc" },
    include: {
      lineItems: { orderBy: { orderIndex: "asc" } },
      client: true,
      createdBy: { select: { id: true, fullName: true, email: true } },
    },
  });

  return records.map((q) => ({
    ...q,
    subtotal: Number(q.subtotal),
    discountValue: Number(q.discountValue),
    discountAmount: Number(q.discountAmount),
    vatPercentage: Number(q.vatPercentage),
    vatAmount: Number(q.vatAmount),
    totalAmount: Number(q.totalAmount),
    rawRate: q.rawRate ? Number(q.rawRate) : null,
    fxMarginPercent: Number(q.fxMarginPercent),
    effectiveRate: q.effectiveRate ? Number(q.effectiveRate) : null,
    issueDate: q.issueDate.toISOString(),
    validUntilDate: q.validUntilDate.toISOString(),
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
    lineItems: q.lineItems.map((li) => ({
      ...li,
      quantity: Number(li.quantity),
      unitPrice: Number(li.unitPrice),
      lineTotal: Number(li.lineTotal),
    })),
  }));
}

