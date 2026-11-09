import { getCurrencyDecimals } from "@platform/config/currency";
import { companyCurrency as getAccountingCurrency } from "../finance/company-currency";
import { serverMessages } from "@platform/locales";
import { phoneSearchVariants } from "../constants/phone";
import { ROUTES } from "../constants/routes";
import {
  DEAL_STAGE_DEFAULTS,
  DEAL_STAGE_ON_EVENT,
  isActiveDealStage,
  type DealProgressEvent,
} from "../constants/crm";
import { assertCompanyCurrency } from "../finance/company-currency";
import { validMoneyAmount } from "../finance/money";
import {
  listContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  listDeals,
  getDeal,
  createDeal,
  updateDeal,
  deleteDeal,
  listInquiries,
  listQuotations,
} from "@platform/api-client";
import {
  listInvoices,
  getInvoice,
  listPayments,
} from "@platform/api-client";
import {
  listAuditEvents,
} from "@platform/api-client";
import {
  listITAccountsForIT,
} from "@platform/api-client";
import {
  ClientAddress,
  ClientProfileInput,
  CRMContact,
  CRMDeal,
  DealStage,
  SupportedCurrency,
} from "../types";

function mapAddress(c: any): ClientAddress | undefined {
  const address: ClientAddress = {
    country: c.addressCountry || undefined,
    city: c.addressCity || undefined,
    area: c.addressArea || undefined,
    block: c.addressBlock || undefined,
    road: c.addressRoad || undefined,
    building: c.addressBuilding || undefined,
    unit: c.addressUnit || undefined,
    line: c.addressLine || undefined,
    state: c.addressState || undefined,
    postal_code: c.addressPostalCode || undefined,
    po_box: c.addressPoBox || undefined,
  };
  return Object.values(address).some(Boolean) ? address : undefined;
}

export function mapContact(c: any): CRMContact {
  return {
    id: c.id,
    full_name:
      `${c.firstName || ""} ${c.lastName || ""}`.trim() ||
      c.companyName ||
      c.company ||
      "Contact",
    first_name: c.firstName,
    last_name: c.lastName || undefined,
    email: c.email || "",
    phone: c.phone || undefined,
    company: c.companyName || c.company || undefined,
    vat_number: c.vatNumber || undefined,
    job_title: c.jobTitle || undefined,
    contact_type: c.contactType as any,
    notes: c.notes || undefined,
    client_kind: c.clientKind ?? (c.companyName ? "company" : "individual"),
    company_origin: c.companyOrigin || undefined,
    company_name_ar: c.companyNameAr || undefined,
    legal_form: c.legalForm || undefined,
    cr_number: c.crNumber || undefined,
    cr_expiry_date: c.crExpiryDate
      ? c.crExpiryDate.toISOString().slice(0, 10)
      : undefined,
    registration_number: c.registrationNumber || undefined,
    registration_country: c.registrationCountry || undefined,
    government_type: c.governmentType || undefined,
    supplier_number: c.supplierNumber || undefined,
    requires_purchase_order: c.requiresPurchaseOrder ?? undefined,
    nationality: c.nationality || undefined,
    industry: c.industry || undefined,
    website: c.website || undefined,
    preferred_language: c.preferredLanguage || undefined,
    payment_terms_days: c.paymentTermsDays ?? undefined,
    address_details: mapAddress(c),
    contact_persons: Array.isArray(c.contactPersons)
      ? c.contactPersons.map((p: any) => ({
          id: p.id,
          full_name: p.fullName,
          position: p.position || undefined,
          department: p.department || undefined,
          email: p.email || undefined,
          phone: p.phone || undefined,
          is_primary: p.isPrimary,
          notes: p.notes || undefined,
        }))
      : undefined,
    created_at: typeof c.createdAt === "string" ? c.createdAt : c.createdAt?.toISOString?.() ?? new Date().toISOString(),
    updated_at: typeof c.updatedAt === "string" ? c.updatedAt : c.updatedAt?.toISOString?.() ?? new Date().toISOString(),
  };
}

