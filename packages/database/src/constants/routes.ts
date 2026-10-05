// Every admin dashboard URL, in one place. Runtime-free so server queries, server actions and
// client components build links the same way. The query types are what each page reads from
// its `searchParams`, so a link can only pass parameters the target page understands.

type QueryValue = string | number | null | undefined;

const withQuery = (path: string, query?: Record<string, QueryValue>) => {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `${path}?${search}` : path;
};

const encode = (id: string) => encodeURIComponent(id);

export type NewDealQuery = { clientId?: string | null };
export type NewQuotationQuery = { clientId?: string | null; dealId?: string | null; inquiryId?: string | null };
export type NewInvoiceQuery = { clientId?: string | null; quotationId?: string | null; dealId?: string | null };
export type NewPaymentQuery = { clientId?: string | null };
export type NewEmployeeQuery = { userId?: string | null };
export type HighlightQuery = { highlight?: string | null };

export const ROUTES = {
  home: "/dashboard",
  login: "/login",
  analytics: "/dashboard/analytics",
  approvals: (query?: { status?: string | null; type?: string | null; scope?: string | null }) =>
    withQuery("/dashboard/approvals", query),
  archive: "/dashboard/archive",
  calendar: "/dashboard/calendar",
  directory: "/dashboard/directory",
  profile: (query?: HighlightQuery) => withQuery("/dashboard/profile", query),
  services: "/dashboard/services",
  cms: {
    banners: "/dashboard/cms/banners",
    clients: "/dashboard/cms/clients",
    equipment: "/dashboard/cms/equipment",
    faqs: "/dashboard/cms/faqs",
    portfolio: "/dashboard/cms/portfolio",
    reviews: "/dashboard/cms/reviews",
    stats: "/dashboard/cms/stats",
    website: "/dashboard/cms/website",
  },
  company: {
    documents: "/dashboard/company/documents",
    newDocument: "/dashboard/company/documents/new",
  },
  crm: {
    contacts: "/dashboard/crm/contacts",
    customer: (id: string) => `/dashboard/crm/customers/${encode(id)}`,
    customerEdit: (id: string) => `/dashboard/crm/customers/${encode(id)}/edit`,
    newCustomer: "/dashboard/crm/customers/new",
    deals: "/dashboard/crm/deals",
    deal: (id: string) => `/dashboard/crm/deals/${encode(id)}`,
    dealEdit: (id: string) => `/dashboard/crm/deals/${encode(id)}/edit`,
    newDeal: (query?: NewDealQuery) => withQuery("/dashboard/crm/deals/new", query),
    leads: "/dashboard/crm/leads",
  },
  claims: {
    list: (query?: HighlightQuery & { view?: "mine" | "finance" }) => withQuery("/dashboard/claims", query),
    create: "/dashboard/claims/new",
  },
  expenses: {
    list: (query?: HighlightQuery) => withQuery("/dashboard/expenses", query),
    create: "/dashboard/expenses/new",
    categories: "/dashboard/expenses/categories",
  },
  finance: {
    overview: "/dashboard/finance",
    reports: "/dashboard/finance/reports",
    commissions: (query?: { month?: string }) => withQuery("/dashboard/finance/commissions", query),
  },
  hr: {
    documents: (query?: HighlightQuery) => withQuery("/dashboard/hr/documents", query),
    employees: "/dashboard/hr/employees",
    employee: (id: string) => `/dashboard/hr/employees/${encode(id)}`,
    newEmployee: (query?: NewEmployeeQuery) => withQuery("/dashboard/hr/employees/new", query),
    leave: (query?: HighlightQuery) => withQuery("/dashboard/hr/leave", query),
    payroll: (query?: HighlightQuery) => withQuery("/dashboard/hr/payroll", query),
  },
  invoices: {
    list: "/dashboard/invoices",
    detail: (id: string) => `/dashboard/invoices/${encode(id)}`,
    edit: (id: string) => `/dashboard/invoices/${encode(id)}/edit`,
    create: (query?: NewInvoiceQuery) => withQuery("/dashboard/invoices/new", query),
  },
  moms: {
    list: "/dashboard/moms",
    detail: (id: string) => `/dashboard/moms/${encode(id)}`,
    create: "/dashboard/moms/new",
  },
  payments: {
    list: "/dashboard/payments",
    detail: (id: string) => `/dashboard/payments/${encode(id)}`,
    create: (query?: NewPaymentQuery) => withQuery("/dashboard/payments/new", query),
  },
  quotations: {
    list: "/dashboard/quotations",
    detail: (id: string) => `/dashboard/quotations/${encode(id)}`,
    create: (query?: NewQuotationQuery) => withQuery("/dashboard/quotations/new", query),
  },
  requests: {
    list: "/dashboard/requests",
    detail: (id: string) => `/dashboard/requests/${encode(id)}`,
    create: "/dashboard/requests/new",
  },
  settings: {
    root: "/dashboard/settings",
    approvals: "/dashboard/settings/approvals",
    audit: "/dashboard/settings/audit",
    company: "/dashboard/settings/company",
    integrations: "/dashboard/settings/integrations",
    modules: "/dashboard/settings/modules",
    preferences: "/dashboard/settings/preferences",
    roles: "/dashboard/settings/roles",
    security: "/dashboard/settings/security",
    web: "/dashboard/settings/web",
  },
  users: {
    list: "/dashboard/users",
    create: "/dashboard/users/new",
  },
} as const;

/**
 * Entity types used by attachments, activity logs and search results → the dashboard page that
 * owns them. Used for "open" links and to revalidate the owning page after a change.
 */
export const ENTITY_ROUTES: Record<string, (id: string) => string> = {
  contact: ROUTES.crm.customer,
  customer: ROUTES.crm.customer,
  client: ROUTES.crm.customer,
  customer_vault: ROUTES.crm.customer,
  deal: ROUTES.crm.deal,
  invoice: ROUTES.invoices.detail,
  payment: ROUTES.payments.detail,
  quotation: ROUTES.quotations.detail,
  inquiry: ROUTES.requests.detail,
  lead: ROUTES.requests.detail,
  service_request: ROUTES.requests.detail,
  employee: ROUTES.hr.employee,
  expense: (id) => ROUTES.expenses.list({ highlight: id }),
  expense_claim: (id) => ROUTES.claims.list({ highlight: id }),
  user_signature: () => ROUTES.profile(),
  company_document: () => ROUTES.company.documents,
  company_asset: () => ROUTES.company.documents,
  mom: ROUTES.moms.detail,
  company_setting: () => ROUTES.settings.company,
};

export const entityRoute = (entityType: string, entityId: string): string | undefined =>
  ENTITY_ROUTES[entityType]?.(entityId);
