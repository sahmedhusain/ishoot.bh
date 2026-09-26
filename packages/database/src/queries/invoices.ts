import { db } from '../db';
import { mockInvoices } from '../mock-data';
import { Invoice, InvoiceLineItem, DiscountType, SupportedCurrency, CURRENCY_CONFIGS } from '../types';

export function calculateInvoiceTotals(
  lineItems: InvoiceLineItem[],
  discountType: DiscountType,
  discountValue: number,
  vatEnabled: boolean,
  vatPercentage: number,
  currency: SupportedCurrency = 'BHD'
) {
  const currencyConfig = CURRENCY_CONFIGS[currency] || CURRENCY_CONFIGS.BHD;
  const factor = Math.pow(10, currencyConfig.decimals);

  const subtotalRaw = lineItems.reduce((acc, item) => acc + item.quantity * item.unit_price, 0);
  const subtotal = Math.round(subtotalRaw * factor) / factor;

  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = Math.round(((subtotal * discountValue) / 100) * factor) / factor;
  } else if (discountType === 'fixed') {
    discountAmount = Math.min(subtotal, Math.round(discountValue * factor) / factor);
  }

  const afterDiscount = Math.max(0, Math.round((subtotal - discountAmount) * factor) / factor);

  let vatAmount = 0;
  if (vatEnabled) {
    vatAmount = Math.round(((afterDiscount * vatPercentage) / 100) * factor) / factor;
  }

  const totalAmount = Math.round((afterDiscount + vatAmount) * factor) / factor;

  return {
    subtotal,
    discountAmount,
    afterDiscount,
    vatAmount,
    totalAmount,
  };
}

function mapPrismaInvoiceToInvoice(inv: any): Invoice {
  const subtotal = Number(inv.subtotal);
  const discountAmount = Number(inv.discountAmount);
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const vatAmount = Number(inv.vatAmount);
  const totalAmount = Number(inv.totalAmount);
  const amountPaid = 0;
  const amountDue = Math.max(0, totalAmount - amountPaid);

  return {
    id: inv.id,
    invoice_number: inv.invoiceNumber,
    contact_id: inv.deal?.contactId || inv.clientId || '',
    deal_id: inv.dealId || undefined,
    issue_date: inv.issueDate.toISOString().split('T')[0],
    due_date: inv.dueDate.toISOString().split('T')[0],
    subtotal,
    discount_type: 'fixed',
    discount_value: discountAmount,
    discount_amount: discountAmount,
    after_discount: afterDiscount,
    vat_enabled: vatAmount > 0,
    vat_percentage: 10,
    vat_amount: vatAmount,
    total_amount: totalAmount,
    amount_paid: amountPaid,
    amount_due: amountDue,
    currency: inv.currency as SupportedCurrency,
    language: 'ar',
    status: inv.status as any,
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
          description_en: li.descriptionEn,
          description_ar: li.descriptionAr || undefined,
          quantity: Number(li.quantity),
          unit_price: Number(li.unitPrice),
          line_total: Number(li.lineTotal),
          display_order: li.displayOrder,
        }))
      : [],
    contact: inv.deal?.contact
      ? {
          id: inv.deal.contact.id,
          full_name: `${inv.deal.contact.firstName} ${inv.deal.contact.lastName || ''}`.trim(),
          email: inv.deal.contact.email || '',
          phone: inv.deal.contact.phone || undefined,
          company: inv.deal.contact.companyName || undefined,
          job_title: inv.deal.contact.jobTitle || undefined,
          notes: inv.deal.contact.notes || undefined,
          created_at: inv.deal.contact.createdAt.toISOString(),
          updated_at: inv.deal.contact.updatedAt.toISOString(),
        }
      : undefined,
  };
}

export async function getAllInvoices(): Promise<Invoice[]> {
  try {
    const invoices = await db.invoice.findMany({
      include: {
        lineItems: true,
        deal: {
          include: { contact: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (invoices && invoices.length > 0) {
      return invoices.map(mapPrismaInvoiceToInvoice);
    }
  } catch (e) {
    console.error('Error fetching invoices from DB:', e);
  }
  return mockInvoices;
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  try {
    const inv = await db.invoice.findUnique({
      where: { id },
      include: {
        lineItems: true,
        deal: {
          include: { contact: true },
        },
      },
    });
    if (inv) {
      return mapPrismaInvoiceToInvoice(inv);
    }
  } catch (e) {
    console.error('Error fetching invoice by id from DB:', e);
  }
  return mockInvoices.find((inv) => inv.id === id) || null;
}
