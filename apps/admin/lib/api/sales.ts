import { apiUrl, apiTimeoutMs } from "./config";
import { apiError } from "./errors";
import { serviceToken } from "./service-token";
import { normalizeApiRecord } from "./normalize";
import { buildQuery } from "./service-fetch";

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
  sortOrder: number;
};

export type PipelineStage = {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  sortOrder: number;
  probability: number;
  isClosed?: boolean;
  isWon?: boolean;
};

export type SalesCatalogItemRef = {
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

export type QuotationFilters = {
  contactId?: string;
  dealId?: string;
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

export const listQuotations = (
  tokenOrFilters?: string | QuotationFilters,
  token?: string,
) => {
  const filters = typeof tokenOrFilters === "object" ? tokenOrFilters : undefined;
  const auth = typeof tokenOrFilters === "string" ? tokenOrFilters : token;
  return salesFetch<Quotation[]>(`/v1/sales/quotations${buildQuery(filters)}`, {}, auth);
};

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
      itemKind:
        item.itemKind ||
        (item.serviceId ? "service" : item.productId ? "product" : "custom"),
      serviceId: item.serviceId || item.service_id || null,
      productId: item.productId || item.product_id || null,
      variantId: item.variantId || item.variant_id || null,
      sku: item.sku || null,
      unit: item.unit || null,
      description:
        item.description ||
        item.descriptionEn ||
        item.description_en ||
        item.descriptionAr ||
        "",
      descriptionEn: item.descriptionEn || item.description_en || item.description || null,
      descriptionAr: item.descriptionAr || item.description_ar || null,
      quantity: Number(item.quantity ?? 1),
      unitPrice: Number(item.unitPrice ?? item.unit_price ?? 0),
      taxRate: Number(item.taxRate ?? item.vatRate ?? 0),
      amount: Number(
        item.amount ??
          item.lineTotal ??
          item.line_total ??
          Number(item.quantity ?? 1) * Number(item.unitPrice ?? item.unit_price ?? 0),
      ),
      sortOrder: item.sortOrder ?? item.orderIndex ?? idx,
    })),
  };
  return salesFetch<QuotationWithItems>("/v1/sales/quotations", { method: "POST", body: JSON.stringify(payload) }, token);
};

export const listPipelineStages = (token?: string) =>
  salesFetch<PipelineStage[]>("/v1/sales/pipeline-stages", {}, token);

export const listSalesCatalog = (kind?: string, token?: string) =>
  salesFetch<SalesCatalogItemRef[]>(`/v1/sales/catalog${buildQuery({ kind })}`, {}, token);

export const updateQuotation = (
  id: string,
  input: { termsEn?: string | null; terms?: string | null; notes?: string | null; vatPercentage?: number; discountValue?: number; currency?: string },
  token?: string,
) =>
  salesFetch<Quotation>(`/v1/sales/quotations/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) }, token);

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

export const listCannedReplies = (token?: string) =>
  salesFetch<any[]>("/v1/sales/canned-replies", {}, token);

export const listRequestEvents = (token?: string) =>
  salesFetch<any[]>("/v1/sales/request-events", {}, token);

export const listRequestComments = (token?: string) =>
  salesFetch<any[]>("/v1/sales/request-comments", {}, token);

export const listRequestAssignments = (token?: string) =>
  salesFetch<any[]>("/v1/sales/request-assignments", {}, token);

export const listSalesAttributionChanges = (token?: string) =>
  salesFetch<any[]>("/v1/sales/attribution-changes", {}, token);

export const listClientContacts = (token?: string) =>
  salesFetch<any[]>("/v1/sales/client-contacts", {}, token);
