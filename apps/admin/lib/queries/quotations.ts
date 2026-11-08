import {
  serverTemplates,
  formatMessage,
  serverMessages,
} from "@platform/locales";
import {
  listQuotations as listSalesQuotations,
  getQuotation as getSalesQuotation,
  createQuotation as createSalesQuotation,
  updateQuotationStatus as updateSalesQuotationStatus,
} from "@platform/api-client";

import { db, runAtomicMutation } from "../atomic";
import { Quotation, calculateInvoiceTotals } from "../types";
import { getNextSequenceNumber } from "./sequence";
import { allocateDocumentNumber } from "../finance/numbering";
import { lineTotal, roundMoney } from "../finance/money";
import { discountDecision } from "../finance/discount-policy";
import { resolveSalesOwner } from "./sales-attribution";
import {
  OPEN_QUOTATION_STATUSES,
} from "../constants/finance";
import { submitForApproval } from "../services/approval-engine";
import { assertActorNotOnLeave } from "./leave";
import { assertCompanyCurrency } from "../finance/company-currency";
import { advanceDealForEvent } from "./crm";
import {
  companyTaxes,
  companyVat,
  documentTaxRows,
  mapDocumentTaxLines,
} from "../finance/vat";

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
    /** Salesperson credited with the quotation; defaults to the issuer. */
    salesOwnerId?: string | null;
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

  const currency = await assertCompanyCurrency(data.currency);
  const quotationNumber = await getNextSequenceNumber("QTE");

  // Same totals rules as invoices (validation, per-currency rounding).
  const { vatEnabled, vatPercentage } = await companyVat();
  const otherTaxes = await companyTaxes("quotation");
  const itemsWithTotals = data.lineItems.map((item, idx) => ({
    descriptionEn: item.descriptionEn,
    descriptionAr: item.descriptionAr || null,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    lineTotal: lineTotal(
      Number(item.quantity),
      Number(item.unitPrice),
      currency,
    ),
    orderIndex: idx,
  }));
  const {
    subtotal,
    discountAmount,
    vatAmount,
    taxes,
    otherTaxAmount,
    totalAmount,
  } = calculateInvoiceTotals(
    itemsWithTotals.map((item) => ({
      quantity: item.quantity,
      unit_price: item.unitPrice,
      line_total: item.lineTotal,
      description_en: item.descriptionEn,
    })) as never,
    data.discountType || "none",
    data.discountValue || 0,
    vatEnabled,
    vatPercentage,
    currency as never,
    otherTaxes,
  );

  const quotation = await db.$transaction(async (tx) => {
    await assertCompanyCurrency(currency, tx);
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
        vatEnabled,
        vatPercentage,
        vatAmount,
        otherTaxAmount,
        taxes: { create: documentTaxRows(otherTaxes, taxes) },
        totalAmount,
        rawRate: null,
        fxMarginPercent: 0,
        effectiveRate: null,
        status: "draft",
        termsEn: data.termsEn || null,
        termsAr: data.termsAr || null,
        createdById: actorId,
        salesOwnerId: await resolveSalesOwner(data.salesOwnerId, actorId),
        lineItems: {
          create: itemsWithTotals,
        },
      },
      include: {
        lineItems: { orderBy: { orderIndex: "asc" } },

        taxes: { orderBy: { displayOrder: "asc" } },
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
    otherTaxAmount: Number(quotation.otherTaxAmount ?? 0),
    taxes: mapDocumentTaxLines(quotation.taxes),
    totalAmount: Number(quotation.totalAmount),
    rawRate: quotation.rawRate ? Number(quotation.rawRate) : null,
    fxMarginPercent: Number(quotation.fxMarginPercent),
    effectiveRate: quotation.effectiveRate
      ? Number(quotation.effectiveRate)
      : null,
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
    include: { lineItems: true, taxes: { orderBy: { displayOrder: "asc" } } },
  });
  if (!existing) throw new Error(serverMessages.quotationNotFound);
  if (existing.status !== "draft") {
    throw new Error(
      formatMessage(serverTemplates.onlyDraftQuotationsCanBeEditedCurrent, {
        0: existing.status,
      }),
    );
  }

  await assertCompanyCurrency(existing.currency);
  const currency = await assertCompanyCurrency(data.currency);

  const { vatEnabled, vatPercentage } = await companyVat();
  const otherTaxes = await companyTaxes("quotation");
  const discountType = data.discountType || existing.discountType;
  const discountValue =
    data.discountValue !== undefined
      ? data.discountValue
      : Number(existing.discountValue);

  const lines =
    data.lineItems ||
    existing.lineItems.map((l) => ({
      serviceId: null,
      descriptionEn: l.descriptionEn,
      descriptionAr: l.descriptionAr,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      sortOrder: l.orderIndex,
    }));

  const {
    subtotal,
    discountAmount,
    vatAmount,
    taxes,
    otherTaxAmount,
    totalAmount,
  } = calculateInvoiceTotals(
    lines.map((item) => ({
      quantity: item.quantity,
      unit_price: item.unitPrice,
      line_total: lineTotal(item.quantity, item.unitPrice, currency),
      description_en: item.descriptionEn,
    })) as never,
    discountType as "none" | "percentage" | "fixed",
    discountValue,
    vatEnabled,
    vatPercentage,
    currency as never,
    otherTaxes,
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

    await tx.documentTax.deleteMany({ where: { quotationId: id } });
    await tx.documentTax.createMany({
      data: documentTaxRows(otherTaxes, taxes).map((row) => ({
        ...row,
        quotationId: id,
      })),
    });
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
        otherTaxAmount,
        totalAmount,
        rawRate: null,
        fxMarginPercent: 0,
        effectiveRate: null,
        termsEn: data.termsEn !== undefined ? data.termsEn : undefined,
        termsAr: data.termsAr !== undefined ? data.termsAr : undefined,
        revision: { increment: 1 },
      },
    });
  });

  const updated = await getQuotationById(id);
  if (!updated) throw new Error(serverMessages.failedToLoadUpdatedQuotation);
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

      taxes: { orderBy: { displayOrder: "asc" } },
      client: true,
    },
  });

  if (!quotation) throw new Error(serverMessages.quotationNotFound);
  if (quotation.status !== "draft") {
    throw new Error(
      formatMessage(serverTemplates.quotationCannotBeSubmittedStatusIs0, {
        0: quotation.status,
      }),
    );
  }

  // Discounts within the issuer's limit need no approval; above it the issuer must explain why.
  const discount = await discountDecision(
    actorId,
    Number(quotation.subtotal),
    Number(quotation.discountAmount),
  );
  if (!discount.withinLimit && !customDiscountReason?.trim())
    throw new Error(
      formatMessage(serverTemplates.this0DiscountIsAboveYour1, {
        0: discount.percent,
        1: discount.limit,
      }),
    );
  const hasDiscount = Number(quotation.discountAmount) > 0;
  const discountReason =
    customDiscountReason?.trim() ||
    (hasDiscount
      ? `Quotation #${quotation.quotationNumber} includes a ${discount.percent}% discount (${quotation.discountAmount} ${quotation.currency}), within the ${discount.limit ?? "unlimited"}% limit.`
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
      discountPercent: discount.percent,
      discountLimit: discount.limit,
      vatAmount: Number(quotation.vatAmount),
      otherTaxAmount: Number(quotation.otherTaxAmount ?? 0),
      taxes: mapDocumentTaxLines(quotation.taxes),
      clientName: quotation.client?.companyName || quotation.client?.firstName,
      rawRate: quotation.rawRate ? Number(quotation.rawRate) : null,
      effectiveRate: quotation.effectiveRate
        ? Number(quotation.effectiveRate)
        : null,
    },
    diffPayload: {
      quotationNumber: quotation.quotationNumber,
      totalAmount: Number(quotation.totalAmount),
      discountAmount: Number(quotation.discountAmount),
      currency: quotation.currency,
      lineItemsCount: quotation.lineItems.length,
    },
    discountReason,
    autoApproveReason: discount.needsApproval
      ? null
      : hasDiscount
        ? "within_discount_limit"
        : "no_discount",
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
    include: {
      lineItems: true,
      client: true,
      taxes: { orderBy: { displayOrder: "asc" } },
    },
  });

  if (!quotation) throw new Error(serverMessages.quotationNotFound);

  // Gating: Must be Super Admin approved before issue/send
  if (quotation.status !== "approved") {
    throw new Error(
      serverMessages.quotationDeliveryBlockedSuperAdminApprovalIs,
    );
  }
  if (!quotation.signedAt)
    throw new Error(serverMessages.signAndStampThisQuotationBeforeSending);

  const updated = await db.$transaction(async (tx) => {
    const issued = await tx.quotation.update({
      where: { id },
      data: {
        status: "issued",
        deliveryChannel: deliveryChannel || null,
        deliveredAt: new Date(),
      },
      include: {
        lineItems: { orderBy: { orderIndex: "asc" } },

        taxes: { orderBy: { displayOrder: "asc" } },
        client: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });
    await advanceDealForEvent(tx, issued.dealId, "quotation_issued");
    return issued;
  });

  return {
    ...updated,
    subtotal: Number(updated.subtotal),
    discountValue: Number(updated.discountValue),
    discountAmount: Number(updated.discountAmount),
    vatPercentage: Number(updated.vatPercentage),
    vatAmount: Number(updated.vatAmount),
    otherTaxAmount: Number(updated.otherTaxAmount ?? 0),
    taxes: mapDocumentTaxLines(updated.taxes),
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
  if (!quotation) throw new Error(serverMessages.quotationNotFound);
  if (quotation.status !== "issued") {
    throw new Error(
      formatMessage(serverTemplates.quotationCannotBeAcceptedCurrentStatusIs, {
        0: quotation.status,
      }),
    );
  }
  if (isQuotationExpired(quotation.validUntilDate)) {
    await db.quotation.update({ where: { id }, data: { status: "expired" } });
    throw new Error(serverMessages.thisQuotationHasExpiredIssueANew);
  }

  const updated = await db.$transaction(async (tx) => {
    const accepted = await tx.quotation.update({
      where: { id },
      data: {
        status: "accepted",
        acceptanceEvidence: evidence || null,
      },
      include: {
        lineItems: { orderBy: { orderIndex: "asc" } },

        taxes: { orderBy: { displayOrder: "asc" } },
        client: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });
    await advanceDealForEvent(tx, accepted.dealId, "quotation_accepted");
    return accepted;
  });

  return {
    ...updated,
    subtotal: Number(updated.subtotal),
    discountValue: Number(updated.discountValue),
    discountAmount: Number(updated.discountAmount),
    vatPercentage: Number(updated.vatPercentage),
    vatAmount: Number(updated.vatAmount),
    otherTaxAmount: Number(updated.otherTaxAmount ?? 0),
    taxes: mapDocumentTaxLines(updated.taxes),
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
  if (!quotation) throw new Error(serverMessages.quotationNotFound);
  if (!["issued", "accepted"].includes(quotation.status))
    throw new Error(
      formatMessage(serverTemplates.onlyIssuedOrAcceptedQuotationsCanBe, {
        0: quotation.status,
      }),
    );

  await db.quotation.update({
    where: { id },
    data: {
      status: "rejected",
      ...(reason ? { acceptanceEvidence: `Rejected: ${reason}` } : {}),
    },
  });

  const updated = await getQuotationById(id);
  if (!updated) throw new Error(serverMessages.quotationNotFound);
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
      include: {
        lineItems: { orderBy: { orderIndex: "asc" } },
        taxes: { orderBy: { displayOrder: "asc" } },
      },
    });
    if (!quotation) throw new Error(serverMessages.quotationNotFound);

    // Idempotency: an already linked quotation returns its invoice.
    if (quotation.invoiceId) {
      const existingInv = await db.invoice.findUnique({
        where: { id: quotation.invoiceId },
        select: { id: true, invoiceNumber: true },
      });
      if (existingInv)
        return {
          invoiceId: existingInv.id,
          invoiceNumber: existingInv.invoiceNumber,
          isExisting: true,
        };
    }
    if (quotation.status !== "accepted") {
      throw new Error(
        formatMessage(serverTemplates.onlyAcceptedQuotationsCanBeConvertedTo, {
          0: quotation.status,
        }),
      );
    }

    const company = await db.companySetting.findFirst({
      select: { paymentTermsDays: true },
    });
    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + (company?.paymentTermsDays ?? 30));
    const invoiceNumber = await allocateDocumentNumber("invoice", issueDate);

    await assertCompanyCurrency(quotation.currency);
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
        // The invoice charges exactly what the client accepted, including the other taxes.
        otherTaxAmount: quotation.otherTaxAmount,
        taxes: {
          create: (quotation.taxes ?? []).map(
            ({
              taxRateId,
              code,
              nameEn,
              nameAr,
              ratePercent,
              registrationNumber,
              amount,
              displayOrder,
            }) => ({
              taxRateId,
              code,
              nameEn,
              nameAr,
              ratePercent,
              registrationNumber,
              amount,
              displayOrder,
            }),
          ),
        },
        totalAmount: quotation.totalAmount,
        currency: quotation.currency,
        language: quotation.language,
        notesEn: quotation.termsEn,
        notesAr: quotation.termsAr,
        status: "draft",
        approvalStatus: "draft",
        createdById: actorId,
        salesOwnerId: quotation.salesOwnerId ?? actorId,
        lineItems: {
          create: quotation.lineItems.map((li, idx) => ({
            descriptionEn: li.descriptionEn,
            descriptionAr: li.descriptionAr,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            lineTotal: lineTotal(
              Number(li.quantity),
              Number(li.unitPrice),
              quotation.currency,
            ),
            displayOrder: idx + 1,
          })),
        },
      },
    });
    await db.quotation.update({
      where: { id: quotationId },
      data: { invoiceId: inv.id, status: "converted" },
    });
    return {
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      isExisting: false,
    };
  });
}