export function mapDeal(d: any): CRMDeal {
  return {
    id: d.id || d.ID,
    contact_id: d.contactId || d.ContactID || undefined,
    contact: d.contact ? mapContact(d.contact) : undefined,
    title: d.title || d.Title || "",
    value: Number(d.dealValue ?? d.value ?? d.Value ?? 0),
    currency: String(d.currency || d.Currency || "USD"),
    stage: ((d.dealStage || d.stage || d.Stage || "lead") as DealStage),
    probability: Number(d.probability ?? d.Probability ?? 50),
    target_close_date: d.expectedCloseDate
      ? (typeof d.expectedCloseDate === "string" ? d.expectedCloseDate : d.expectedCloseDate.toISOString()).split("T")[0]
      : undefined,
    shoot_date: d.shootDate
      ? (typeof d.shootDate === "string" ? d.shootDate : d.shootDate.toISOString()).split("T")[0]
      : undefined,
    lost_reason: d.lostReason || undefined,
    assigned_to: d.assignedTo || undefined,
    notes: d.notes || undefined,
    created_at: typeof d.createdAt === "string" ? d.createdAt : d.createdAt?.toISOString?.() ?? new Date().toISOString(),
    updated_at: typeof d.updatedAt === "string" ? d.updatedAt : d.updatedAt?.toISOString?.() ?? new Date().toISOString(),
  };
}

export async function getCRMContacts(): Promise<CRMContact[]> {
  try {
    const contacts = await listContacts();
    return (contacts || []).map(mapContact);
  } catch (e) {
    console.error("Error fetching CRM contacts:", e);
    return [];
  }
}

export async function getCRMContactById(
  id: string,
): Promise<CRMContact | null> {
  try {
    const contact = await getContact(id);
    return contact ? mapContact(contact) : null;
  } catch (e) {
    console.error(`Error fetching CRM contact ${id}:`, e);
    return null;
  }
}

export async function lookupCRMContactByEmailOrPhone(
  term: string,
): Promise<CRMContact | null> {
  try {
    const cleanTerm = term.trim().toLowerCase();
    if (!cleanTerm) return null;
    const contacts = await listContacts();
    const phoneVars = phoneSearchVariants(term);
    const found = contacts?.find((c) => {
      const email = c.email?.toLowerCase() || "";
      if (email.includes(cleanTerm)) return true;
      const phone = c.phone || "";
      return phoneVars.some((v) => phone.includes(v));
    });
    return found ? mapContact(found) : null;
  } catch (e) {
    console.error(`Error looking up contact by email/phone ${term}:`, e);
    return null;
  }
}

