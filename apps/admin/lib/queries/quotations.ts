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
import { updateQuotation as updateSalesQuotation } from "../api/sales";

import { db, runAtomicMutation } from "../atomic";
import { getCompanyConfiguration } from "../api/company";
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
    salesOwnerId?: string | null;
    lineItems: {
      itemKind?: "service" | "product" | "custom";
      serviceId?: string | null;
      productId?: string | null;
      variantId?: string | null;
      sku?: string | null;
      unit?: string | null;
      descriptionEn: string;
      descriptionAr?: string | null;
      quantity: number;
      unitPrice: number;
      taxRate?: number;
      sortOrder?: number;
    }[];
  },
  actorId: string,
): Promise<Quotation> {
  await assertActorNotOnLeave(actorId);

  const currency = await assertCompanyCurrency(data.currency);
  const quotationNumber = await getNextSequenceNumber("QTE");

  const { vatEnabled, vatPercentage } = await companyVat();
  const otherTaxes = await companyTaxes("quotation");
  const itemsWithTotals = data.lineItems.map((item, idx) => ({
    itemKind:
      item.itemKind ||
      (item.serviceId ? "service" : item.productId ? "product" : "custom"),
    serviceId: item.serviceId || null,
    productId: item.productId || null,
    variantId: item.variantId || null,
    sku: item.sku || null,
    unit: item.unit || null,
    descriptionEn: item.descriptionEn,
    descriptionAr: item.descriptionAr || null,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    taxRate: Number(item.taxRate ?? 0),
    lineTotal: lineTotal(
      Number(item.quantity),
      Number(item.unitPrice),
      currency,
    ),
    orderIndex: item.sortOrder ?? idx,
  }));
  const {
    subtotal,
    discountAmount,
    vatAmount,
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

  const created = await createSalesQuotation({
    quotationNumber,
    contactId: data.clientId || null,
    dealId: data.dealId || null,
    status: "draft",
    subtotal,
    discount: discountAmount,
    vatRate: vatEnabled ? vatPercentage : 0,
    vatAmount,
    total: totalAmount,
    currency,
    validUntil: data.validUntilDate,
    terms: data.termsEn || null,
    notes: data.termsAr || null,
    items: itemsWithTotals.map((item) => ({
      itemKind: item.itemKind,
      serviceId: item.serviceId,
      productId: item.productId,
      variantId: item.variantId,
      sku: item.sku,
      unit: item.unit,
      description: item.descriptionEn,
      descriptionEn: item.descriptionEn,
      descriptionAr: item.descriptionAr,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate,
      amount: item.lineTotal,
      sortOrder: item.orderIndex,
    })),
  });

  return mapApiQuotationToQuotation(created);
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

  const existing = await getQuotationById(id);
  if (!existing) throw new Error(serverMessages.quotationNotFound);
  if (existing.status !== "draft") {
    throw new Error(
      formatMessage(serverTemplates.onlyDraftQuotationsCanBeEditedCurrent, {
        0: existing.status,
      }),
    );
  }

  await updateSalesQuotation(id, {
    termsEn: data.termsEn,
    terms: data.termsEn,
    vatPercentage: data.vatPercentage,
    discountValue: data.discountValue,
    currency: data.currency,
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

export async function convertQuotationToInvoice(
  quotationId: string,
  actorId: string,
): Promise<{ invoiceId: string; invoiceNumber: string; isExisting: boolean }> {
  await assertActorNotOnLeave(actorId);

  const quotation = await getQuotationById(quotationId);
  if (!quotation) throw new Error(serverMessages.quotationNotFound);

  const {
    listInvoices,
    createInvoiceFromQuotation,
  } = await import("../api/finance");

  const existingList = await listInvoices({ quotationId }).catch(() => []);
  if (Array.isArray(existingList) && existingList.length > 0) {
    return {
      invoiceId: existingList[0].id,
      invoiceNumber: existingList[0].invoiceNumber,
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

  const company = await getCompanyConfiguration().catch(() => null);
  const issueDate = new Date();
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + ((company as any)?.paymentTermsDays ?? 30));
  const invoiceNumber = await allocateDocumentNumber("invoice", issueDate);

  await assertCompanyCurrency(quotation.currency);
  const created = await createInvoiceFromQuotation({
    quotationId,
    invoiceNumber,
    issueDate: issueDate.toISOString().slice(0, 10),
    dueDate: dueDate.toISOString().slice(0, 10),
    notes: quotation.termsAr || quotation.termsEn || null,
    terms: quotation.termsEn || null,
    quotationNumber: quotation.quotationNumber,
    dealId: quotation.dealId || null,
    contactId: quotation.clientId || null,
    currency: quotation.currency,
    subtotal: Number(quotation.subtotal),
    discount: Number(quotation.discountAmount || 0),
    vatRate: Number(quotation.vatPercentage || 0),
    vatAmount: Number(quotation.vatAmount || 0),
    total: Number(quotation.totalAmount),
    items: (quotation.lineItems || []).map((li: any, idx: number) => ({
      id: li.id || `qi-${idx + 1}`,
      itemKind: li.itemKind || (li.serviceId ? "service" : li.productId ? "product" : "custom"),
      serviceId: li.serviceId || null,
      productId: li.productId || null,
      variantId: li.variantId || null,
      sku: li.sku || null,
      unit: li.unit || null,
      description: li.descriptionEn || "",
      descriptionEn: li.descriptionEn || "",
      descriptionAr: li.descriptionAr || "",
      quantity: Number(li.quantity || 1),
      unitPrice: Number(li.unitPrice || 0),
      taxRate: Number(li.taxRate || 0),
      amount: Number(li.lineTotal || 0),
      sortOrder: Number(li.orderIndex || idx),
    })),
  });

  await updateSalesQuotationStatus(quotationId, "converted").catch(() => null);

  return {
    invoiceId: created.id,
    invoiceNumber: created.invoiceNumber,
    isExisting: false,
  };
}

export function isQuotationExpired(
  validUntil: Date,
  now: Date = new Date(),
): boolean {
  const endOfDay = new Date(validUntil);
  endOfDay.setUTCHours(23, 59, 59, 999);
  return endOfDay < now;
}

function toIso(val: any): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "string") return new Date(val).toISOString();
  return new Date(val).toISOString();
}

export async function getQuotationById(id: string): Promise<Quotation | null> {
  try {
    const { getQuotation, listQuotations } = await import("@platform/api-client");
    let q = await getQuotation(id).catch(() => null);
    if (!q) {
      const all = await listQuotations().catch(() => []);
      const matched: any = all.find(
        (item: any) =>
          (item.id || item.ID) === id ||
          (item.quotationNumber || item.QuotationNumber) === id,
      );
      if (matched) {
        q = await getQuotation(matched.id || matched.ID).catch(() => null);
      }
    }
    if (q) {
      return await mapApiQuotationToQuotation(q);
    }
  } catch (e) {
    console.warn(`api-client getQuotation ${id} failed:`, e);
  }

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
    issueDate: toIso(q.issueDate),
    validUntilDate: toIso(q.validUntilDate),
    createdAt: toIso(q.createdAt),
    updatedAt: toIso(q.updatedAt),
    lineItems: q.lineItems.map((li) => ({
      ...li,
      quantity: Number(li.quantity),
      unitPrice: Number(li.unitPrice),
      lineTotal: Number(li.lineTotal),
    })),
  };
}

async function mapApiQuotationToQuotation(q: any): Promise<Quotation> {
  let clientObj: any = null;
  const contactId = q.contactId || q.ContactID;
  if (contactId) {
    try {
      const { getContact } = await import("@platform/api-client");
      clientObj = await getContact(contactId).catch(() => null);
    } catch {
    }
  }

  const subtotal = Number(q.subtotal || q.Subtotal || 0);
  const discountAmount = Number(q.discount || q.Discount || 0);
  const vatAmount = Number(q.vatAmount || q.VatAmount || 0);
  const totalAmount = Number(q.total || q.Total || 0);
  const items = q.items || q.lineItems || [];

  return {
    id: q.id || q.ID,
    quotationNumber: q.quotationNumber || q.QuotationNumber || q.id,
    revision: 1,
    dealId: q.dealId || q.DealID || null,
    clientId: contactId || null,
    inquiryId: null,
    invoiceId: null,
    issueDate: q.issuedAt || q.IssuedAt || q.createdAt || q.CreatedAt || new Date().toISOString(),
    validUntilDate: q.validUntil || q.ValidUntil || new Date(Date.now() + 30 * 86400000).toISOString(),
    subtotal,
    vatEnabled: vatAmount > 0,
    vatPercentage: Number(q.vatRate || q.VatRate || 0),
    vatAmount,
    otherTaxAmount: 0,
    taxes: [],
    discountType: discountAmount > 0 ? "fixed" : "none",
    discountValue: discountAmount,
    discountAmount,
    totalAmount,
    currency: q.currency || q.Currency || "",
    language: q.language || q.Language || "",
    status: (q.status || q.Status || "draft") as any,
    termsEn: q.terms || q.Terms || null,
    termsAr: q.notes || q.Notes || null,
    createdById: null,
    createdAt: q.createdAt || q.CreatedAt || new Date().toISOString(),
    updatedAt: q.updatedAt || q.UpdatedAt || new Date().toISOString(),
    lineItems: items.map((li: any, idx: number) => ({
      id: li.id || li.ID || `qi-${idx + 1}`,
      quotationId: q.id || q.ID,
      itemKind: li.itemKind || li.ItemKind || "custom",
      serviceId: li.serviceId || li.ServiceID || null,
      productId: li.productId || li.ProductID || null,
      variantId: li.variantId || li.VariantID || null,
      sku: li.sku || li.Sku || null,
      unit: li.unit || li.Unit || null,
      descriptionEn: li.descriptionEn || li.DescriptionEn || li.description || li.Description || "",
      descriptionAr: li.descriptionAr || li.DescriptionAr || li.description || li.Description || null,
      quantity: Number(li.quantity || li.Quantity || 1),
      unitPrice: Number(li.unitPrice || li.UnitPrice || 0),
      taxRate: Number(li.taxRate || li.TaxRate || 0),
      lineTotal: Number(li.amount || li.Amount || li.lineTotal || 0),
      orderIndex: Number(li.sortOrder || li.SortOrder || idx + 1),
    })),
    client: clientObj
      ? {
          id: clientObj.id || clientObj.ID,
          name: `${clientObj.firstName || ""} ${clientObj.lastName || ""}`.trim() || clientObj.company || clientObj.companyName || "Client",
          companyName: clientObj.company || clientObj.companyName || undefined,
          email: clientObj.email || null,
          phone: clientObj.phone || null,
        }
      : null,
  };
}

export interface QuotationListSummary {
  total: number;
  pendingApproval: number;
  acceptedOrConverted: number;
  openValueByCurrency: Record<string, number>;
}

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
        const cur = q.currency || "USD";
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
      currency: q.currency || q.Currency || "USD",
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
      currency: q.currency || "USD",
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
