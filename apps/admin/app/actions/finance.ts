"use server";

import {
  createExpense,
  deleteExpense,
  createPayment,
  deletePayment,
  createInvoice,
  updateInvoice,
  updateInvoiceStatus,
  deleteInvoice,
  createActivityLog,
  PaymentMethod,
} from "@ishoot/database";
import { revalidatePath } from "next/cache";
import { requirePermission } from "../../lib/auth";

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
  const user = await requirePermission("expenses", "write");
  const expense = await createExpense(data);

  await createActivityLog({
    user_id: user.id,
    action: "create",
    entity_type: "expense",
    entity_id: expense.id,
    details: { amount: data.amount, description: data.description_en },
  });

  revalidatePath("/dashboard/expenses");
  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard");
  return { success: true, expense };
}

export async function deleteExpenseAction(id: string) {
  const user = await requirePermission("expenses", "delete");
  await deleteExpense(id);

  await createActivityLog({
    user_id: user.id,
    action: "delete",
    entity_type: "expense",
    entity_id: id,
  });

  revalidatePath("/dashboard/expenses");
  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard");
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
  const user = await requirePermission("payments", "write");
  const payment = await createPayment(data);

  await createActivityLog({
    user_id: user.id,
    action: "create",
    entity_type: "payment",
    entity_id: payment.id,
    details: {
      invoice_id: data.invoice_id,
      amount: data.amount,
      receiptNumber: payment.receipt_number,
    },
  });

  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard");
  return { success: true, payment };
}

export async function deletePaymentAction(id: string) {
  const user = await requirePermission("payments", "delete");
  await deletePayment(id);

  await createActivityLog({
    user_id: user.id,
    action: "delete",
    entity_type: "payment",
    entity_id: id,
  });

  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function createInvoiceAction(data: {
  contact_id?: string;
  deal_id?: string;
  issue_date: string;
  due_date: string;
  currency?: any;
  language?: "en" | "ar";
  notes_en?: string;
  notes_ar?: string;
  discount_type?: any;
  discount_value?: number;
  vat_enabled?: boolean;
  vat_percentage?: number;
  created_by?: string;
  line_items: any[];
}) {
  const user = await requirePermission("invoices", "write");
  const invoice = await createInvoice({
    ...data,
    created_by: user.id,
  } as any);

  await createActivityLog({
    user_id: user.id,
    action: "create",
    entity_type: "invoice",
    entity_id: invoice.id,
    details: {
      invoiceNumber: invoice.invoice_number,
      totalAmount: invoice.total_amount,
    },
  });

  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard");
  return { success: true, invoice };
}

export async function updateInvoiceAction(
  id: string,
  data: {
    contact_id?: string;
    deal_id?: string;
    issue_date?: string;
    due_date?: string;
    currency?: any;
    language?: "en" | "ar";
    notes_en?: string;
    notes_ar?: string;
    discount_type?: any;
    discount_value?: number;
    vat_enabled?: boolean;
    vat_percentage?: number;
    line_items?: any[];
  },
) {
  const user = await requirePermission("invoices", "write");
  const invoice = await updateInvoice(id, data as any);

  await createActivityLog({
    user_id: user.id,
    action: "update",
    entity_type: "invoice",
    entity_id: id,
    details: {
      invoiceNumber: invoice?.invoice_number,
      totalAmount: invoice?.total_amount,
    },
  });

  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${id}`);
  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard");
  return { success: true, invoice };
}

export async function voidInvoiceAction(id: string) {
  const user = await requirePermission("invoices", "write");
  await updateInvoiceStatus(id, "void");

  await createActivityLog({
    user_id: user.id,
    action: "void",
    entity_type: "invoice",
    entity_id: id,
  });

  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${id}`);
  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteInvoiceAction(id: string) {
  const user = await requirePermission("invoices", "delete");
  await deleteInvoice(id);

  await createActivityLog({
    user_id: user.id,
    action: "delete",
    entity_type: "invoice",
    entity_id: id,
  });

  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard");
  return { success: true };
}
