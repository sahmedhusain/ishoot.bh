import { isLiveSupabaseConfigured, createBrowserClient } from '../client';
import { mockPayments, mockInvoices } from '../mock-data';
import { Payment } from '../types';

export async function getAllPayments(): Promise<Payment[]> {
  if (!isLiveSupabaseConfigured()) {
    return mockPayments;
  }
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from('payments')
    .select('*, invoice:invoices(*, contact:crm_contacts(*))')
    .order('payment_date', { ascending: false });
  if (error || !data) return mockPayments;
  return data as Payment[];
}

export async function recordPayment(paymentData: Omit<Payment, 'id' | 'created_at' | 'receipt_number'>): Promise<Payment> {
  const receiptNumber = `RCT-2026-${String(mockPayments.length + 1).padStart(3, '0')}`;
  const newPayment: Payment = {
    ...paymentData,
    id: `pay-${Date.now()}`,
    receipt_number: receiptNumber,
    created_at: new Date().toISOString(),
  };

  if (!isLiveSupabaseConfigured()) {
    mockPayments.unshift(newPayment);
    // Update invoice amount_paid, amount_due and status
    const targetInvoice = mockInvoices.find((i) => i.id === paymentData.invoice_id);
    if (targetInvoice) {
      targetInvoice.amount_paid += paymentData.amount;
      targetInvoice.amount_due = Math.max(0, targetInvoice.total_amount - targetInvoice.amount_paid);
      targetInvoice.status = targetInvoice.amount_due <= 0 ? 'paid' : 'partially_paid';
    }
    return newPayment;
  }

  const supabase = createBrowserClient();
  const { data, error } = await supabase.from('payments').insert([newPayment]).select().single();
  if (error || !data) return newPayment;
  return data as Payment;
}
