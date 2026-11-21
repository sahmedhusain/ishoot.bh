import { assertCompanyCurrency } from "../finance/company-currency";
import {
  serverTemplates,
  formatMessage,
  serverMessages,
} from "@platform/locales";

import { runAtomicMutation } from "../api/atomic";
import { deleteTableRow, listTableRows, upsertTableRow } from "../api/tables";
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

const toIso = (val: unknown): string => {
  if (!val) return new Date().toISOString();
  const d = val instanceof Date ? val : new Date(String(val));
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};
import {
  companyTaxes,
  companyVat,
  documentTaxRows,
  frozenTaxes,
  mapDocumentTaxLines,
} from "../finance/vat";

export { calculateInvoiceTotals };

function mapDatabaseInvoiceToInvoice(inv: any): Invoice {
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
    delivered_at: inv.deliveredAt ? toIso(inv.deliveredAt) : undefined,
    notes_en: inv.notesEn || undefined,
    notes_ar: inv.notesAr || undefined,
    created_by: inv.createdById || undefined,
    created_at: toIso(inv.createdAt),
    updated_at: toIso(inv.updatedAt),
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
            ? toIso(contactObj.createdAt)
            : new Date().toISOString(),
          updated_at: contactObj.updatedAt
            ? toIso(contactObj.updatedAt)
            : new Date().toISOString(),
        }
      : undefined,
  };
}

export async function getAllInvoices(options?: {
  limit?: number;
  offset?: number;
  status?: InvoiceStatus;
  contactId?: string;
  quotationId?: string;
}): Promise<Invoice[]> {
  try {
    const { listInvoices } = await import("../api/finance");
    const list = await listInvoices({
      status: options?.status,
      contactId: options?.contactId,
      quotationId: options?.quotationId,
    });
    let filtered = list || [];
    if (options?.status) {
      filtered = filtered.filter((inv) => inv.status === options.status);
    }
    if (options?.offset || options?.limit) {
      const start = options.offset ?? 0;
      const end = options.limit ? start + options.limit : undefined;
      filtered = filtered.slice(start, end);
    }
    return Promise.all(filtered.map(mapApiInvoiceToInvoice));
  } catch (e) {
    console.warn("api-client listInvoices failed:", e);
    return [];
  }
}

