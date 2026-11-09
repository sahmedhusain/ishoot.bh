import { assertCompanyCurrency } from "../finance/company-currency";
import {
  serverTemplates,
  formatMessage,
  serverMessages,
} from "@platform/locales";

import { db } from "../atomic";
import {
  Invoice,
  DiscountType,
  SupportedCurrency,
  InvoiceStatus,
  calculateInvoiceTotals,
} from "../types";

import {
  amountDue as computeAmountDue,
  lineTotal,
  sumMoney,
} from "../finance/money";
import { allocateDocumentNumber } from "../finance/numbering";
import { resolveSalesOwner } from "./sales-attribution";
import {
  INVOICE_STATUS_TRANSITIONS,
} from "../constants/finance";
import { advanceDealForEvent } from "./crm";
import {
  companyTaxes,
  companyVat,
  documentTaxRows,
  frozenTaxes,
  mapDocumentTaxLines,
} from "../finance/vat";

export { calculateInvoiceTotals };

function mapPrismaInvoiceToInvoice(inv: any): Invoice {
  const subtotal = Number(inv.subtotal);
  const discountAmount = Number(inv.discountAmount);
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const vatAmount = Number(inv.vatAmount);
  const totalAmount = Number(inv.totalAmount);

  const currencyCode = inv.currency || "USD";
  const amountPaid = sumMoney(
    (inv.payments || []).map((p: any) => p.amount),
    currencyCode,
  );
  const amountDue = computeAmountDue(totalAmount, amountPaid, currencyCode);
  const contactObj = inv.client || inv.deal?.contact;

  return {
    id: inv.id,
    invoice_number: inv.invoiceNumber,
    contact_id: inv.clientId || inv.deal?.contactId || "",
    deal_id: inv.dealId || undefined,
    issue_date: inv.issueDate.toISOString().split("T")[0],
    due_date: inv.dueDate.toISOString().split("T")[0],
    subtotal,
    discount_type:
      (inv.discountType as DiscountType) ||
      (discountAmount > 0 ? "fixed" : "none"),
    discount_value: Number(inv.discountValue || discountAmount),
    discount_amount: discountAmount,
    after_discount: afterDiscount,
    vat_enabled: inv.vatEnabled ?? vatAmount > 0,
    vat_percentage: inv.vatPercentage != null ? Number(inv.vatPercentage) : 10,
    vat_amount: vatAmount,
    other_taxes: mapDocumentTaxLines(inv.taxes),
    other_tax_amount: Number(inv.otherTaxAmount ?? 0),
    total_amount: totalAmount,
    amount_paid: amountPaid,
    amount_due: amountDue,
    currency: String(inv.currency ?? ""),
    language: (inv.language as "en" | "ar") || "ar",
    status: (inv.status as InvoiceStatus) || "draft",
    pdf_storage_path: inv.pdfStoragePath || undefined,
    delivery_channel: (inv.deliveryChannel as any) || undefined,
    delivered_at: inv.deliveredAt ? inv.deliveredAt.toISOString() : undefined,
    notes_en: inv.notesEn || undefined,
    notes_ar: inv.notesAr || undefined,
    created_by: inv.createdById || undefined,
    created_at: inv.createdAt.toISOString(),
    updated_at: inv.updatedAt.toISOString(),
    line_items: inv.lineItems
      ? inv.lineItems.map((li: any) => ({
          id: li.id,
          invoice_id: li.invoiceId,
          service_id: li.serviceId || undefined,
          description_en: li.descriptionEn,
          description_ar: li.descriptionAr || undefined,
          quantity: Number(li.quantity),
          unit_price: Number(li.unitPrice),
          line_total: Number(li.lineTotal),
          display_order: li.displayOrder,
        }))
      : [],
    contact: contactObj
      ? {
          id: contactObj.id,
          full_name:
            `${contactObj.firstName || ""} ${contactObj.lastName || ""}`.trim() ||
            contactObj.companyName ||
            "Client",
          email: contactObj.email || "",
          phone: contactObj.phone || undefined,
          company: contactObj.companyName || undefined,
          job_title: contactObj.jobTitle || undefined,
          notes: contactObj.notes || undefined,
          created_at: contactObj.createdAt
            ? contactObj.createdAt.toISOString()
            : new Date().toISOString(),
          updated_at: contactObj.updatedAt
            ? contactObj.updatedAt.toISOString()
            : new Date().toISOString(),
        }
      : undefined,
  };
}