export async function getCustomerDossier(
  id: string,
  access?: Partial<
    Record<
      "invoices" | "payments" | "deals" | "leads" | "contracts" | "audit",
      boolean
    >
  >,
  options: { q?: string; pages?: Record<string, string> } = {},
) {
  const accountingCurrency = await getAccountingCurrency();
  try {
    const contactRaw = await getContact(id);
    if (!contactRaw) return null;

    const contact = mapContact(contactRaw);
    const search =
      typeof options.q === "string" ? options.q.trim().slice(0, 200) : "";

    const [
      inquiriesRaw,
      dealsRaw,
      invoicesRaw,
      paymentsRaw,
      contractsRaw,
      attachmentsRaw,
      activitiesRaw,
    ] = await Promise.all([
      access?.leads === false
        ? Promise.resolve([])
        : listInquiries().then(list => (list || []).filter(i => {
            const matchLead = (i.inquiryType || "inquiry") === "inquiry" || (i.inquiryType || "inquiry") === "quote_request";
            const matchCustomer = (i as any).customerId === id;
            const matchSearch = search ? (i.requesterName?.toLowerCase().includes(search.toLowerCase()) || i.message?.toLowerCase().includes(search.toLowerCase()) || i.subject?.toLowerCase().includes(search.toLowerCase())) : true;
            return matchLead && matchCustomer && matchSearch;
          })),

      access?.deals === false
        ? Promise.resolve([])
        : listDeals(id).then(list => (list || []).filter(d => {
            const matchSearch = search ? d.title?.toLowerCase().includes(search.toLowerCase()) : true;
            return matchSearch;
          })),

      access?.invoices === false
        ? Promise.resolve([])
        : listInvoices().then(async (list) => {
            const filtered: any[] = [];
            for (const inv of list || []) {
              let matchCustomer = inv.contactId === id;
              if (!matchCustomer && inv.dealId) {
                const deal = await getDeal(inv.dealId);
                matchCustomer = deal?.contactId === id;
              }
              const matchSearch = search ? inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) : true;
              if (matchCustomer && matchSearch) filtered.push(inv);
            }
            return filtered;
          }),

      access?.payments === false
        ? Promise.resolve([])
        : listPayments().then(async (list) => {
            const filtered: any[] = [];
            for (const p of list || []) {
              const inv = p.invoiceId ? await getInvoice(p.invoiceId) : null;
              let matchCustomer = inv ? inv.contactId === id : false;
              if (!matchCustomer && inv?.dealId) {
                const deal = await getDeal(inv.dealId);
                matchCustomer = deal?.contactId === id;
              }
              const matchSearch = search ? ((p as any).receiptNumber || (p as any).number || "").toLowerCase().includes(search.toLowerCase()) : true;
              if (matchCustomer && matchSearch) filtered.push(p);
            }
            return filtered;
          }),

      Promise.resolve([]),

      Promise.resolve([]),

      access?.audit === false
        ? Promise.resolve([])
        : listAuditEvents("service-token", { subject: id }).then(res => res.items),
    ]);

    const pagination = {
      inquiries: { total: inquiriesRaw.length, page: 1 },
      deals: { total: dealsRaw.length, page: 1 },
      invoices: { total: invoicesRaw.length, page: 1 },
      payments: { total: paymentsRaw.length, page: 1 },
      contracts: { total: 0, page: 1 },
      attachments: { total: 0, page: 1 },
      activities: { total: activitiesRaw.length, page: 1 },
    };

    const balancesByCurrency: Record<
      string,
      { totalLtv: number; totalPaid: number; totalOutstanding: number }
    > = {};
    if (access?.invoices !== false) {
      for (const inv of invoicesRaw) {
        const curr = inv.currency || accountingCurrency;
        const ltv = Number(inv.total);
        const paid = Number(inv.amountPaid);
        balancesByCurrency[curr] = balancesByCurrency[curr] || { totalLtv: 0, totalPaid: 0, totalOutstanding: 0 };
        balancesByCurrency[curr].totalLtv += ltv;
        balancesByCurrency[curr].totalPaid += paid;
        balancesByCurrency[curr].totalOutstanding += (ltv - paid);
      }
    }

    const {
      totalLtv = 0,
      totalPaid = 0,
      totalOutstanding = 0,
    } = balancesByCurrency[accountingCurrency] || Object.values(balancesByCurrency)[0] || {};

    const stages: Record<string, { count: number; value: number }> = {};
    for (const deal of dealsRaw) {
      const val = Number(deal.value);
      const stage = deal.stage || "lead";
      const entry = (stages[stage] ||= { count: 0, value: 0 });
      entry.count++;
      entry.value += val;
    }

    const activeDealsCount = Object.entries(stages)
      .filter(([stage]) => isActiveDealStage(stage))
      .reduce((n, [_, s]) => n + s.count, 0);

    const wonCount = stages["closed_won"]?.count || 0;
    const decidedCount = Object.entries(stages)
      .filter(([stage]) => !isActiveDealStage(stage))
      .reduce((n, [_, s]) => n + s.count, 0);
    const winRate = decidedCount ? Math.round((wonCount / decidedCount) * 100) : 0;
    const bhd = Object.entries(stages).filter(([stage]) => true);
    const bhdCount = Object.values(stages).reduce((n, s) => n + s.count, 0);
    const avgDealSize = bhdCount ? Object.values(stages).reduce((n, s) => n + s.value, 0) / bhdCount : 0;

    const [invoiceCount, paymentCount] = [invoicesRaw.length, paymentsRaw.length];

    const timestamps = [
      ...activitiesRaw.map((a: any) => new Date(a.createdAt || a.occurredAt || 0).getTime()),
      ...paymentsRaw.map((p: any) => new Date(p.createdAt || p.receivedAt || p.paymentDate || 0).getTime()),
      ...invoicesRaw.map((i: any) => new Date(i.createdAt || i.issueDate || 0).getTime()),
      ...inquiriesRaw.map((i: any) => new Date(i.createdAt || i.created_at || 0).getTime()),
    ];
    const lastActivityDate = timestamps.length
      ? new Date(Math.max(...timestamps)).toISOString()
      : contact.updated_at || contact.created_at;

    return {
      contact,
      pagination,
      metrics: {
        balancesByCurrency,
        totalLtv,
        totalPaid,
        totalOutstanding,
        activeDealsCount,
        invoicesCount: invoiceCount,
        winRate,
        avgDealSize,
        settledReceiptsCount: paymentCount,
        lastActivityDate,
      },
      inquiries: inquiriesRaw.map((inq: any) => ({
        id: inq.id,
        full_name: inq.requesterName,
        email: inq.requesterEmail,
        phone: inq.requesterPhone || undefined,
        company: inq.company || undefined,
        services_requested: inq.inquiryType ? [inq.inquiryType] : [],
        budget_range: inq.budgetRange || undefined,
        target_timeline: inq.timeline || undefined,
        message: inq.message,
        status: inq.status || "new",
        confirmation_sent: false,
        notification_sent: false,
        locale: inq.locale || "ar",
        created_at: inq.createdAt,
      })),
      deals: dealsRaw.map(mapDeal),
      invoices: invoicesRaw.map((inv: any) => ({
        id: inv.id,
        invoice_number: inv.invoiceNumber,
        contact_id: id,
        deal_id: inv.dealId || undefined,
        issue_date: inv.issueDate.split("T")[0],
        due_date: inv.dueDate.split("T")[0],
        subtotal: Number(inv.subtotal),
        discount_type: "none",
        discount_value: 0,
        discount_amount: Number(inv.discount),
        after_discount: Number(inv.subtotal) - Number(inv.discount),
        vat_enabled: true,
        vat_percentage: Number(inv.vatRate),
        vat_amount: Number(inv.vatAmount),
        total_amount: Number(inv.total),
        amount_paid: Number(inv.amountPaid),
        amount_due: Number(inv.balanceDue),
        currency: inv.currency || accountingCurrency,
        language: "ar",
        status: inv.status || "draft",
        created_at: inv.createdAt,
        updated_at: inv.updatedAt,
      })),
      payments: paymentsRaw.map((p: any) => ({
        id: p.id,
        invoice_id: p.invoiceId,
        receipt_number: p.paymentNumber,
        payment_date: p.paymentDate.split("T")[0],
        amount: Number(p.amount),
        currency: p.currency || accountingCurrency,
        payment_method: p.paymentMethod || "bank_transfer",
        reference_number: p.reference || undefined,
        notes: p.notes || undefined,
        receipt_pdf_path: undefined,
        notification_sent: false,
        created_at: p.createdAt,
      })),
      contracts: [],
      attachments: [],
      activities: activitiesRaw.map((act: any) => ({
        id: act.id,
        user_id: act.userId,
        user: act.user ? {
          id: act.user.id,
          full_name: act.user.fullName,
          email: act.user.email,
          role: act.user.role,
          created_at: act.user.createdAt,
          updated_at: act.user.updatedAt,
        } : undefined,
        action: act.action,
        entity_type: act.entityType,
        entity_id: act.entityId || undefined,
        details: act.details,
        created_at: act.createdAt,
      })),
    };
  } catch (e) {
    console.error(`Error generating Customer Dossier for ${id}:`, e);
    throw e;
  }
}

