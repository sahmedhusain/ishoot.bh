import { apiUrl, apiTimeoutMs } from "./config";
import { apiError } from "./errors";
import { serviceToken } from "./service-token";
import { normalizeApiRecord } from "./normalize";

export type Contact = {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  contactType: string;
  status: string;
  notes?: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type Deal = {
  id: string;
  title: string;
  contactId?: string | null;
  stage: string;
  value: string;
  currency: string;
  probability: number;
  expectedCloseDate?: string | null;
  status: string;
  assignedTo?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Inquiry = {
  id: string;
  inquiryType: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string | null;
  assigneeId?: string | null;
  dealId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Quotation = {
  id: string;
  quotationNumber: string;
  dealId?: string | null;
  contactId?: string | null;
  status: string;
  subtotal: string;
  discount: string;
  vatRate: string;
  vatAmount: string;
  total: string;
  currency: string;
  validUntil?: string | null;
  terms?: string | null;
  notes?: string | null;
  issuedAt?: string | null;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type QuotationItem = {
  id: string;
  quotationId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  sortOrder: number;
};

export type QuotationWithItems = Quotation & {
  items: QuotationItem[];
};

export type Campaign = {
  id: string;
  name: string;
  subject: string;
  body: string;
  status: string;
  sentAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

async function salesFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  } else {
    try {
      const st = await serviceToken();
      if (st) headers.set("Authorization", `Bearer ${st}`);
    } catch {
    }
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
    }
    throw await apiError(res, errBody);
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }
  const body = await res.json();
  return normalizeApiRecord(body) as T;
}

export const listContacts = (token?: string) =>
  salesFetch<Contact[]>("/v1/sales/contacts", {}, token);

export const getContact = (id: string, token?: string) =>
  salesFetch<Contact>(`/v1/sales/contacts/${encodeURIComponent(id)}`, {}, token);

export const createContact = (input: Partial<Contact>, token?: string) =>
  salesFetch<Contact>("/v1/sales/contacts", { method: "POST", body: JSON.stringify(input) }, token);

export const updateContact = (id: string, input: Partial<Contact>, token?: string) =>
  salesFetch<Contact>(`/v1/sales/contacts/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) }, token);

export const deleteContact = (id: string, token?: string) =>
  salesFetch<void>(`/v1/sales/contacts/${encodeURIComponent(id)}`, { method: "DELETE" }, token);

export const listDeals = (contactId?: string, token?: string) => {
  const q = contactId ? `?contactId=${encodeURIComponent(contactId)}` : "";
  return salesFetch<Deal[]>(`/v1/sales/deals${q}`, {}, token);
};

export const getDeal = (id: string, token?: string) =>
  salesFetch<Deal>(`/v1/sales/deals/${encodeURIComponent(id)}`, {}, token);

export const createDeal = (input: Partial<Deal>, token?: string) =>
  salesFetch<Deal>("/v1/sales/deals", { method: "POST", body: JSON.stringify(input) }, token);

export const updateDeal = (id: string, input: Partial<Deal>, token?: string) =>
  salesFetch<Deal>(`/v1/sales/deals/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) }, token);

export const updateDealStage = (id: string, stage: string, status: string, token?: string) =>
  salesFetch<Deal>(`/v1/sales/deals/${encodeURIComponent(id)}/stage`, { method: "PUT", body: JSON.stringify({ stage, status }) }, token);

export const deleteDeal = (id: string, token?: string) =>
  salesFetch<void>(`/v1/sales/deals/${encodeURIComponent(id)}`, { method: "DELETE" }, token);

export const listInquiries = (token?: string) =>
  salesFetch<Inquiry[]>("/v1/sales/inquiries", {}, token);

export const getInquiry = (id: string, token?: string) =>
  salesFetch<Inquiry>(`/v1/sales/inquiries/${encodeURIComponent(id)}`, {}, token);

export const createInquiry = (input: Partial<Inquiry>) =>
  salesFetch<Inquiry>("/v1/sales/inquiries", { method: "POST", body: JSON.stringify(input) });