export async function getAllInvoices(options?: {
  limit?: number;
  offset?: number;
  status?: InvoiceStatus;
}): Promise<Invoice[]> {
  try {
    const invoices = await db.invoice.findMany({
      where: options?.status ? { status: options.status } : undefined,
      take: options?.limit,
      skip: options?.offset,
      include: {
        client: true,
        lineItems: true,

        taxes: { orderBy: { displayOrder: "asc" } },
        payments: true,
        deal: {
          include: { contact: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return invoices.map(mapPrismaInvoiceToInvoice);
  } catch (e) {
    console.error("Error fetching invoices from DB:", e);
    throw e;
  }
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  try {
    const { getInvoice } = await import("@platform/api-client");
    const inv = await getInvoice(id).catch(() => null);
    if (inv) {
      return await mapApiInvoiceToInvoice(inv);
    }
  } catch (e) {
    console.warn(`api-client getInvoice ${id} failed, attempting database fallback:`, e);
  }

  try {
    const inv = await db.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        lineItems: { orderBy: { displayOrder: "asc" } },

        taxes: { orderBy: { displayOrder: "asc" } },
        payments: { orderBy: { paymentDate: "desc" } },
        deal: {
          include: { contact: true },
        },
      },
    });
    return inv ? mapPrismaInvoiceToInvoice(inv) : null;
  } catch (e) {
    console.error(`Error fetching invoice ${id}:`, e);
    throw e;
  }
}

export async function getInvoiceByIdOrNumber(
  idOrNumber: string,
): Promise<Invoice | null> {
  try {
    const { getInvoice, listInvoices } = await import("@platform/api-client");
    let inv = await getInvoice(idOrNumber).catch(() => null);
    if (!inv) {
      const all = await listInvoices().catch(() => []);
      const matched: any = all.find(
        (i: any) =>
          (i.id || i.ID) === idOrNumber ||
          (i.invoiceNumber || i.InvoiceNumber) === idOrNumber,
      );
      if (matched) {
        inv = await getInvoice(matched.id || matched.ID).catch(() => null);
      }
    }
    if (inv) {
      return await mapApiInvoiceToInvoice(inv);
    }
  } catch (e) {
    console.warn(`api-client getInvoiceByIdOrNumber ${idOrNumber} failed:`, e);
  }

  try {
    const inv = await db.invoice.findFirst({
      where: {
        OR: [{ id: idOrNumber }, { invoiceNumber: idOrNumber }],
      },
      include: {
        client: true,
        lineItems: { orderBy: { displayOrder: "asc" } },

        taxes: { orderBy: { displayOrder: "asc" } },
        payments: { orderBy: { paymentDate: "desc" } },
        deal: {
          include: { contact: true },
        },
      },
    });
    return inv ? mapPrismaInvoiceToInvoice(inv) : null;
  } catch (e) {
    console.error(`Error fetching invoice ${idOrNumber}:`, e);
    throw e;
  }
}

async function mapApiInvoiceToInvoice(inv: any): Promise<Invoice> {
  let contactObj: any = null;
  const contactId = inv.contactId || inv.ContactID;
  if (contactId) {
    try {
      const { getContact } = await import("@platform/api-client");
      contactObj = await getContact(contactId).catch(() => null);
    } catch {
    }
  }

  const subtotal = Number(inv.subtotal || inv.Subtotal || 0);
  const discountAmount = Number(inv.discount || inv.Discount || 0);
  const vatAmount = Number(inv.vatAmount || inv.VatAmount || 0);
  const totalAmount = Number(inv.total || inv.Total || 0);
  const amountPaid = Number(inv.amountPaid || inv.AmountPaid || 0);
  const balanceDue = Number(
    inv.balanceDue ?? inv.BalanceDue ?? Math.max(0, totalAmount - amountPaid),
  );
  const items = inv.items || inv.lineItems || [];

  return {
    id: inv.id || inv.ID,
    invoice_number: inv.invoiceNumber || inv.InvoiceNumber || inv.id,
    contact_id: contactId || undefined,
    client_id: contactId || undefined,
    deal_id: inv.dealId || inv.DealID || undefined,
    issue_date: (inv.issueDate || inv.IssueDate || new Date().toISOString()).slice(0, 10),
    due_date: (inv.dueDate || inv.DueDate || new Date().toISOString()).slice(0, 10),
    subtotal,
    discount_type: discountAmount > 0 ? "fixed" : "none",
    discount_value: discountAmount,
    discount_amount: discountAmount,
    after_discount: subtotal - discountAmount,
    vat_enabled: vatAmount > 0,
    vat_percentage: Number(inv.vatRate || inv.VatRate || 0),
    vat_amount: vatAmount,
    total_amount: totalAmount,
    amount_paid: amountPaid,
    amount_due: balanceDue,
    currency: (inv.currency || inv.Currency || "") as any,
    language: inv.language || inv.Language || "",
    status: (inv.status || inv.Status || "draft") as any,
    notes_en: inv.notes || inv.Notes || undefined,
    notes_ar: inv.terms || inv.Terms || undefined,
    created_at: inv.createdAt || inv.CreatedAt || new Date().toISOString(),
    updated_at: inv.updatedAt || inv.UpdatedAt || new Date().toISOString(),
    line_items: items.map((li: any, idx: number) => ({
      id: li.id || li.ID || `li-${idx + 1}`,
      invoice_id: inv.id || inv.ID,
      description_en: li.description || li.Description || "",
      description_ar: li.description || li.Description || "",
      quantity: Number(li.quantity || li.Quantity || 1),
      unit_price: Number(li.unitPrice || li.UnitPrice || 0),
      line_total: Number(li.amount || li.Amount || li.lineTotal || 0),
      display_order: Number(li.sortOrder || li.SortOrder || idx + 1),
    })),
    contact: contactObj
      ? {
          id: contactObj.id || contactObj.ID,
          full_name:
            `${contactObj.firstName || ""} ${contactObj.lastName || ""}`.trim() ||
            contactObj.company ||
            contactObj.companyName ||
            "Client",
          email: contactObj.email || "",
          phone: contactObj.phone || undefined,
          company: contactObj.company || contactObj.companyName || undefined,
          job_title: contactObj.jobTitle || undefined,
          notes: contactObj.notes || undefined,
          created_at: contactObj.createdAt || new Date().toISOString(),
          updated_at: contactObj.updatedAt || new Date().toISOString(),
        }
      : undefined,
  };
}

export async function createInvoice(data: {
  contact_id?: string;
  deal_id?: string;
  quotation_id?: string;
  sales_owner_id?: string;
  issue_date: string;
  due_date: string;
  currency?: SupportedCurrency;
  language?: "en" | "ar";
  notes_en?: string;
  notes_ar?: string;
  discount_type?: DiscountType;
  discount_value?: number;
  vat_enabled?: boolean;
  vat_percentage?: number;
  line_items: Array<{
    service_id?: string;
    description_en: string;
    description_ar?: string;
    quantity: number;
    unit_price: number;
  }>;
  created_by?: string;
}): Promise<Invoice> {
  const currency = await assertCompanyCurrency(data.currency);
  const issueDate = new Date(data.issue_date);
  const dueDate = new Date(data.due_date);
  if (Number.isNaN(issueDate.getTime()) || Number.isNaN(dueDate.getTime()))
    throw new Error(serverMessages.invalidInvoiceDates);
  if (dueDate < issueDate)
    throw new Error(serverMessages.theDueDateCannotBeBeforeThe);
  const vat = await companyVat();
  const otherTaxes = await companyTaxes("invoice");
  const totals = calculateInvoiceTotals(
    data.line_items.map((li) => ({
      ...li,
      line_total: lineTotal(li.quantity, li.unit_price, currency),
    })),
    data.discount_type || "none",
    data.discount_value || 0,
    vat.vatEnabled,
    vat.vatPercentage,
    currency,
    otherTaxes,
  );

  const created = await db.$transaction(async (tx) => {
    let dealId = data.deal_id || null;
    let quotationOwner: string | null = null;
    if (data.quotation_id) {
      await tx.$queryRaw`SELECT id FROM "Quotation" WHERE id = ${data.quotation_id} FOR UPDATE`;
      const quotation = await tx.quotation.findUnique({
        where: { id: data.quotation_id },
        select: {
          status: true,
          invoiceId: true,
          dealId: true,
          clientId: true,
          currency: true,
          salesOwnerId: true,
        },
      });
      if (!quotation) throw new Error(serverMessages.quotationNotFound);
      if (quotation.invoiceId || quotation.status === "converted")
        throw new Error(serverMessages.thisQuotationHasAlreadyBeenInvoiced);
      if (quotation.status !== "accepted")
        throw new Error(serverMessages.onlyAcceptedQuotationsCanBeInvoiced);
      if (quotation.currency !== currency)
        throw new Error(serverMessages.invoiceCurrencyMustMatchTheQuotation);
      dealId = dealId || quotation.dealId;
      quotationOwner = quotation.salesOwnerId;
    }
    const invoiceNumber = await allocateDocumentNumber(
      "invoice",
      issueDate,
      tx,
    );

    await assertCompanyCurrency(currency, tx);
    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        clientId: data.contact_id || null,
        dealId,
        issueDate,
        dueDate,
        subtotal: totals.subtotal,
        discountType: data.discount_type || "none",
        discountValue: data.discount_value || 0,
        discountAmount: totals.discountAmount,
        vatEnabled: vat.vatEnabled,
        vatPercentage: vat.vatPercentage,
        vatAmount: totals.vatAmount,
        otherTaxAmount: totals.otherTaxAmount,
        taxes: { create: documentTaxRows(otherTaxes, totals.taxes) },
        totalAmount: totals.totalAmount,
        currency,
        language: data.language || "ar",
        status: "draft",
        notesEn: data.notes_en || null,
        notesAr: data.notes_ar || null,
        createdById: data.created_by || null,
        salesOwnerId: await resolveSalesOwner(
          data.sales_owner_id || quotationOwner,
          data.created_by,
        ),
        lineItems: {
          create: data.line_items.map((li, idx) => ({
            serviceId: li.service_id || null,
            descriptionEn: li.description_en,
            descriptionAr: li.description_ar || null,
            quantity: li.quantity,
            unitPrice: li.unit_price,
            lineTotal: lineTotal(li.quantity, li.unit_price, currency),
            displayOrder: idx + 1,
          })),
        },
      },
      include: {
        client: true,
        lineItems: true,

        taxes: { orderBy: { displayOrder: "asc" } },
        payments: true,
        deal: { include: { contact: true } },
      },
    });
    if (data.quotation_id) {
      await tx.quotation.update({
        where: { id: data.quotation_id },
        data: { invoiceId: invoice.id, status: "converted" },
      });
      if (
        quotationOwner &&
        invoice.salesOwnerId &&
        invoice.salesOwnerId !== quotationOwner &&
        data.created_by
      ) {
        await tx.salesAttributionChange.create({
          data: {
            entityType: "invoice",
            entityId: invoice.id,
            fromUserId: quotationOwner,
            toUserId: invoice.salesOwnerId,
            changedById: data.created_by,
            reason: "Credited differently when invoicing the quotation",
          },
        });
      }
    }
    return invoice;
  });

  return mapPrismaInvoiceToInvoice(created);
}

