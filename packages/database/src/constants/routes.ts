// Every admin dashboard URL, in one place. Runtime-free so server queries, server actions and
// client components build links the same way. The query types are what each page reads from
// its `searchParams`, so a link can only pass parameters the target page understands.

type QueryValue = string | number | null | undefined;

const withQuery = (path: string, query?: Record<string, QueryValue>) => {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "")
      params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `${path}?${search}` : path;
};

const encode = (id: string) => encodeURIComponent(id);

export type NewDealQuery = { clientId?: string | null };
export type NewQuotationQuery = {
  clientId?: string | null;
  dealId?: string | null;
  inquiryId?: string | null;
};
export type NewInvoiceQuery = {
  clientId?: string | null;
  quotationId?: string | null;
  dealId?: string | null;
};
export type NewPaymentQuery = { clientId?: string | null };
export type NewEmployeeQuery = { userId?: string | null };
export type HighlightQuery = { highlight?: string | null };

export const ROUTES = {
  home: "/dashboard",
  login: "/login",
  analytics: "/dashboard/analytics",
  approvals: (query?: {
    status?: string | null;
    type?: string | null;
    scope?: string | null;
  }) => withQuery("/dashboard/approvals", query),
  /** One request under review: the record itself, its approval steps and the decision. */
  approvalItem: (targetType: string, targetId: string) =>
    `/dashboard/approvals/${encode(targetType)}/${encode(targetId)}`,
  archive: "/dashboard/archive",
  assets: {
    list: (query?: {
      status?: string | null;
      holder?: string | null;
      category?: string | null;
    }) => withQuery("/dashboard/assets", query),
    detail: (id: string) => `/dashboard/assets/${encode(id)}`,
    create: "/dashboard/assets/new",
    categories: "/dashboard/assets/categories",
    handover: (id: string) => `/dashboard/assets/handovers/${encode(id)}`,
  },
  calendar: "/dashboard/calendar",
  announcements: {
    list: (query?: { view?: string | null; category?: string | null }) =>
      withQuery("/dashboard/announcements", query),
    detail: (id: string) => `/dashboard/announcements/${encode(id)}`,
    create: "/dashboard/announcements/new",
  },
  notifications: (query?: { filter?: string | null; page?: number | null }) =>
    withQuery("/dashboard/notifications", query),
  letters: {
    list: (query?: { status?: string | null }) =>
      withQuery("/dashboard/letters", query),
    detail: (id: string) => `/dashboard/letters/${encode(id)}`,
    create: (query?: {
      templateId?: string | null;
      employeeId?: string | null;
    }) => withQuery("/dashboard/letters/new", query),
    templates: "/dashboard/letters/templates",
  },
  directory: "/dashboard/directory",
  orgChart: "/dashboard/directory/org",
  team: "/dashboard/team",
  profile: (query?: HighlightQuery) => withQuery("/dashboard/profile", query),
  services: "/dashboard/services",
  products: {
    list: "/dashboard/products",
    new: "/dashboard/products/new",
    detail: (id: string) => `/dashboard/products/${encodeURIComponent(id)}`,
    categories: "/dashboard/products/categories",
  },
  inventory: {
    stock: "/dashboard/inventory",
    movements: (query?: { productId?: string }) => (query?.productId ? `/dashboard/inventory/movements?productId=${encodeURIComponent(query.productId)}` : "/dashboard/inventory/movements"),
    warehouses: "/dashboard/inventory/warehouses",
    counts: "/dashboard/inventory/counts",
    count: (id: string) => `/dashboard/inventory/counts/${encodeURIComponent(id)}`,
  },
  orders: {
    list: "/dashboard/orders",
    new: "/dashboard/orders/new",
    detail: (id: string) => `/dashboard/orders/${encodeURIComponent(id)}`,
    settings: "/dashboard/orders/settings",
  },
  reports: {
    list: "/dashboard/reports",
    report: (key: string) => `/dashboard/reports/${encodeURIComponent(key)}`,
    export: (key: string) => `/api/reports/${encodeURIComponent(key)}`,
  },
  marketing: {
    campaigns: "/dashboard/marketing",
    audience: "/dashboard/marketing/audience",
  },
  press: {
    overview: "/dashboard/press",
  },
  legal: {
    matters: "/dashboard/legal",
    matter: (id: string) => `/dashboard/legal/${encodeURIComponent(id)}`,
  },
  tasks: {
    list: "/dashboard/tasks",
    detail: (id: string) => `/dashboard/tasks/${encodeURIComponent(id)}`,
    projects: "/dashboard/tasks/projects",
    project: (id: string) => `/dashboard/tasks/projects/${encodeURIComponent(id)}`,
  },
  delivery: {
    shipments: "/dashboard/delivery",
    shipment: (id: string) => `/dashboard/delivery/${encodeURIComponent(id)}`,
    settings: "/dashboard/delivery/settings",
    routes: "/dashboard/delivery/routes",
    route: (id: string) => `/dashboard/delivery/routes/${encodeURIComponent(id)}`,
    fleet: "/dashboard/delivery/fleet",
    cash: "/dashboard/delivery/cash",
    agencies: "/dashboard/delivery/agencies",
    driver: "/dashboard/driver",
  },
  procurement: {
    suppliers: "/dashboard/procurement/suppliers",
    requisitions: "/dashboard/procurement/requisitions",
    newRequisition: "/dashboard/procurement/requisitions/new",
    requisition: (id: string) => `/dashboard/procurement/requisitions/${encodeURIComponent(id)}`,
    rfqs: "/dashboard/procurement/rfqs",
    rfq: (id: string) => `/dashboard/procurement/rfqs/${encodeURIComponent(id)}`,
    orders: "/dashboard/procurement/orders",
    newOrder: (query?: { requisitionId?: string }) => (query?.requisitionId ? `/dashboard/procurement/orders/new?requisitionId=${encodeURIComponent(query.requisitionId)}` : "/dashboard/procurement/orders/new"),
    order: (id: string) => `/dashboard/procurement/orders/${encodeURIComponent(id)}`,
    bills: "/dashboard/procurement/bills",
    newBill: (query?: { orderId?: string }) => (query?.orderId ? `/dashboard/procurement/bills/new?orderId=${encodeURIComponent(query.orderId)}` : "/dashboard/procurement/bills/new"),
    bill: (id: string) => `/dashboard/procurement/bills/${encodeURIComponent(id)}`,
  },
  cms: {
    banners: "/dashboard/cms/banners",
    clients: "/dashboard/cms/clients",
    equipment: "/dashboard/cms/equipment",
    faqs: "/dashboard/cms/faqs",
    portfolio: "/dashboard/cms/portfolio",
    reviews: "/dashboard/cms/reviews",
    stats: "/dashboard/cms/stats",
    website: "/dashboard/cms/website",
    pages: "/dashboard/cms/pages",
    page: (id: string) => `/dashboard/cms/pages/${encodeURIComponent(id)}`,
    menus: "/dashboard/cms/menus",
    code: "/dashboard/cms/code",
    articles: "/dashboard/cms/articles",
    article: (id: string) => `/dashboard/cms/articles/${encodeURIComponent(id)}`,
    newArticle: "/dashboard/cms/articles/new",
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
    newDeal: (query?: NewDealQuery) =>
      withQuery("/dashboard/crm/deals/new", query),
    leads: "/dashboard/crm/leads",
  },
  claims: {
    list: (query?: HighlightQuery & { view?: "mine" | "finance" }) =>
      withQuery("/dashboard/claims", query),
    create: "/dashboard/claims/new",
  },
  expenses: {
    list: (query?: HighlightQuery) => withQuery("/dashboard/expenses", query),
    create: "/dashboard/expenses/new",
    categories: "/dashboard/expenses/categories",
    recurring: "/dashboard/expenses/recurring",
  },
  finance: {
    overview: "/dashboard/finance",
    reports: "/dashboard/finance/reports",
    commissions: (query?: { month?: string }) =>
      withQuery("/dashboard/finance/commissions", query),
  },
  hr: {
    documents: (query?: HighlightQuery) =>
      withQuery("/dashboard/hr/documents", query),
    employees: "/dashboard/hr/employees",
    importEmployees: "/dashboard/hr/employees/import",
    employee: (id: string) => `/dashboard/hr/employees/${encode(id)}`,
    newEmployee: (query?: NewEmployeeQuery) =>
      withQuery("/dashboard/hr/employees/new", query),
    leave: (query?: HighlightQuery) => withQuery("/dashboard/hr/leave", query),
    requests: (query?: { type?: string | null; status?: string | null; employeeId?: string | null }) =>
      withQuery("/dashboard/hr/requests", query),
    payroll: (query?: HighlightQuery) =>
      withQuery("/dashboard/hr/payroll", query),
    payrollItem: (id: string) => `/dashboard/hr/payroll/items/${encode(id)}`,
    attendance: "/dashboard/hr/attendance",
    handovers: (query?: {
      status?: string | null;
      kind?: string | null;
      employeeId?: string | null;
    }) => withQuery("/dashboard/hr/handovers", query),
    handover: (id: string) => `/dashboard/hr/handovers/${encode(id)}`,
    settings: "/dashboard/hr/settings",
    gosi: "/dashboard/hr/gosi",
    supports: (query?: { program?: string | null; status?: string | null }) =>
      withQuery("/dashboard/hr/supports", query),
    settlements: (query?: { status?: string | null }) =>
      withQuery("/dashboard/hr/settlements", query),
    settlement: (id: string) => `/dashboard/hr/settlements/${encode(id)}`,
    newSettlement: (query?: {
      employeeId?: string | null;
      handoverId?: string | null;
    }) => withQuery("/dashboard/hr/settlements/new", query),
  },
  invoices: {
    list: "/dashboard/invoices",
    detail: (id: string) => `/dashboard/invoices/${encode(id)}`,
    edit: (id: string) => `/dashboard/invoices/${encode(id)}/edit`,
    create: (query?: NewInvoiceQuery) =>
      withQuery("/dashboard/invoices/new", query),
  },
  moms: {
    list: "/dashboard/moms",
    detail: (id: string) => `/dashboard/moms/${encode(id)}`,
    create: "/dashboard/moms/new",
  },
  payments: {
    list: "/dashboard/payments",
    detail: (id: string) => `/dashboard/payments/${encode(id)}`,
    create: (query?: NewPaymentQuery) =>
      withQuery("/dashboard/payments/new", query),
  },
  quotations: {
    list: "/dashboard/quotations",
    detail: (id: string) => `/dashboard/quotations/${encode(id)}`,
    create: (query?: NewQuotationQuery) =>
      withQuery("/dashboard/quotations/new", query),
  },
  requests: {
    list: "/dashboard/requests",
    detail: (id: string) => `/dashboard/requests/${encode(id)}`,
    create: "/dashboard/requests/new",
    settings: "/dashboard/requests/settings",
  },
  settings: {
    root: "/dashboard/settings",
    approvals: "/dashboard/settings/approvals",
    audit: "/dashboard/settings/audit",
    company: "/dashboard/settings/company",
    integrations: "/dashboard/settings/integrations",
    modules: "/dashboard/settings/modules",
    pipeline: "/dashboard/settings/pipeline",
    departments: "/dashboard/settings/departments",
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
  announcement: ROUTES.announcements.detail,
  official_letter: ROUTES.letters.detail,
  company_setting: () => ROUTES.settings.company,
};

export const entityRoute = (
  entityType: string,
  entityId: string,
): string | undefined => ENTITY_ROUTES[entityType]?.(entityId);