export async function advanceDealForEvent(
  tx: any,
  dealId: string | null | undefined,
  event: DealProgressEvent,
): Promise<boolean> {
  if (!dealId) return false;
  const target = DEAL_STAGE_ON_EVENT[event];
  if (!target) return false;
  const stages = await tx.dealPipelineStage.findMany({
    select: { id: true, sortOrder: true, kind: true, probability: true },
  });
  const goal = stages.find((stage: any) => stage.id === target);
  if (!goal) return false;
  const before = stages
    .filter(
      (stage: any) => stage.kind === "open" && stage.sortOrder < goal.sortOrder,
    )
    .map((stage: any) => stage.id);
  const { count } = await tx.crmDeal.updateMany({
    where: { id: dealId, dealStage: { in: before } },
    data: {
      dealStage: target,
      probability: goal.probability ?? DEAL_STAGE_DEFAULTS[target].probability,
    },
  });
  return count > 0;
}

export async function createCRMContact(
  data: ClientProfileInput,
): Promise<CRMContact> {
  const { createClientProfile } = await import("./client-profiles");
  return createClientProfile(data);
}

export async function updateCRMContact(
  id: string,
  data: ClientProfileInput,
): Promise<CRMContact | null> {
  const { updateClientProfile } = await import("./client-profiles");
  return updateClientProfile(id, data);
}

export async function deleteCRMContact(id: string): Promise<boolean> {
  try {
    const invoices = await listInvoices();
    const quotations = await listQuotations();
    let hasInvoices = (invoices || []).some((i) => i.contactId === id);
    if (!hasInvoices && invoices) {
      for (const i of invoices) {
        if (i.dealId) {
          const deal = await getDeal(i.dealId);
          if (deal?.contactId === id) {
            hasInvoices = true;
            break;
          }
        }
      }
    }
    const hasQuotations = (quotations || []).some((q) => q.contactId === id);
    if (hasInvoices || hasQuotations)
      throw new Error(serverMessages.thisContactHasInvoicesOrQuotationsAnd);
    await deleteContact(id);
    return true;
  } catch (e) {
    console.error(`Error deleting CRM contact ${id}:`, e);
    throw e;
  }
}

