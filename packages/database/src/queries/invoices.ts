import { assertCompanyCurrency } from "../finance/company-currency";
import {
  serverTemplates,
  formatMessage,
  serverMessages,
} from "@platform/locales";

import { db } from "../db";
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

export async function getInvoicesByDealId(dealId: string): Promise<Invoice[]> {
  try {
    const invoices = await db.invoice.findMany({
      where: { dealId },
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
    console.error(`Error fetching invoices for deal ${dealId}:`, e);
    throw e;
  }
}

export async function getInvoicesByClientId(
  clientId: string,
): Promise<Invoice[]> {
  try {
    const invoices = await db.invoice.findMany({
      where: {
        OR: [{ clientId }, { deal: { contactId: clientId } }],
      },
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
    console.error(`Error fetching invoices for client ${clientId}:`, e);
    throw e;
  }
}

export async function getUnpaidInvoicesByClientId(
  clientId: string,
): Promise<Invoice[]> {
  try {
    const invoices = await getInvoicesByClientId(clientId);
    // Return invoices that have outstanding balance and are not void
    return invoices.filter(
      (inv) =>
        inv.status !== "void" && inv.status !== "paid" && inv.amount_due > 0,
    );
  } catch (e) {
    console.error(`Error fetching unpaid invoices for client ${clientId}:`, e);
    throw e;
  }
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
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

export async function createInvoice(data: {
  contact_id?: string;
  deal_id?: string;
  /** Accepted quotation this invoice bills; it is marked converted in the same transaction. */
  quotation_id?: string;
  /** Salesperson credited with the invoice; defaults to its quotation's, else the issuer. */
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
      // Crediting the invoice to someone other than the quotation's salesperson is a reassignment: keep the history.
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

      // Drafts follow the company VAT rule; an issued invoice keeps the VAT it was issued with.
      const vat =
        existing.status === "draft"
          ? await companyVat(tx)
          : {
              vatEnabled: existing.vatEnabled,
              vatPercentage: Number(existing.vatPercentage),
            };
      // Likewise for the other taxes: drafts follow the registry, issued invoices keep their frozen taxes.
      const otherTaxes =
        existing.status === "draft"
          ? await companyTaxes("invoice", tx)
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
      // Approved, then signed and stamped, before it goes to the client.
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

/** Marks issued invoices past their due date as overdue. Run daily by the maintenance worker. */
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
