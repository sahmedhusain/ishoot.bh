import { isLiveSupabaseConfigured, createBrowserClient } from '../client';
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

export async function getAllInvoices(): Promise<Invoice[]> {
  if (!isLiveSupabaseConfigured()) {
    return mockInvoices;
  }
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from('invoices')
    .select('*, contact:crm_contacts(*), deal:crm_deals(*), line_items:invoice_line_items(*)')
    .order('created_at', { ascending: false });
  if (error || !data) return mockInvoices;
  return data as Invoice[];
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  if (!isLiveSupabaseConfigured()) {
    return mockInvoices.find((inv) => inv.id === id) || null;
  }
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from('invoices')
    .select('*, contact:crm_contacts(*), deal:crm_deals(*), line_items:invoice_line_items(*)')
    .eq('id', id)
    .single();
  if (error || !data) return mockInvoices.find((inv) => inv.id === id) || null;
  return data as Invoice;
}