export const updateInquiryStatus = (id: string, status: string, token?: string) =>
  salesFetch<Inquiry>(`/v1/sales/inquiries/${encodeURIComponent(id)}/status`, { method: "PUT", body: JSON.stringify({ status }) }, token);

export const deleteInquiry = (id: string, token?: string) =>
  salesFetch<void>(`/v1/sales/inquiries/${encodeURIComponent(id)}`, { method: "DELETE" }, token);

export const listQuotations = (token?: string) =>
  salesFetch<Quotation[]>("/v1/sales/quotations", {}, token);

export const getQuotation = (id: string, token?: string) =>
  salesFetch<QuotationWithItems>(`/v1/sales/quotations/${encodeURIComponent(id)}`, {}, token);

export const createQuotation = (input: any, token?: string) => {
  let validUntil = input.validUntil || input.validUntilDate;
  if (validUntil instanceof Date) {
    validUntil = validUntil.toISOString();
  } else if (typeof validUntil === "string" && !validUntil.includes("T")) {
    validUntil = `${validUntil}T00:00:00Z`;
  } else if (!validUntil) {
    validUntil = new Date(Date.now() + 30 * 86400000).toISOString();
  }

  const payload: any = {
    ...input,
    quotationNumber: input.quotationNumber || `QTE-${Date.now()}`,
    contactId: input.contactId || input.contact_id || input.clientId || input.client_id || null,
    dealId: input.dealId || input.deal_id || null,
    status: input.status || "draft",
    subtotal: Number(input.subtotal ?? 0),
    discount: Number(input.discount ?? input.discountAmount ?? input.discountValue ?? 0),
    vatRate: Number(input.vatRate ?? input.vatPercentage ?? 0),
    vatAmount: Number(input.vatAmount ?? 0),
    total: Number(input.total ?? input.totalAmount ?? input.subtotal ?? 0),
    currency: input.currency || "USD",
    validUntil,
    items: (input.items || input.lineItems || []).map((item: any, idx: number) => ({
      description: item.description || item.descriptionEn || item.description_en || "",
      quantity: Number(item.quantity ?? 1),
      unitPrice: Number(item.unitPrice ?? item.unit_price ?? 0),
      amount: Number(item.amount ?? item.lineTotal ?? item.line_total ?? (Number(item.quantity ?? 1) * Number(item.unitPrice ?? item.unit_price ?? 0))),
      sortOrder: item.sortOrder ?? item.orderIndex ?? idx,
    })),
  };
  return salesFetch<QuotationWithItems>("/v1/sales/quotations", { method: "POST", body: JSON.stringify(payload) }, token);
};

export const updateQuotationStatus = (id: string, status: string, token?: string) =>
  salesFetch<Quotation>(`/v1/sales/quotations/${encodeURIComponent(id)}/status`, { method: "PUT", body: JSON.stringify({ status }) }, token);

export const deleteQuotation = (id: string, token?: string) =>
  salesFetch<void>(`/v1/sales/quotations/${encodeURIComponent(id)}`, { method: "DELETE" }, token);

export const listCampaigns = (token?: string) =>
  salesFetch<Campaign[]>("/v1/sales/campaigns", {}, token);

export const getCampaign = (id: string, token?: string) =>
  salesFetch<Campaign>(`/v1/sales/campaigns/${encodeURIComponent(id)}`, {}, token);

export const createCampaign = (input: Partial<Campaign>, token?: string) =>
  salesFetch<Campaign>("/v1/sales/campaigns", { method: "POST", body: JSON.stringify(input) }, token);

export const updateCampaign = (id: string, input: Partial<Campaign>, token?: string) =>
  salesFetch<Campaign>(`/v1/sales/campaigns/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) }, token);

export const deleteCampaign = (id: string, token?: string) =>
  salesFetch<void>(`/v1/sales/campaigns/${encodeURIComponent(id)}`, { method: "DELETE" }, token);