/** A quotation is valid through the end of its valid-until date. */
export function isQuotationExpired(
  validUntil: Date,
  now: Date = new Date(),
): boolean {
  const endOfDay = new Date(validUntil);
  endOfDay.setUTCHours(23, 59, 59, 999);
  return endOfDay < now;
}

export async function getQuotationById(id: string): Promise<Quotation | null> {
  const q = await db.quotation.findUnique({
    where: { id },
    include: {
      lineItems: { orderBy: { orderIndex: "asc" } },

      taxes: { orderBy: { displayOrder: "asc" } },
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
    otherTaxAmount: Number(q.otherTaxAmount ?? 0),
    taxes: mapDocumentTaxLines(q.taxes),
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

export interface QuotationListSummary {
  total: number;
  pendingApproval: number;
  acceptedOrConverted: number;
  /** Open pipeline value per currency; amounts in different currencies are never added together. */
  openValueByCurrency: Record<string, number>;
}

/** Headline figures for the quotations list, across every quotation (not just the current page). */
export async function getQuotationListSummary(): Promise<QuotationListSummary> {
  try {
    const list = await listSalesQuotations();
    const summary: QuotationListSummary = {
      total: 0,
      pendingApproval: 0,
      acceptedOrConverted: 0,
      openValueByCurrency: {},
    };
    for (const q of list || []) {
      summary.total++;
      if (q.status === "submitted") summary.pendingApproval++;
      if (q.status === "accepted" || q.status === "converted")
        summary.acceptedOrConverted++;
      if ((OPEN_QUOTATION_STATUSES as readonly string[]).includes(q.status)) {
        const cur =
          q.currency ||
          process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ||
          process.env.DEFAULT_CURRENCY ||
          "USD";
        summary.openValueByCurrency[cur] = roundMoney(
          (summary.openValueByCurrency[cur] ?? 0) + Number(q.total ?? 0),
          cur,
        );
      }
    }
    return summary;
  } catch {
    return {
      total: 0,
      pendingApproval: 0,
      acceptedOrConverted: 0,
      openValueByCurrency: {},
    };
  }
}

export async function listQuotations(filters: {
  status?: string;
  clientId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: Quotation[]; total: number }> {
  try {
    const list = await listSalesQuotations();
    let filtered = list || [];
    if (filters.status) filtered = filtered.filter((q) => q.status === filters.status);
    if (filters.clientId) filtered = filtered.filter((q) => q.contactId === filters.clientId);
    if (filters.search) {
      const s = filters.search.toLowerCase();
      filtered = filtered.filter((q) => q.quotationNumber.toLowerCase().includes(s));
    }
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
    const total = filtered.length;
    const items = filtered.slice((page - 1) * pageSize, page * pageSize).map((q: any) => ({
      id: q.id || q.ID || "",
      quotationNumber: q.quotationNumber || q.QuotationNumber || "",
      revision: 1,
      dealId: q.dealId || q.DealID || null,
      clientId: q.contactId || q.ContactID || null,
      issueDate: q.issuedAt || q.createdAt || q.CreatedAt || new Date().toISOString(),
      validUntilDate: q.validUntil || q.createdAt || q.CreatedAt || new Date().toISOString(),
      subtotal: Number(q.subtotal || q.Subtotal || 0),
      vatEnabled: true,
      vatPercentage: Number(q.vatRate ?? q.VatRate ?? 10),
      vatAmount: Number(q.vatAmount ?? q.VatAmount ?? 0),
      discountType: "fixed",
      discountValue: Number(q.discount ?? q.Discount ?? 0),
      discountAmount: Number(q.discount ?? q.Discount ?? 0),
      totalAmount: Number(q.total ?? q.Total ?? 0),
      currency:
        q.currency ||
        q.Currency ||
        process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ||
        process.env.DEFAULT_CURRENCY ||
        "USD",
      language: "ar",
      status: q.status || q.Status || "draft",
      createdAt: q.createdAt || q.CreatedAt || new Date().toISOString(),
      updatedAt: q.updatedAt || q.UpdatedAt || new Date().toISOString(),
      lineItems: [],
    }));
    return { items, total };
  } catch (e) {
    console.error("Error listing quotations:", e);
    return { items: [], total: 0 };
  }
}

export async function getAcceptedQuotationsUninvoiced(): Promise<Quotation[]> {
  try {
    const list = await listSalesQuotations();
    const filtered = (list || []).filter((q) => q.status === "accepted");
    return filtered.map((q: any) => ({
      id: q.id,
      quotationNumber: q.quotationNumber,
      revision: 1,
      dealId: q.dealId,
      clientId: q.contactId,
      issueDate: q.issuedAt || q.createdAt,
      validUntilDate: q.validUntil || q.createdAt,
      subtotal: Number(q.subtotal),
      vatEnabled: true,
      vatPercentage: Number(q.vatRate ?? 10),
      vatAmount: Number(q.vatAmount ?? 0),
      discountType: "fixed",
      discountValue: Number(q.discount ?? 0),
      discountAmount: Number(q.discount ?? 0),
      totalAmount: Number(q.total ?? 0),
      currency:
        q.currency ||
        process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ||
        process.env.DEFAULT_CURRENCY ||
        "USD",
      language: "ar",
      status: q.status || "draft",
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
      lineItems: [],
    }));
  } catch {
    return [];
  }
}