export async function getCRMDeals(): Promise<CRMDeal[]> {
  try {
    const deals = await listDeals();
    return (deals || []).map(mapDeal);
  } catch (e) {
    console.error("Error fetching CRM deals:", e);
    return [];
  }
}

export async function getCRMDealById(id: string): Promise<CRMDeal | null> {
  try {
    const deal = await getDeal(id);
    return deal ? mapDeal(deal) : null;
  } catch (e) {
    console.error(`Error fetching CRM deal ${id}:`, e);
    return null;
  }
}

export async function createCRMDeal(data: {
  title: string;
  value: number;
  currency?: SupportedCurrency;
  stage?: DealStage;
  probability?: number;
  contact_id?: string;
  shoot_date?: string;
  target_close_date?: string;
  notes?: string;
  assigned_to?: string;
}): Promise<CRMDeal> {
  const currency = await assertCompanyCurrency(data.currency);
  if (!validMoneyAmount(data.value, currency, true)) throw new Error(serverMessages.paymentCurrencyPrecisionInvalid);
  const created = await createDeal({
    title: data.title,
    value: data.value.toString(),
    currency,
    stage: data.stage || "lead",
    probability: data.probability ?? 50,
    contactId: data.contact_id || null,
    expectedCloseDate: data.target_close_date || null,
    notes: data.notes || null,
    assignedTo: data.assigned_to || null,
  });
  return mapDeal(created);
}

export async function updateCRMDeal(
  id: string,
  data: Partial<
    Omit<
      CRMDeal,
      "shoot_date" | "target_close_date" | "assigned_to" | "lost_reason"
    >
  > & {
    shoot_date?: string | null;
    target_close_date?: string | null;
    assigned_to?: string | null;
    lost_reason?: string | null;
  },
): Promise<CRMDeal | null> {
  try {
    const updated = await updateDeal(id, {
      title: data.title,
      value: data.value !== undefined ? data.value.toString() : undefined,
      currency: data.currency,
      stage: data.stage,
      probability: data.probability,
      contactId: data.contact_id || undefined,
      expectedCloseDate: data.target_close_date || undefined,
      notes: data.notes || undefined,
      assignedTo: data.assigned_to || undefined,
    });
    return mapDeal(updated);
  } catch (e) {
    console.error(`Error updating CRM deal ${id}:`, e);
    return null;
  }
}

export async function updateDealStage(
  id: string,
  stage: DealStage,
): Promise<CRMDeal | null> {
  return updateCRMDeal(id, { stage });
}

export async function deleteCRMDeal(id: string): Promise<boolean> {
  try {
    await deleteDeal(id);
    return true;
  } catch (e) {
    console.error(`Error deleting CRM deal ${id}:`, e);
    return false;
  }
}

