"use server";
import { ROUTES } from "../../constants/routes";
import { measureOperation } from "@ishoot/database";
import { runAtomicMutation, submitForApproval } from "@ishoot/database";
import { validateActionArguments } from "../../lib/action-input";

import {
createExpense,
deleteExpense,
createExpenseCategory,
updateExpenseCategory,
deleteExpenseCategory,
createPayment,
createInvoice,
updateInvoice,
updateInvoiceStatus,createActivityLog,getInvoiceByIdOrNumber,
PaymentMethod,
SupportedCurrency,
  refreshExchangeRates,
  getFxBoard,
} from "@ishoot/database";
import { revalidatePath } from "next/cache";
import { requirePermission } from "../../lib/auth";
import { requireFeatureEnabled } from "@ishoot/database";

export async function createExpenseAction(data: {
  amount: number;
  category_id?: string;
  deal_id?: string;
  client_id?: string;
  scope?: "deal" | "client" | "internal";
  payment_method?: string;
  notes?: string;
  vendor_name?: string;
  description_en: string;
  description_ar?: string;
  expense_date?: string;
  is_billable?: boolean;
  currency?: SupportedCurrency;
  receipt_url?: string;
  input_vat_amount?: number;
  is_vat_recoverable?: boolean;
}) {
  return measureOperation("action:createExpenseAction", async () => {
    await requireFeatureEnabled("invoicing"); const user = await requirePermission("expenses", "write");
    validateActionArguments("createExpenseAction", { data });
    const { expense } = await runAtomicMutation(async () => {
      const expense = await createExpense(data, user.id);
      // Applies immediately when the expense policy is off or the creator's role auto-approves.
      await submitForApproval({
        targetType: "expense",
        targetId: expense.id,
        requesterId: user.id,
        policySnapshot: { amount: data.amount, currency: expense.currency, vendor: data.vendor_name ?? null },
      });
      await createActivityLog({
        user_id: user.id,
        action: "create",
        entity_type: "expense",
        entity_id: expense.id,
        details: { amount: data.amount, description: data.description_en },
      });
      return { expense };
    });

    if (expense.deal_id) revalidatePath(ROUTES.crm.deal(expense.deal_id));
    if (expense.client_id) revalidatePath(ROUTES.crm.customer(expense.client_id));
    revalidatePath(ROUTES.expenses.list());
    revalidatePath(ROUTES.finance.overview);
    revalidatePath(ROUTES.home);
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

    revalidatePath(ROUTES.expenses.list());
    revalidatePath(ROUTES.finance.overview);
    revalidatePath(ROUTES.home);
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

    revalidatePath(ROUTES.crm.deals, "layout");
    revalidatePath(ROUTES.payments.list);
    revalidatePath(ROUTES.invoices.list);
    revalidatePath(ROUTES.finance.overview);
    revalidatePath(ROUTES.archive);
    revalidatePath(ROUTES.home);
    return { success: true, payment };
  });
}

export async function createInvoiceAction(data: {
  contact_id?: string;
  deal_id?: string;
  quotation_id?: string;
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
  /** Salesperson credited with the invoice; defaults to its quotation's, else the issuer. */
  sales_owner_id?: string;
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

    revalidatePath(ROUTES.crm.deals, "layout");
    revalidatePath(ROUTES.invoices.list);
    revalidatePath(ROUTES.finance.overview);
    revalidatePath(ROUTES.home);
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
      const before = await getInvoiceByIdOrNumber(id);
      const invoice = await updateInvoice(id, data as any);
      if (!invoice) throw new Error("Invoice update failed");
      await createActivityLog({
        user_id: user.id,
        action: "update",
        entity_type: "invoice",
        entity_id: id,
        details: {
          before, after: invoice,
          invoiceNumber: invoice?.invoice_number,
          totalAmount: invoice?.total_amount,
        },
      });
      return { invoice };
    });

    revalidatePath(ROUTES.invoices.list);
    revalidatePath(ROUTES.invoices.detail(id));
    revalidatePath(ROUTES.finance.overview);
    revalidatePath(ROUTES.home);
    return { success: true, invoice };
  });
}

