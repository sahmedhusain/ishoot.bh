"use server";
import { measureOperation } from "@ishoot/database";
import { runAtomicMutation } from "@ishoot/database";
import { validateActionArguments } from "../../lib/action-input";

import {
  createExpense,
  deleteExpense,
  createPayment,
  createInvoice,
  updateInvoice,
  updateInvoiceStatus,
  getUnpaidInvoicesByClientId,
  createActivityLog,
  PaymentMethod,
  SupportedCurrency,
} from "@ishoot/database";
import { revalidatePath } from "next/cache";
import { requirePermission } from "../../lib/auth";
import { requireFeatureEnabled } from "@ishoot/database";

export async function createExpenseAction(data: {
  amount: number;
  category_id?: string;
  deal_id?: string;
  vendor_name?: string;
  description_en: string;
  description_ar?: string;
  expense_date?: string;
  is_billable?: boolean;
  currency?: SupportedCurrency;
  receipt_url?: string;
}) {
  return measureOperation("action:createExpenseAction", async () => {
    await requireFeatureEnabled("invoicing"); const user = await requirePermission("expenses", "write");
    validateActionArguments("createExpenseAction", { data });
    const { expense } = await runAtomicMutation(async () => {
      const expense = await createExpense(data, user.id);
      await createActivityLog({
        user_id: user.id,
        action: "create",
        entity_type: "expense",
        entity_id: expense.id,
        details: { amount: data.amount, description: data.description_en },
      });
      return { expense };
    });

    revalidatePath("/dashboard/expenses");
    revalidatePath("/dashboard/finance");
    revalidatePath("/dashboard");
    return { success: true, expense };
  });
}

export async function deleteExpenseAction(id: string) {
  return measureOperation("action:deleteExpenseAction", async () => {
    await requireFeatureEnabled("invoicing"); const user = await requirePermission("expenses", "delete");
    validateActionArguments("deleteExpenseAction", { id });
    await runAtomicMutation(async () => {
      if (!(await deleteExpense(id)))
        throw new Error("Expense deletion failed");
      await createActivityLog({
        user_id: user.id,
        action: "delete",
        entity_type: "expense",
        entity_id: id,
      });
      return {};
    });

    revalidatePath("/dashboard/expenses");
    revalidatePath("/dashboard/finance");
    revalidatePath("/dashboard");
    return { success: true };
  });
}

export async function createPaymentAction(data: {
  invoice_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date?: string;
  reference_number?: string;
  notes?: string;
  proof_attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
  }>;
}) {
  return measureOperation("action:createPaymentAction", async () => {
    await requireFeatureEnabled("invoicing"); const user = await requirePermission("payments", "write");
    validateActionArguments("createPaymentAction", { data });
    const { payment } = await runAtomicMutation(async () => {
      const payment = await createPayment({
        ...data,
        created_by: user.id,
      });
      await createActivityLog({
        user_id: user.id,
        action: "create",
        entity_type: "payment",
        entity_id: payment.id,
        details: {
          invoice_id: data.invoice_id,
          amount: data.amount,
          receiptNumber: payment.receipt_number,
          attachmentCount: data.proof_attachments?.length || 0,
        },
      });
      return { payment };
    });

    revalidatePath("/dashboard/payments");
    revalidatePath("/dashboard/invoices");
    revalidatePath("/dashboard/finance");
    revalidatePath("/dashboard/archive");
    revalidatePath("/dashboard");
    return { success: true, payment };
  });
}

export async function createInvoiceAction(data: {
  contact_id?: string;
  deal_id?: string;
  issue_date: string;
  due_date: string;
  currency?: import("@ishoot/database/types").SupportedCurrency;
  language?: "en" | "ar";
  notes_en?: string;
  notes_ar?: string;
  discount_type?: import("@ishoot/database/types").DiscountType;
  discount_value?: number;
  vat_enabled?: boolean;
  vat_percentage?: number;
  created_by?: string;
  line_items: {
    service_id?: string;
    description_en: string;
    description_ar?: string;
    quantity: number;
    unit_price: number;
    line_total?: number;
    display_order?: number;
    id?: string;
  }[];
}) {
  return measureOperation("action:createInvoiceAction", async () => {
    await requireFeatureEnabled("invoicing"); const user = await requirePermission("invoices", "write");
    validateActionArguments("createInvoiceAction", { data });
    const { invoice } = await runAtomicMutation(async () => {
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
      return { invoice };
    });

    revalidatePath("/dashboard/invoices");
    revalidatePath("/dashboard/finance");
    revalidatePath("/dashboard");
    return { success: true, invoice };
  });
}

export async function updateInvoiceAction(
  id: string,
  data: {
    contact_id?: string;
    deal_id?: string;
    issue_date?: string;
    due_date?: string;
    currency?: import("@ishoot/database/types").SupportedCurrency;
    language?: "en" | "ar";
    notes_en?: string;
    notes_ar?: string;
    discount_type?: import("@ishoot/database/types").DiscountType;
    discount_value?: number;
    vat_enabled?: boolean;
    vat_percentage?: number;
    line_items?: {
      service_id?: string;
      description_en: string;
      description_ar?: string;
      quantity: number;
      unit_price: number;
      line_total?: number;
      display_order?: number;
      id?: string;
    }[];
  },
) {
  return measureOperation("action:updateInvoiceAction", async () => {
    await requireFeatureEnabled("invoicing"); const user = await requirePermission("invoices", "write");
    validateActionArguments("updateInvoiceAction", { id, data });
    const { invoice } = await runAtomicMutation(async () => {
      const invoice = await updateInvoice(id, data as any);
      if (!invoice) throw new Error("Invoice update failed");
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
      return { invoice };
    });

    revalidatePath("/dashboard/invoices");
    revalidatePath(`/dashboard/invoices/${id}`);
    revalidatePath("/dashboard/finance");
    revalidatePath("/dashboard");
    return { success: true, invoice };
  });
}

export async function voidInvoiceAction(id: string) {
  return measureOperation("action:voidInvoiceAction", async () => {
    await requireFeatureEnabled("invoicing"); const user = await requirePermission("invoices", "write");
    validateActionArguments("voidInvoiceAction", { id });
    await runAtomicMutation(async () => {
      if (!(await updateInvoiceStatus(id, "void")))
        throw new Error("Invoice void failed");
      await createActivityLog({
        user_id: user.id,
        action: "void",
        entity_type: "invoice",
        entity_id: id,
      });
      return {};
    });

    revalidatePath("/dashboard/invoices");
    revalidatePath(`/dashboard/invoices/${id}`);
    revalidatePath("/dashboard/finance");
    revalidatePath("/dashboard");
    return { success: true };
  });
}

export async function getUnpaidInvoicesByClientAction(clientId: string) {
  return measureOperation(
    "action:getUnpaidInvoicesByClientAction",
    async () => {
      await requirePermission("invoices", "read");
      validateActionArguments("getUnpaidInvoicesByClientAction", { clientId });
      const invoices = await getUnpaidInvoicesByClientId(clientId);
      return { success: true, invoices };
    },
  );
}