async function hydrateInvoice(inv: any) {
  const [contacts, deals, lineItems, taxes, payments] = await Promise.all([
    listTableRows<any>("sales", "crm_contact").catch(() => []),
    listTableRows<any>("sales", "crm_deal").catch(() => []),
    listTableRows<any>("finance", "invoice_line_item").catch(() => []),
    listTableRows<any>("finance", "document_tax").catch(() => []),
    listTableRows<any>("finance", "payment").catch(() => []),
  ]);
  const contactMap = new Map<string, any>(contacts.map((c): [any, any] => [c.id, c]));
  const deal = inv.dealId ? deals.find((d) => d.id === inv.dealId) ?? null : null;
  return {
    ...inv,
    client: inv.clientId ? contactMap.get(inv.clientId) ?? null : null,
    lineItems: lineItems
      .filter((li) => li.invoiceId === inv.id)
      .sort((a, b) => Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0)),
    taxes: taxes
      .filter((t) => t.invoiceId === inv.id)
      .sort((a, b) => Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0)),
    payments: payments
      .filter((p) => p.invoiceId === inv.id)
      .sort((a, b) => String(b.paymentDate ?? "").localeCompare(String(a.paymentDate ?? ""))),
    deal: deal
      ? {
          ...deal,
          contact: deal.contactId ? contactMap.get(deal.contactId) ?? null : null,
        }
      : null,
  };
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
    const invoices = await listTableRows<any>("finance", "invoice");
    const raw = invoices.find((i) => i.id === id);
    if (!raw) return null;
    const inv = await hydrateInvoice(raw);
    return mapDatabaseInvoiceToInvoice(inv);
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
    const invoices = await listTableRows<any>("finance", "invoice");
    const raw = invoices.find(
      (i) => i.id === idOrNumber || i.invoiceNumber === idOrNumber,
    );
    if (!raw) return null;
    const inv = await hydrateInvoice(raw);
    return mapDatabaseInvoiceToInvoice(inv);
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
      item_kind: li.itemKind || li.ItemKind || "custom",
      service_id: li.serviceId || li.ServiceID || undefined,
      product_id: li.productId || li.ProductID || undefined,
      variant_id: li.variantId || li.VariantID || undefined,
      sku: li.sku || li.Sku || undefined,
      unit: li.unit || li.Unit || undefined,
      tax_rate: Number(li.taxRate || li.TaxRate || 0),
      description_en: li.descriptionEn || li.DescriptionEn || li.description || li.Description || "",
      description_ar: li.descriptionAr || li.DescriptionAr || li.description || li.Description || "",
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
    item_kind?: "service" | "product" | "custom";
    service_id?: string;
    product_id?: string;
    variant_id?: string;
    sku?: string;
    unit?: string;
    tax_rate?: number;
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
  const invoiceNumber = await allocateDocumentNumber("invoice", issueDate);

  const itemsPayload = data.line_items.map((li, idx) => ({
    itemKind:
      li.item_kind ||
      (li.service_id ? "service" : li.product_id ? "product" : "custom"),
    serviceId: li.service_id || null,
    productId: li.product_id || null,
    variantId: li.variant_id || null,
    sku: li.sku || null,
    unit: li.unit || null,
    description: li.description_en,
    descriptionEn: li.description_en,
    descriptionAr: li.description_ar || li.description_en,
    quantity: String(Number(li.quantity)),
    unitPrice: String(Number(li.unit_price)),
    taxRate: String(Number(li.tax_rate ?? 0)),
    amount: String(lineTotal(li.quantity, li.unit_price, currency)),
    sortOrder: idx,
  }));

  if (data.quotation_id) {
    const { createInvoiceFromQuotation } = await import("../api/finance");
    const created = await createInvoiceFromQuotation({
      quotationId: data.quotation_id,
      invoiceNumber,
      issueDate: issueDate.toISOString().slice(0, 10),
      dueDate: dueDate.toISOString().slice(0, 10),
      notes: data.notes_en || null,
      terms: data.notes_ar || null,
      dealId: data.deal_id || null,
      contactId: data.contact_id || null,
      currency,
      subtotal: totals.subtotal,
      discount: totals.discountAmount,
      vatRate: vat.vatEnabled ? vat.vatPercentage : 0,
      vatAmount: totals.vatAmount,
      total: totals.totalAmount,
      items: data.line_items.map((li, idx) => ({
        itemKind:
          li.item_kind ||
          (li.service_id ? "service" : li.product_id ? "product" : "custom"),
        serviceId: li.service_id || null,
        productId: li.product_id || null,
        variantId: li.variant_id || null,
        sku: li.sku || null,
        unit: li.unit || null,
        description: li.description_en,
        descriptionEn: li.description_en,
        descriptionAr: li.description_ar || li.description_en,
        quantity: Number(li.quantity),
        unitPrice: Number(li.unit_price),
        taxRate: Number(li.tax_rate ?? 0),
        amount: lineTotal(li.quantity, li.unit_price, currency),
        sortOrder: idx,
      })),
    });
    return mapApiInvoiceToInvoice(created);
  }

  const { createInvoice: createApiInvoice } = await import("../api/finance");
  const created = await createApiInvoice({
    invoiceNumber,
    quotationId: null,
    contactId: data.contact_id || null,
    dealId: data.deal_id || null,
    status: "draft",
    issueDate: issueDate.toISOString().slice(0, 10),
    dueDate: dueDate.toISOString().slice(0, 10),
    subtotal: String(totals.subtotal),
    discount: String(totals.discountAmount),
    vatRate: String(vat.vatEnabled ? vat.vatPercentage : 0),
    vatAmount: String(totals.vatAmount),
    total: String(totals.totalAmount),
    amountPaid: "0",
    balanceDue: String(totals.totalAmount),
    currency,
    notes: data.notes_en || null,
    terms: data.notes_ar || null,
    items: itemsPayload,
  });

  return mapApiInvoiceToInvoice(created);
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
    return await runAtomicMutation(async () => {
      const invoices = await listTableRows<any>("finance", "invoice");
      const rawExisting = invoices.find((i) => i.id === id);
      if (!rawExisting) return null;
      const existing = await hydrateInvoice(rawExisting);
      if (existing.status === "void" || existing.payments.length > 0)
        throw new Error(serverMessages.voidOrPaidInvoicesCannotBeEdited);

      await assertCompanyCurrency(existing.currency);
      const currency = await assertCompanyCurrency(data.currency);
      const nextIssue = data.issue_date
        ? new Date(data.issue_date)
        : new Date(existing.issueDate);
      const nextDue = data.due_date
        ? new Date(data.due_date)
        : new Date(existing.dueDate);
      if (nextDue < nextIssue)
        throw new Error(serverMessages.theDueDateCannotBeBeforeThe);
      const lineItemsToCalc =
        data.line_items ||
        existing.lineItems.map((li: any) => ({
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
                  : await companyVat()))
          : {
              vatEnabled: Boolean(existing.vatEnabled),
              vatPercentage: Number(existing.vatPercentage),
            };
      const otherTaxes =
        existing.status === "draft"
          ? (existing.taxes && existing.taxes.length > 0
              ? frozenTaxes(existing.taxes)
              : (vat.vatEnabled ? await companyTaxes("invoice") : []))
          : frozenTaxes(existing.taxes);
      const totals = calculateInvoiceTotals(
        lineItemsToCalc.map((li: any) => ({
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
      await Promise.all(
        existing.taxes.map((t: any) => deleteTableRow("finance", "document_tax", t.id)),
      );
      await Promise.all(
        documentTaxRows(otherTaxes, totals.taxes).map((row) =>
          upsertTableRow("finance", "document_tax", {
            id: crypto.randomUUID(),
            ...row,
            invoiceId: id,
          }),
        ),
      );

      if (data.line_items) {
        await Promise.all(
          existing.lineItems.map((li: any) =>
            deleteTableRow("finance", "invoice_line_item", li.id),
          ),
        );
        await Promise.all(
          data.line_items.map((li, idx) =>
            upsertTableRow("finance", "invoice_line_item", {
              id: crypto.randomUUID(),
              invoiceId: id,
              serviceId: li.service_id || null,
              descriptionEn: li.description_en,
              descriptionAr: li.description_ar || null,
              quantity: li.quantity,
              unitPrice: li.unit_price,
              lineTotal: lineTotal(li.quantity, li.unit_price, currency),
              displayOrder: idx + 1,
            }),
          ),
        );
      }

      const updatedRaw = await upsertTableRow("finance", "invoice", {
        ...rawExisting,
        clientId:
          data.contact_id !== undefined ? data.contact_id : existing.clientId,
        dealId: data.deal_id !== undefined ? data.deal_id : existing.dealId,
        issueDate: nextIssue.toISOString(),
        dueDate: nextDue.toISOString(),
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
      });

      return mapDatabaseInvoiceToInvoice(await hydrateInvoice(updatedRaw));
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
  const { updateInvoiceStatus: updateApiInvoiceStatus } = await import("../api/finance");
  await updateApiInvoiceStatus(id, status);
  return true;
}

export async function deleteInvoice(id: string): Promise<boolean> {
  const { deleteInvoice: deleteApiInvoice } = await import("../api/finance");
  await deleteApiInvoice(id);
  return true;
}

export async function markOverdueInvoices(
  asOf: Date = new Date(),
): Promise<number> {
  const startOfDay = new Date(
    Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate()),
  );
  const invoices = await listTableRows<any>("finance", "invoice");
  const overdue = invoices.filter(
    (inv) =>
      ["sent", "partially_paid"].includes(inv.status) &&
      inv.dueDate &&
      new Date(inv.dueDate) < startOfDay,
  );
  await Promise.all(
    overdue.map((inv) =>
      upsertTableRow("finance", "invoice", { ...inv, status: "overdue" }),
    ),
  );
  return overdue.length;
}