/** Issues a draft invoice: it becomes a receivable and can accept payments. */
export async function markInvoiceSentAction(id: string) {
  return measureOperation("action:markInvoiceSentAction", async () => {
    await requireFeatureEnabled("invoicing"); const user = await requirePermission("invoices", "write");
    validateActionArguments("markInvoiceSentAction", { id });
    await runAtomicMutation(async () => {
      await updateInvoiceStatus(id, "sent");
      await createActivityLog({ user_id: user.id, action: "send", entity_type: "invoice", entity_id: id });
    });
    revalidatePath(ROUTES.crm.deals, "layout");
    revalidatePath(ROUTES.invoices.list);
    revalidatePath(ROUTES.invoices.detail(id));
    revalidatePath(ROUTES.finance.overview);
    revalidatePath(ROUTES.home);
    return { success: true };
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

    revalidatePath(ROUTES.invoices.list);
    revalidatePath(ROUTES.invoices.detail(id));
    revalidatePath(ROUTES.finance.overview);
    revalidatePath(ROUTES.home);
    return { success: true };
  });
}

export async function exportFinancialReportCsvAction(filters: {
  basis?: "cash" | "accrual";
  dateFrom?: string;
  dateTo?: string;
}) {
  return measureOperation("action:exportFinancialReportCsvAction", async () => {
    await requirePermission("reports", "read");
    validateActionArguments("exportFinancialReportCsvAction", { filters });

    const { getFinancialSummaryReport, getFinancialReportDetail, generateFinancialSummaryCsv, generateFinancialDetailCsv } = await import("@ishoot/database");
    const { companyVat } = await import("@ishoot/database/finance/vat");
    const range = {
      basis: filters.basis,
      dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
      dateTo: filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999Z`) : undefined,
    };
    const [report, detail, vat] = await Promise.all([getFinancialSummaryReport(range), getFinancialReportDetail(range), companyVat()]);

    const csvContent = generateFinancialSummaryCsv(report) + "\n" + generateFinancialDetailCsv(detail, vat.vatEnabled || detail.vat.hasVatDocuments);
    return { success: true, csvContent, filename: `ishoot_financial_report_${report.basis}_${Date.now()}.csv` };
  });
}


/** Pulls today's live rates for every supported currency; falls back silently to stored rates. */
export async function refreshExchangeRatesAction() {
  return measureOperation("action:refreshExchangeRatesAction", async () => {
    await requirePermission("quotations", "create");
    validateActionArguments("refreshExchangeRatesAction", {});
    const live = await refreshExchangeRates({ force: true });
    revalidatePath(ROUTES.quotations.create());
    return { success: true, live, board: await getFxBoard() };
  });
}

export async function createExpenseCategoryAction(data: { name_en: string; name_ar?: string; color?: string; kind?: string }) {
  return measureOperation("action:createExpenseCategoryAction", async () => {
    await requireFeatureEnabled("invoicing"); const user = await requirePermission("expenses", "write");
    validateActionArguments("createExpenseCategoryAction", { data });
    const category = await runAtomicMutation(async () => {
      const category = await createExpenseCategory(data);
      await createActivityLog({ user_id: user.id, action: "create", entity_type: "expense_category", entity_id: category.id, details: { name: category.name_en } });
      return category;
    });
    revalidatePath(ROUTES.expenses.categories);
    return { success: true, category };
  });
}

export async function updateExpenseCategoryAction(
  id: string,
  data: { name_en?: string; name_ar?: string; color?: string; kind?: string; is_active?: boolean },
) {
  return measureOperation("action:updateExpenseCategoryAction", async () => {
    await requireFeatureEnabled("invoicing"); const user = await requirePermission("expenses", "write");
    validateActionArguments("updateExpenseCategoryAction", { id, data });
    const category = await runAtomicMutation(async () => {
      const category = await updateExpenseCategory(id, data);
      await createActivityLog({ user_id: user.id, action: "update", entity_type: "expense_category", entity_id: id, details: data });
      return category;
    });
    revalidatePath(ROUTES.expenses.categories);
    return { success: true, category };
  });
}

export async function deleteExpenseCategoryAction(id: string) {
  return measureOperation("action:deleteExpenseCategoryAction", async () => {
    await requireFeatureEnabled("invoicing"); const user = await requirePermission("expenses", "delete");
    validateActionArguments("deleteExpenseCategoryAction", { id });
    const outcome = await runAtomicMutation(async () => {
      const outcome = await deleteExpenseCategory(id);
      await createActivityLog({ user_id: user.id, action: outcome === "deleted" ? "delete" : "update", entity_type: "expense_category", entity_id: id, details: { outcome } });
      return outcome;
    });
    revalidatePath(ROUTES.expenses.categories);
    return { success: true, outcome };
  });
}
