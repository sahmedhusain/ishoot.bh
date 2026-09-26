'use server';

import {
  createExpense,
  deleteExpense,
  createPayment,
  createInvoice,
  PaymentMethod,
} from '@ishoot/database';
import { revalidatePath } from 'next/cache';

export async function createExpenseAction(data: {
  amount: number;
  category_id?: string;
  deal_id?: string;
  vendor_name?: string;
  description_en: string;
  description_ar?: string;
  expense_date?: string;
  is_billable?: boolean;
}) {
  const expense = await createExpense(data);
  revalidatePath('/dashboard/expenses');
  revalidatePath('/dashboard/finance');
  revalidatePath('/dashboard');
  return { success: true, expense };
}

export async function deleteExpenseAction(id: string) {
  await deleteExpense(id);
  revalidatePath('/dashboard/expenses');
  revalidatePath('/dashboard/finance');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function createPaymentAction(data: {
  invoice_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date?: string;
  reference_number?: string;
  notes?: string;
}) {
  const payment = await createPayment(data);
  revalidatePath('/dashboard/payments');
  revalidatePath('/dashboard/invoices');
  revalidatePath('/dashboard/finance');
  revalidatePath('/dashboard');
  return { success: true, payment };
}

export async function createInvoiceAction(data: {
  contact_id?: string;
  deal_id?: string;
  issue_date: string;
  due_date: string;
  currency?: any;
  language?: 'en' | 'ar';
  notes_en?: string;
  notes_ar?: string;
  discount_type?: any;
  discount_value?: number;
  vat_enabled?: boolean;
  vat_percentage?: number;
  created_by?: string;
  line_items: any[];
}) {
  const invoice = await createInvoice(data as any);
  revalidatePath('/dashboard/invoices');
  revalidatePath('/dashboard/finance');
  revalidatePath('/dashboard');
  return { success: true, invoice };
}
