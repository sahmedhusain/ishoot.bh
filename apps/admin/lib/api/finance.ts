import { apiUrl, apiTimeoutMs } from "./config";
import { apiError } from "./errors";
import { serviceToken } from "./service-token";
import { normalizeApiRecord } from "./normalize";
import { buildQuery } from "./service-fetch";

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
  itemKind?: string;
  serviceId?: string | null;
  productId?: string | null;
  variantId?: string | null;
  sku?: string | null;
  unit?: string | null;
  description: string;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  quantity: string;
  unitPrice: string;
  taxRate?: string;
  amount: string;
  sortOrder?: number;
};

export type PaymentAllocation = {
  id: string;
  paymentId: string;
  invoiceId: string;
  allocatedAmount: string | number;
  currency?: string;
  createdAt?: string;
};

export type FinanceCatalogItemRef = {
  kind: string;
  id: string;
  variantId?: string | null;
  sku?: string | null;
  nameEn: string;
  nameAr?: string | null;
  category?: string | null;
  unit?: string | null;
  unitPrice: string | number;
  currency?: string;
  taxRate?: string | number;
  isActive: boolean;
};

export type FinanceContactRef = {
  id: string;
  firstName: string;
  lastName?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  contactType?: string;
  status?: string;
};

export type FinanceQuotationRef = {
  id: string;
  quotationNumber: string;
  dealId?: string | null;
  contactId?: string | null;
  status: string;
  subtotal: string | number;
  discount: string | number;
  vatRate: string | number;
  vatAmount: string | number;
  total: string | number;
  currency: string;
  items: InvoiceItem[];
};

export type InvoiceFilters = {
  contactId?: string;
  quotationId?: string;
  dealId?: string;
  status?: string;
};

export type InvoiceWithItems = Invoice & {
  items: InvoiceItem[];
  payments?: Payment[];
  allocations?: PaymentAllocation[];
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
    } catch {}
    throw await apiError(res, errBody);
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }
  const body = await res.json();
  return normalizeApiRecord(body) as T;
}

export const listInvoices = (
  tokenOrFilters?: string | InvoiceFilters,
  token?: string,
) => {
  const filters = typeof tokenOrFilters === "object" ? tokenOrFilters : undefined;
  const auth = typeof tokenOrFilters === "string" ? tokenOrFilters : token;
  return financeFetch<Invoice[]>(`/v1/finance/invoices${buildQuery(filters)}`, {}, auth);
};

export const getInvoice = (id: string, token?: string) =>
  financeFetch<InvoiceWithItems>(
    `/v1/finance/invoices/${encodeURIComponent(id)}`,
    {},
    token,
  );

export const createInvoice = (input: any, token?: string) =>
  financeFetch<InvoiceWithItems>(
    "/v1/finance/invoices",
    { method: "POST", body: JSON.stringify(input) },
    token,
  );

export const createInvoiceFromQuotation = (input: any, token?: string) =>
  financeFetch<InvoiceWithItems>(
    "/v1/finance/invoices/from-quotation",
    { method: "POST", body: JSON.stringify(input) },
    token,
  );

export const updateInvoiceStatus = (
  id: string,
  status: string,
  token?: string,
) =>
  financeFetch<Invoice>(
    `/v1/finance/invoices/${encodeURIComponent(id)}/status`,
    { method: "PUT", body: JSON.stringify({ status }) },
    token,
  );

export const deleteInvoice = (id: string, token?: string) =>
  financeFetch<void>(
    `/v1/finance/invoices/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    token,
  );

export const listPayments = (invoiceId?: string, token?: string) => {
  const q = invoiceId ? `?invoiceId=${encodeURIComponent(invoiceId)}` : "";
  return financeFetch<Payment[]>(`/v1/finance/payments${q}`, {}, token);
};

export const recordPayment = (input: any, token?: string) =>
  financeFetch<Payment>(
    "/v1/finance/payments",
    { method: "POST", body: JSON.stringify(input) },
    token,
  );

export const listExpenses = (token?: string) =>
  financeFetch<Expense[]>("/v1/finance/expenses", {}, token);

export const createExpense = (input: any, token?: string) =>
  financeFetch<Expense>(
    "/v1/finance/expenses",
    { method: "POST", body: JSON.stringify(input) },
    token,
  );

export const approveExpense = (
  id: string,
  approvedBy: string,
  token?: string,
) =>
  financeFetch<Expense>(
    `/v1/finance/expenses/${encodeURIComponent(id)}/approve`,
    { method: "PUT", body: JSON.stringify({ approvedBy }) },
    token,
  );

export const listExpenseCategories = (token?: string) =>
  financeFetch<ExpenseCategory[]>("/v1/finance/expense-categories", {}, token);

export const listSettlements = (token?: string) =>
  financeFetch<BankSettlement[]>("/v1/finance/settlements", {}, token);

export const createSettlement = (input: any, token?: string) =>
  financeFetch<BankSettlement>(
    "/v1/finance/settlements",
    { method: "POST", body: JSON.stringify(input) },
    token,
  );

export const getPayment = (id: string, token?: string) =>
  financeFetch<Payment & { allocations?: PaymentAllocation[] }>(
    `/v1/finance/payments/${encodeURIComponent(id)}`,
    {},
    token,
  );

export const deletePayment = (id: string, token?: string) =>
  financeFetch<void>(
    `/v1/finance/payments/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    token,
  );

export const listFinanceCatalog = (kind?: string, token?: string) =>
  financeFetch<FinanceCatalogItemRef[]>(
    `/v1/finance/catalog${buildQuery({ kind })}`,
    {},
    token,
  );

export const listFinanceContactsRef = (token?: string) =>
  financeFetch<FinanceContactRef[]>("/v1/finance/contacts-ref", {}, token);

export const listFinanceQuotationsRef = (token?: string) =>
  financeFetch<FinanceQuotationRef[]>("/v1/finance/quotations-ref", {}, token);