export async function updateInvoice(
  id: string,
  data: {
    contact_id?: string;
    deal_id?: string;
    issue_date?: string;
    due_date?: string;
    currency?: SupportedCurrency;
    language?: "en" | "ar";
    notes_en?: string;
    notes_ar?: string;
    discount_type?: DiscountType;
    discount_value?: number;
    vat_enabled?: boolean;
    vat_percentage?: number;
    line_items?: Array<{
      service_id?: string;
      description_en: string;
      description_ar?: string;
      quantity: number;
      unit_price: number;
    }>;
  },
): Promise<Invoice | null> {
  try {
    return await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${id} FOR UPDATE`;
      const existing = await tx.invoice.findUnique({
        where: { id },
        include: {
          lineItems: true,
          payments: true,
          taxes: { orderBy: { displayOrder: "asc" } },
        },
      });
      if (!existing) return null;
      if (existing.status === "void" || existing.payments.length > 0)
        throw new Error(serverMessages.voidOrPaidInvoicesCannotBeEdited);

      await assertCompanyCurrency(existing.currency);
      const currency = await assertCompanyCurrency(data.currency);
      const nextIssue = data.issue_date
        ? new Date(data.issue_date)
        : existing.issueDate;
      const nextDue = data.due_date
        ? new Date(data.due_date)
        : existing.dueDate;
      if (nextDue < nextIssue)
        throw new Error(serverMessages.theDueDateCannotBeBeforeThe);
      const lineItemsToCalc =
        data.line_items ||
        existing.lineItems.map((li) => ({
          service_id: li.serviceId || undefined,
          description_en: li.descriptionEn,
          description_ar: li.descriptionAr || undefined,
          quantity: Number(li.quantity),
          unit_price: Number(li.unitPrice),
        }));

      const vat =
        existing.status === "draft"
          ? (data.vat_enabled !== undefined
              ? { vatEnabled: Boolean(data.vat_enabled), vatPercentage: Number(data.vat_percentage ?? existing.vatPercentage ?? 10) }
              : (existing.vatEnabled !== undefined && existing.vatEnabled !== null
                  ? { vatEnabled: Boolean(existing.vatEnabled), vatPercentage: Number(existing.vatPercentage) }
                  : await companyVat(tx)))
          : {
              vatEnabled: Boolean(existing.vatEnabled),
              vatPercentage: Number(existing.vatPercentage),
            };
      const otherTaxes =
        existing.status === "draft"
          ? (existing.taxes && existing.taxes.length > 0
              ? frozenTaxes(existing.taxes)
              : (vat.vatEnabled ? await companyTaxes("invoice", tx) : []))
          : frozenTaxes(existing.taxes);
      const totals = calculateInvoiceTotals(
        lineItemsToCalc.map((li) => ({
          ...li,
          line_total: lineTotal(li.quantity, li.unit_price, currency),
        })),
        data.discount_type || (existing.discountType as DiscountType) || "none",
        data.discount_value ?? Number(existing.discountValue || 0),
        vat.vatEnabled,
        vat.vatPercentage,
        currency,
        otherTaxes,
      );
      await tx.documentTax.deleteMany({ where: { invoiceId: id } });
      await tx.documentTax.createMany({
        data: documentTaxRows(otherTaxes, totals.taxes).map((row) => ({
          ...row,
          invoiceId: id,
        })),
      });

      if (data.line_items) {
        await tx.invoiceLineItem.deleteMany({ where: { invoiceId: id } });
      }

      const updated = await tx.invoice.update({
        where: { id },
        data: {
          clientId:
            data.contact_id !== undefined ? data.contact_id : existing.clientId,
          dealId: data.deal_id !== undefined ? data.deal_id : existing.dealId,
          issueDate: data.issue_date
            ? new Date(data.issue_date)
            : existing.issueDate,
          dueDate: data.due_date ? new Date(data.due_date) : existing.dueDate,
          subtotal: totals.subtotal,
          discountType: data.discount_type || existing.discountType,
          discountValue: data.discount_value ?? existing.discountValue,
          discountAmount: totals.discountAmount,
          vatEnabled: vat.vatEnabled,
          vatPercentage: vat.vatPercentage,
          vatAmount: totals.vatAmount,
          otherTaxAmount: totals.otherTaxAmount,
          totalAmount: totals.totalAmount,
          currency,
          language: data.language || existing.language,
          notesEn:
            data.notes_en !== undefined ? data.notes_en : existing.notesEn,
          notesAr:
            data.notes_ar !== undefined ? data.notes_ar : existing.notesAr,
          ...(data.line_items
            ? {
                lineItems: {
                  create: data.line_items.map((li, idx) => ({
                    serviceId: li.service_id || null,
                    descriptionEn: li.description_en,
                    descriptionAr: li.description_ar || null,
                    quantity: li.quantity,
                    unitPrice: li.unit_price,
                    lineTotal: lineTotal(li.quantity, li.unit_price, currency),
                    displayOrder: idx + 1,
                  })),
                },
              }
            : {}),
        },
        include: {
          client: true,
          lineItems: true,

          taxes: { orderBy: { displayOrder: "asc" } },
          payments: true,
          deal: { include: { contact: true } },
        },
      });

      return mapPrismaInvoiceToInvoice(updated);
    });
  } catch (e) {
    console.error(`Error updating invoice ${id}:`, e);
    throw e;
  }
}

export async function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus,
): Promise<boolean> {
  try {
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${id} FOR UPDATE`;
      const invoice = await tx.invoice.findUnique({
        where: { id },
        include: { payments: true },
      });
      if (!invoice) throw new Error(serverMessages.invoiceNotFound);
      if (status === "void" && invoice.payments.length)
        throw new Error(
          "Paid invoices require a credit adjustment before voiding",
        );
      if (!(INVOICE_STATUS_TRANSITIONS[invoice.status] ?? []).includes(status))
        throw new Error(
          formatMessage(serverTemplates.anInvoiceCannotMoveFrom0To, {
            0: invoice.status,
            1: status,
          }),
        );
      if (status === "sent" && invoice.status === "draft" && !invoice.signedAt)
        throw new Error(
          invoice.approvalStatus === "approved"
            ? "Sign and stamp this invoice before sending it to the client"
            : "Get this invoice approved, then sign and stamp it, before sending it",
        );
      await tx.invoice.update({
        where: { id },
        data: {
          status,
          ...(status === "sent" && !invoice.deliveredAt
            ? { deliveredAt: new Date() }
            : {}),
        },
      });
      if (status === "sent")
        await advanceDealForEvent(tx, invoice.dealId, "invoice_issued");
    });
    return true;
  } catch (e) {
    console.error(`Error updating invoice status ${id}:`, e);
    throw e;
  }
}

export async function deleteInvoice(id: string): Promise<boolean> {
  try {
    await db.invoice.delete({ where: { id } });
    return true;
  } catch (e) {
    console.error(`Error deleting invoice ${id}:`, e);
    throw e;
  }
}

export async function markOverdueInvoices(
  asOf: Date = new Date(),
): Promise<number> {
  const startOfDay = new Date(
    Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate()),
  );
  const result = await db.invoice.updateMany({
    where: {
      status: { in: ["sent", "partially_paid"] },
      dueDate: { lt: startOfDay },
    },
    data: { status: "overdue" },
  });
  return result.count;
}
