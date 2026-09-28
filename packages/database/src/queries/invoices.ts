import { db } from "../db";
import {
  Invoice,
  InvoiceLineItem,
  DiscountType,
  SupportedCurrency,
  InvoiceStatus,
  CURRENCY_CONFIGS,
  calculateInvoiceTotals,
} from "../types";

export { calculateInvoiceTotals };

function mapPrismaInvoiceToInvoice(inv: any): Invoice {
  const subtotal = Number(inv.subtotal);
  const discountAmount = Number(inv.discountAmount);
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const vatAmount = Number(inv.vatAmount);
  const totalAmount = Number(inv.totalAmount);

  const amountPaid =
    inv.payments && inv.payments.length > 0
      ? inv.payments.reduce((acc: number, p: any) => acc + Number(p.amount), 0)
      : 0;
  const amountDue = Math.max(0, totalAmount - amountPaid);
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
    vat_enabled: vatAmount > 0,
    vat_percentage: 10,
    vat_amount: vatAmount,
    total_amount: totalAmount,
    amount_paid: amountPaid,
    amount_due: amountDue,
    currency: (inv.currency as SupportedCurrency) || "BHD",
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
          created_at: contactObj.createdAt ? contactObj.createdAt.toISOString() : new Date().toISOString(),
          updated_at: contactObj.updatedAt ? contactObj.updatedAt.toISOString() : new Date().toISOString(),
        }
      : undefined,
  };
}

export async function getAllInvoices(): Promise<Invoice[]> {
  try {
    const invoices = await db.invoice.findMany({
      include: {
        client: true,
        lineItems: true,
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
    return [];
  }
}

export async function getInvoicesByDealId(dealId: string): Promise<Invoice[]> {
  try {
    const invoices = await db.invoice.findMany({
      where: { dealId },
      include: {
        client: true,
        lineItems: true,
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
    return [];
  }
}

export async function getInvoicesByClientId(clientId: string): Promise<Invoice[]> {
  try {
    const invoices = await db.invoice.findMany({
      where: {
        OR: [{ clientId }, { deal: { contactId: clientId } }],
      },
      include: {
        client: true,
        lineItems: true,
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
    return [];
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
        inv.status !== "void" &&
        inv.status !== "paid" &&
        inv.amount_due > 0,
    );
  } catch (e) {
    console.error(`Error fetching unpaid invoices for client ${clientId}:`, e);
    return [];
  }
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  try {
    const inv = await db.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        lineItems: { orderBy: { displayOrder: "asc" } },
        payments: { orderBy: { paymentDate: "desc" } },
        deal: {
          include: { contact: true },
        },
      },
    });
    return inv ? mapPrismaInvoiceToInvoice(inv) : null;
  } catch (e) {
    console.error(`Error fetching invoice ${id}:`, e);
    return null;
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
        payments: { orderBy: { paymentDate: "desc" } },
        deal: {
          include: { contact: true },
        },
      },
    });
    return inv ? mapPrismaInvoiceToInvoice(inv) : null;
  } catch (e) {
    console.error(`Error fetching invoice ${idOrNumber}:`, e);
    return null;
  }
}

export async function createInvoice(data: {
  contact_id?: string;
  deal_id?: string;
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
  const currency = data.currency || "BHD";
  const totals = calculateInvoiceTotals(
    data.line_items.map((li) => ({
      ...li,
      line_total: li.quantity * li.unit_price,
    })),
    data.discount_type || "none",
    data.discount_value || 0,
    data.vat_enabled ?? false,
    data.vat_percentage ?? 10,
    currency,
  );

  const year = new Date().getFullYear();
  const count = await db.invoice.count();
  const invoiceNumber = `ISH-${year}-${String(count + 1).padStart(3, "0")}`;

  const created = await db.invoice.create({
    data: {
      invoiceNumber,
      clientId: data.contact_id || null,
      dealId: data.deal_id || null,
      issueDate: new Date(data.issue_date),
      dueDate: new Date(data.due_date),
      subtotal: totals.subtotal,
      discountType: data.discount_type || "none",
      discountValue: data.discount_value || 0,
      discountAmount: totals.discountAmount,
      vatAmount: totals.vatAmount,
      totalAmount: totals.totalAmount,
      currency,
      language: data.language || "ar",
      status: "draft",
      notesEn: data.notes_en || null,
      notesAr: data.notes_ar || null,
      createdById: data.created_by || null,
      lineItems: {
        create: data.line_items.map((li, idx) => ({
          serviceId: li.service_id || null,
          descriptionEn: li.description_en,
          descriptionAr: li.description_ar || null,
          quantity: li.quantity,
          unitPrice: li.unit_price,
          lineTotal: li.quantity * li.unit_price,
          displayOrder: idx + 1,
        })),
      },
    },
    include: {
      client: true,
      lineItems: true,
      payments: true,
      deal: { include: { contact: true } },
    },
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
    const existing = await db.invoice.findUnique({
      where: { id },
      include: { lineItems: true },
    });
    if (!existing) return null;

    const currency =
      data.currency || (existing.currency as SupportedCurrency) || "BHD";
    const lineItemsToCalc =
      data.line_items ||
      existing.lineItems.map((li) => ({
        service_id: li.serviceId || undefined,
        description_en: li.descriptionEn,
        description_ar: li.descriptionAr || undefined,
        quantity: Number(li.quantity),
        unit_price: Number(li.unitPrice),
      }));

    const totals = calculateInvoiceTotals(
      lineItemsToCalc.map((li) => ({
        ...li,
        line_total: li.quantity * li.unit_price,
      })),
      data.discount_type || (existing.discountType as DiscountType) || "none",
      data.discount_value ?? Number(existing.discountValue || 0),
      data.vat_enabled ?? Number(existing.vatAmount) > 0,
      data.vat_percentage ?? 10,
      currency,
    );

    if (data.line_items) {
      await db.invoiceLineItem.deleteMany({ where: { invoiceId: id } });
    }

    const updated = await db.invoice.update({
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
        vatAmount: totals.vatAmount,
        totalAmount: totals.totalAmount,
        currency,
        language: data.language || existing.language,
        notesEn: data.notes_en !== undefined ? data.notes_en : existing.notesEn,
        notesAr: data.notes_ar !== undefined ? data.notes_ar : existing.notesAr,
        ...(data.line_items
          ? {
              lineItems: {
                create: data.line_items.map((li, idx) => ({
                  serviceId: li.service_id || null,
                  descriptionEn: li.description_en,
                  descriptionAr: li.description_ar || null,
                  quantity: li.quantity,
                  unitPrice: li.unit_price,
                  lineTotal: li.quantity * li.unit_price,
                  displayOrder: idx + 1,
                })),
              },
            }
          : {}),
      },
      include: {
        client: true,
        lineItems: true,
        payments: true,
        deal: { include: { contact: true } },
      },
    });

    return mapPrismaInvoiceToInvoice(updated);
  } catch (e) {
    console.error(`Error updating invoice ${id}:`, e);
    return null;
  }
}

export async function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus,
): Promise<boolean> {
  try {
    await db.invoice.update({
      where: { id },
      data: { status },
    });
    return true;
  } catch (e) {
    console.error(`Error updating invoice status ${id}:`, e);
    return false;
  }
}

export async function deleteInvoice(id: string): Promise<boolean> {
  try {
    await db.invoice.delete({ where: { id } });
    return true;
  } catch (e) {
    console.error(`Error deleting invoice ${id}:`, e);
    return false;
  }
}