export async function searchCRMContacts(
  term: string,
  limit: number = 10,
): Promise<CRMContact[]> {
  try {
    const clean = term.trim().toLowerCase();
    const contacts = await listContacts();
    if (!clean) {
      return (contacts || []).slice(0, limit).map(mapContact);
    }

    const phoneVars = phoneSearchVariants(clean);
    const filtered = (contacts || []).filter((c) => {
      const name = `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase();
      const comp = (c.company || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      const phone = c.phone || "";
      return (
        name.includes(clean) ||
        comp.includes(clean) ||
        email.includes(clean) ||
        phoneVars.some((v) => phone.includes(v))
      );
    });

    return filtered.slice(0, limit).map(mapContact);
  } catch (e) {
    console.error("Error searching CRM contacts:", e);
    return [];
  }
}

export interface GlobalSearchResult {
  category:
    | "customers"
    | "invoices"
    | "deals"
    | "people"
    | "orders"
    | "products"
    | "shipments"
    | "tasks"
    | "purchase_orders"
    | "legal"
    | "campaigns";
  id: string;
  title: string;
  subtitle: string;
  url: string;
  badge?: string;
}

export async function globalAdminSearch(
  query: string,
  limit: number = 8,
  categories: ReadonlySet<string> = new Set(["customers", "invoices", "deals"]),
  dealScope?: string[] | null,
): Promise<GlobalSearchResult[]> {
  if (
    typeof query !== "string" ||
    query.length > 200 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 50
  )
    throw new Error(serverMessages.invalidSearch);
  const clean = query.trim();
  if (!clean || clean.length < 2) return [];

  const results: GlobalSearchResult[] = [];

  try {
    const phoneVars = phoneSearchVariants(query);
    const contacts = categories.has("customers")
      ? await listContacts()
      : [];

    for (const c of (contacts || []).filter(c => {
      const name = `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase();
      const comp = (c.company || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      const phone = c.phone || "";
      return name.includes(clean.toLowerCase()) || comp.includes(clean.toLowerCase()) || email.includes(clean.toLowerCase()) || phoneVars.some(v => phone.includes(v));
    }).slice(0, limit)) {
      results.push({
        category: "customers",
        id: c.id,
        title:
          `${c.firstName || ""} ${c.lastName || ""}`.trim() ||
          c.company ||
          "Client",
        subtitle: c.company
          ? `${c.company} • ${c.email || c.phone || ""}`
          : c.email || c.phone || "Client",
        url: ROUTES.crm.customer(c.id),
        badge: c.contactType || "client",
      });
    }

    const invoices = categories.has("invoices")
      ? await listInvoices()
      : [];

    for (const inv of (invoices || []).filter(inv => {
      return inv.invoiceNumber?.toLowerCase().includes(clean.toLowerCase()) || inv.notes?.toLowerCase().includes(clean.toLowerCase());
    }).slice(0, limit)) {
      results.push({
        category: "invoices",
        id: inv.id,
        title: inv.invoiceNumber,
        subtitle: `${Number(inv.total).toFixed(getCurrencyDecimals(inv.currency))} ${inv.currency} • Client`,
        url: ROUTES.invoices.detail(inv.id),
        badge: inv.status,
      });
    }

    const deals = categories.has("deals")
      ? await listDeals()
      : [];

    for (const d of (deals || []).filter(d => {
      return d.title?.toLowerCase().includes(clean.toLowerCase());
    }).slice(0, limit)) {
      results.push({
        category: "deals",
        id: d.id,
        title: d.title,
        subtitle: `${Number(d.value).toFixed(getCurrencyDecimals(d.currency))} ${d.currency} • Client`,
        url: ROUTES.crm.deal(d.id),
        badge: d.stage,
      });
    }
    const people = categories.has("people")
      ? await listITAccountsForIT("service-token")
      : null;
    const peopleList: any[] = Array.isArray(people) ? people : (people as any)?.items || [];
    for (const p of peopleList.filter((p: any) => {
      return p.email?.toLowerCase().includes(clean.toLowerCase());
    }).slice(0, limit)) {
      results.push({
        category: "people",
        id: p.id,
        title: p.email,
        subtitle: p.role || (p.roles && p.roles[0]) || "staff",
        url: `${ROUTES.directory}?q=${encodeURIComponent(p.email)}`,
        badge: p.role || (p.roles && p.roles[0]) || "staff",
      });
    }
  } catch (e) {
    console.error("Error running global admin search:", e);
  }

  return results;
}

export async function getCRMDealOverview(
  includeAnalytics = true,
   scope?:
    string[] | null,
) {
  const [deals, contacts] = await Promise.all([
    listDeals().catch(() => []),
    listContacts().catch(() => []),
  ]);
  const contactMap = new Map<string, CRMContact>(
    (contacts || []).map((c) => [c.id, mapContact(c)] as [string, CRMContact]),
  );
  const filtered = scope ? (deals || []).filter((d) => d.assignedTo && scope.includes(d.assignedTo)) : (deals || []);

  const stageStats: Record<string, { count: number; value: number }> = {};
  let activeCount = 0,
    activePipelineValue = 0;

  for (const deal of filtered) {
    const val = Number(deal.value ?? 0);
    const stage = deal.stage || "lead";
    const entry = (stageStats[stage] ||= { count: 0, value: 0 });
    entry.count++;
    entry.value += val;

    if (isActiveDealStage(stage)) {
      activeCount++;
      activePipelineValue += val;
    }
  }

  const recent = [...filtered]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map((d) => {
      const mapped = mapDeal(d);
      if (mapped.contact_id && contactMap.has(mapped.contact_id)) {
        mapped.contact = contactMap.get(mapped.contact_id);
      }
      return mapped;
    });

  return {
    recent,
    stageStats,
    activeCount,
    activePipelineValue,
  };
}