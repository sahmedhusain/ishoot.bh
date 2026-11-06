import { apiUrl, apiTimeoutMs } from "./config";
import { apiError } from "./errors";
import { serviceToken } from "./service-token";
import { normalizeApiRecord } from "./normalize";

export type Invoice = {
  id: string;
  invoiceNumber: string;
  quotationId?: string | null;
  contactId?: string | null;
  dealId?: string | null;
  status: string;
  issueDate: string;
  dueDate: string;
  subtotal: string;
  discount: string;
  vatRate: string;
  vatAmount: string;
  total: string;
  amountPaid: string;
  balanceDue: string;
  currency: string;
  notes?: string | null;
  terms?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceItem = {
  id: string;
  invoiceId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  sortOrder: number;
};

export type InvoiceWithItems = Invoice & {
  items: InvoiceItem[];
};

export type Payment = {
  id: string;
  paymentNumber: string;
  invoiceId?: string | null;
  contactId?: string | null;
  amount: string;
  currency: string;
  paymentMethod: string;
  paymentDate: string;
  reference?: string | null;
  status: string;
  notes?: string | null;
  createdAt: string;
};

export type ExpenseCategory = {
  id: string;
  nameEn: string;
  nameAr: string;
  code: string;
  sortOrder: number;
};

export type Expense = {
  id: string;
  title: string;
  categoryId?: string | null;
  amount: string;
  currency: string;
  expenseDate: string;
  status: string;
  notes?: string | null;
  vendor?: string | null;
  receiptUrl?: string | null;
  createdBy?: string | null;
  approvedBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BankSettlement = {
  id: string;
  settlementNumber: string;
  bankAccount: string;
  amount: string;
  currency: string;
  settledAt: string;
  status: string;
  notes?: string | null;
  createdAt: string;
};

async function financeFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  } else {
    const st = await serviceToken();
    if (st) headers.set("Authorization", `Bearer ${st}`);
  }
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${apiUrl()}${path}`, {
    ...options,
    headers,
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });

  if (!res.ok) {
    let errBody: unknown;
    try {
      errBody = await res.json();
    } catch {
      // non-JSON
    }
    throw await apiError(res, errBody);
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }
  const body = await res.json();
  return normalizeApiRecord(body) as T;
}

// Invoices
export const listInvoices = (token?: string) =>
  financeFetch<Invoice[]>("/v1/finance/invoices", {}, token);

export const getInvoice = (id: string, token?: string) =>
  financeFetch<InvoiceWithItems>(`/v1/finance/invoices/${encodeURIComponent(id)}`, {}, token);

export const createInvoice = (input: any, token?: string) =>
  financeFetch<InvoiceWithItems>("/v1/finance/invoices", { method: "POST", body: JSON.stringify(input) }, token);

export const updateInvoiceStatus = (id: string, status: string, token?: string) =>
  financeFetch<Invoice>(`/v1/finance/invoices/${encodeURIComponent(id)}/status`, { method: "PUT", body: JSON.stringify({ status }) }, token);

export const deleteInvoice = (id: string, token?: string) =>
  financeFetch<void>(`/v1/finance/invoices/${encodeURIComponent(id)}`, { method: "DELETE" }, token);

// Payments
export const listPayments = (invoiceId?: string, token?: string) => {
  const q = invoiceId ? `?invoiceId=${encodeURIComponent(invoiceId)}` : "";
  return financeFetch<Payment[]>(`/v1/finance/payments${q}`, {}, token);
};

export const recordPayment = (input: any, token?: string) =>
  financeFetch<Payment>("/v1/finance/payments", { method: "POST", body: JSON.stringify(input) }, token);

// Expenses
export const listExpenses = (token?: string) =>
  financeFetch<Expense[]>("/v1/finance/expenses", {}, token);

export const createExpense = (input: any, token?: string) =>
  financeFetch<Expense>("/v1/finance/expenses", { method: "POST", body: JSON.stringify(input) }, token);

export const approveExpense = (id: string, approvedBy: string, token?: string) =>
  financeFetch<Expense>(`/v1/finance/expenses/${encodeURIComponent(id)}/approve`, { method: "PUT", body: JSON.stringify({ approvedBy }) }, token);

export const listExpenseCategories = (token?: string) =>
  financeFetch<ExpenseCategory[]>("/v1/finance/expense-categories", {}, token);

// Settlements
export const listSettlements = (token?: string) =>
  financeFetch<BankSettlement[]>("/v1/finance/settlements", {}, token);
