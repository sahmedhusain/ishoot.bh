import { runAtomicMutation } from "../api/atomic";
import { listTableRows } from "../api/tables";
import { mapContact, mapDeal, getCRMDeals } from "./crm";
import type { Invoice, Payment } from "../types";
import { getClientsPage, type ClientListParameters } from "./client-profiles";
import { companyCurrency } from "../finance/company-currency";

export type ListParameters = {
  q?: string;
  status?: string;
  page?: string;
  dealId?: string;
  contactId?: string;
  clientId?: string;
};
export function listParameters(input: ListParameters = {}) {
  return {
    dealId:
      typeof input.dealId === "string" && input.dealId.length <= 150
        ? input.dealId
        : "",
    contactId:
      typeof input.contactId === "string" && input.contactId.length <= 150
        ? input.contactId
        : "",
    clientId:
      typeof input.clientId === "string" && input.clientId.length <= 150
        ? input.clientId
        : "",
    q: typeof input.q === "string" ? input.q.trim().slice(0, 200) : "",
    status:
      typeof input.status === "string" ? input.status.slice(0, 50) : "all",
    page: Math.min(
      1000000,
      Math.max(1, Number.parseInt(input.page || "1", 10) || 1),
    ),
  };
}
const contactMatches = (c: any, q: string) => {
  if (!c) return false;
  const hay = [c.firstName, c.lastName, c.companyName, c.email, c.phone]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
};
type ExportBatch = { after?: string; batchSize: number };
function paginateRows<T extends { id: string; createdAt?: any }>(
  filtered: T[],
  requestedPage: number,
  batch?: ExportBatch,
): { rows: T[]; total: number; page: number; pageSize: number } {
  if (batch) {
    const sorted = [...filtered].sort((a, b) => a.id.localeCompare(b.id));
    const afterFiltered = batch.after ? sorted.filter((r) => r.id > batch.after!) : sorted;
    return {
      rows: afterFiltered.slice(0, Math.min(500, batch.batchSize)),
      total: 0,
      page: 1,
      pageSize: 500,
    };
  }
  const sorted = [...filtered].sort((a, b) => {
    const ta = new Date(a.createdAt || 0).getTime();
    const tb = new Date(b.createdAt || 0).getTime();
    if (tb !== ta) return tb - ta;
    return b.id.localeCompare(a.id);
  });
  const total = sorted.length;
  const page = Math.min(requestedPage, Math.max(1, Math.ceil(total / 50)));
  const rows = sorted.slice((page - 1) * 50, page * 50);
  return { rows, total, page, pageSize: 50 };
}
export async function getDealsPage(
  input: ListParameters,
  batch?: ExportBatch,
  scope?: string[] | null,
) {
  const f = listParameters(input);
  const q = f.q.toLowerCase();
  const scopeSet = scope ? new Set(scope) : null;
  const [rawDeals, rawContacts] = await Promise.all([
    listTableRows<any>("sales", "crm_deal").catch(() => []),
    listTableRows<any>("sales", "crm_contact").catch(() => []),
  ]);
  const contactMap = new Map<string, any>(rawContacts.map((c): [any, any] => [c.id, c]));
  const filtered = rawDeals
    .map((d) => ({ ...d, contact: d.contactId ? contactMap.get(d.contactId) || null : null }))
    .filter((d) => {
      if (scopeSet && (!d.assignedTo || !scopeSet.has(d.assignedTo))) return false;
      if (f.contactId && d.contactId !== f.contactId) return false;
      if (f.status !== "all" && d.dealStage !== f.status) return false;
      if (q && !String(d.title || "").toLowerCase().includes(q) && !contactMatches(d.contact, q)) return false;
      return true;
    });
  const result = paginateRows(filtered, f.page, batch);
  let items = (result.rows || []).map(mapDeal);
  let total = result.total;
  if (!items.length) {
    const { listContacts } = await import("@platform/api-client");
    const [apiDeals, apiContacts] = await Promise.all([
      getCRMDeals().catch(() => []),
      listContacts().catch(() => []),
    ]);
    if (apiDeals.length) {
      const contactMap = new Map<string, any>((apiContacts || []).map((c: any): [any, any] => [c.id || c.ID, c] as [string, any]));
      items = apiDeals.map((d: any) => {
        const contactObj = d.contact_id ? contactMap.get(d.contact_id) : undefined;
        return {
          ...d,
          contact: d.contact ? d.contact : (contactObj ? mapContact(contactObj) : undefined),
        };
      });
      total = items.length;
    }
  }
  return {
    ...result,
    total,
    items,
    rows: undefined,
    filters: f,
  };
}
export type InvoiceListRow = Pick<
  Invoice,
  | "id"
  | "contact_id"
  | "invoice_number"
  | "issue_date"
  | "due_date"
  | "status"
  | "currency"
  | "total_amount"
  | "amount_paid"
  | "amount_due"
  | "contact"
>;
export async function getInvoicesPage(
  input: ListParameters,
  batch?: ExportBatch,
) {
  return runAtomicMutation(async () => {
    const f = listParameters(input);
    const q = f.q.toLowerCase();
    const [rawInvoices, rawPayments, rawContacts, rawDeals] = await Promise.all([
      listTableRows<any>("finance", "invoice").catch(() => []),
      listTableRows<any>("finance", "payment").catch(() => []),
      listTableRows<any>("sales", "crm_contact").catch(() => []),
      listTableRows<any>("sales", "crm_deal").catch(() => []),
    ]);
    const contactMap = new Map<string, any>(rawContacts.map((c): [any, any] => [c.id, c]));
    const dealMap = new Map<string, any>(rawDeals.map((d): [any, any] => [d.id, d]));
    const enriched = rawInvoices.map((inv) => {
      const deal = inv.dealId ? dealMap.get(inv.dealId) || null : null;
      const dealContact = deal?.contactId ? contactMap.get(deal.contactId) || null : null;
      const client = inv.clientId ? contactMap.get(inv.clientId) || null : null;
      return { ...inv, client, deal: deal ? { ...deal, contact: dealContact } : null };
    });
    const filtered = enriched.filter((inv) => {
      if (f.dealId && inv.dealId !== f.dealId) return false;
      if (f.clientId && inv.clientId !== f.clientId) return false;
      if (f.status !== "all" && inv.status !== f.status) return false;
      if (
        q &&
        !String(inv.invoiceNumber || "").toLowerCase().includes(q) &&
        !contactMatches(inv.client, q) &&
        !contactMatches(inv.deal?.contact, q)
      )
        return false;
      return true;
    });
    const result = paginateRows(filtered, f.page, batch);
    const paidMap = new Map<string, number>();
    for (const p of rawPayments) {
      const k = `${p.invoiceId}:${p.currency}`;
      paidMap.set(k, (paidMap.get(k) ?? 0) + Number(p.amount ?? 0));
    }
    let items: InvoiceListRow[] = result.rows.map((r) => {
      const amountPaid = paidMap.get(`${r.id}:${r.currency}`) ?? 0;
      return {
        id: r.id,
        contact_id: r.client?.id || r.deal?.contact?.id || "",
        invoice_number: r.invoiceNumber,
        issue_date: new Date(r.issueDate || Date.now()).toISOString().slice(0, 10),
        due_date: new Date(r.dueDate || Date.now()).toISOString().slice(0, 10),
        status: r.status,
        currency: r.currency,
        total_amount: Number(r.totalAmount),
        amount_paid: amountPaid,
        amount_due: Math.max(0, Number(r.totalAmount) - amountPaid),
        contact:
          r.client || r.deal?.contact
            ? mapContact(r.client || r.deal.contact)
            : undefined,
      };
    });
    let total = result.total;
    if (!items.length) {
      const { listInvoices, listContacts } = await import("@platform/api-client");
      const [apiInvoices, apiContacts] = await Promise.all([
        listInvoices().catch(() => []),
        listContacts().catch(() => []),
      ]);
      if (apiInvoices.length) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const contactMap = new Map<string, any>((apiContacts || []).map((c: any): [any, any] => [c.id || c.ID, c] as [string, any]));
        const fallbackCur = await companyCurrency().catch(() => "USD");
        items = apiInvoices.map((inv: any) => {
          const cid = inv.contactId || inv.ContactID || "";
          const cObj = cid ? contactMap.get(cid) : undefined;
          return {
            id: inv.id || inv.ID || "",
            contact_id: cid,
            invoice_number: inv.invoiceNumber || inv.InvoiceNumber || "",
            issue_date: (inv.issueDate || inv.IssueDate || todayStr).slice(0, 10),
            due_date: (inv.dueDate || inv.DueDate || todayStr).slice(0, 10),
            status: inv.status || inv.Status || "sent",
            currency: inv.currency || inv.Currency || fallbackCur,
            total_amount: Number(inv.total || inv.Total || inv.totalAmount || 0),
            amount_paid: Number(inv.amountPaid || inv.AmountPaid || 0),
            amount_due: Number(inv.balanceDue || inv.BalanceDue || Math.max(0, Number(inv.total || inv.Total || 0) - Number(inv.amountPaid || 0))),
            contact: inv.contact ? mapContact(inv.contact) : (cObj ? mapContact(cObj) : undefined),
          };
        });
        total = items.length;
      }
    }
    return { ...result, items, total, rows: undefined, filters: f };
  });
}
export type PaymentListRow = Pick<
  Payment,
  | "id"
  | "invoice_id"
  | "receipt_number"
  | "payment_date"
  | "amount"
  | "currency"
  | "payment_method"
> & { invoiceNumber: string; customerName: string };
export async function getPaymentsPage(
  input: ListParameters,
  batch?: ExportBatch,
) {
  return runAtomicMutation(async () => {
    const f = listParameters(input);
    const q = f.q.toLowerCase();
    const [rawPayments, rawInvoices, rawContacts, rawDeals] = await Promise.all([
      listTableRows<any>("finance", "payment").catch(() => []),
      listTableRows<any>("finance", "invoice").catch(() => []),
      listTableRows<any>("sales", "crm_contact").catch(() => []),
      listTableRows<any>("sales", "crm_deal").catch(() => []),
    ]);
    const contactMap = new Map<string, any>(rawContacts.map((c): [any, any] => [c.id, c]));
    const dealMap = new Map<string, any>(rawDeals.map((d): [any, any] => [d.id, d]));
    const invoiceMap = new Map<string, any>(
      rawInvoices.map((inv): [string, any] => {
        const deal = inv.dealId ? dealMap.get(inv.dealId) || null : null;
        const dealContact = deal?.contactId ? contactMap.get(deal.contactId) || null : null;
        const client = inv.clientId ? contactMap.get(inv.clientId) || null : null;
        return [inv.id, { ...inv, client, deal: deal ? { ...deal, contact: dealContact } : null }];
      }),
    );
    const enriched = rawPayments.map((p) => ({
      ...p,
      invoice: invoiceMap.get(p.invoiceId) || { invoiceNumber: "", client: null, deal: null },
    }));
    const filtered = enriched.filter((p) => {
      if (f.dealId && p.invoice?.dealId !== f.dealId) return false;
      if (f.clientId && p.invoice?.clientId !== f.clientId) return false;
      if (
        q &&
        !String(p.receiptNumber || "").toLowerCase().includes(q) &&
        !String(p.invoice?.invoiceNumber || "").toLowerCase().includes(q) &&
        !contactMatches(p.invoice?.client, q) &&
        !contactMatches(p.invoice?.deal?.contact, q)
      )
        return false;
      return true;
    });
    const result = paginateRows(filtered, f.page, batch);
    let items: PaymentListRow[] = result.rows.map((r) => {
      const c = r.invoice?.client || r.invoice?.deal?.contact;
      return {
        id: r.id,
        invoice_id: r.invoiceId,
        receipt_number: r.receiptNumber,
        payment_date: new Date(r.paymentDate || Date.now()).toISOString().slice(0, 10),
        amount: Number(r.amount),
        currency: r.currency,
        payment_method: r.paymentMethod,
        invoiceNumber: r.invoice?.invoiceNumber || "",
        customerName:
          c?.companyName ||
          [c?.firstName, c?.lastName].filter(Boolean).join(" "),
      };
    });
    let total = result.total;
    if (!items.length) {
      const { listPayments, listInvoices, listContacts } = await import("@platform/api-client");
      const [apiPayments, apiInvoices, apiContacts] = await Promise.all([
        listPayments().catch(() => []),
        listInvoices().catch(() => []),
        listContacts().catch(() => []),
      ]);
      if (apiPayments.length) {
        const invoiceMap = new Map<string, any>((apiInvoices || []).map((i: any): [any, any] => [i.id || i.ID, i] as [string, any]));
        const contactMap = new Map<string, any>((apiContacts || []).map((c: any): [any, any] => [c.id || c.ID, c] as [string, any]));
        const fallbackCur = await companyCurrency().catch(() => "USD");
        items = apiPayments.map((p: any) => {
          const invId = p.invoiceId || p.InvoiceID;
          const inv = invId ? invoiceMap.get(invId) : undefined;
          const cid = p.contactId || p.ContactID || inv?.contactId || inv?.ContactID;
          const contact = cid ? contactMap.get(cid) : undefined;
          return {
            id: p.id || p.ID || "",
            invoice_id: invId || "",
            receipt_number: p.receiptNumber || p.paymentNumber || p.PaymentNumber || "",
            payment_date: (p.paymentDate || p.PaymentDate || new Date().toISOString()).slice(0, 10),
            amount: Number(p.amount || p.Amount || 0),
            currency: p.currency || p.Currency || fallbackCur,
            payment_method: p.paymentMethod || p.PaymentMethod || "bank_transfer",
            invoiceNumber: inv?.invoiceNumber || inv?.InvoiceNumber || p.invoiceNumber || p.InvoiceNumber || "INV",
            customerName:
              contact?.companyName ||
              contact?.company ||
              (contact?.firstName ? `${contact.firstName} ${contact.lastName || ""}`.trim() : undefined) ||
              p.customerName ||
              "Customer",
          };
        });
        total = items.length;
      }
    }
    const fallbackCur = await companyCurrency().catch(() => "USD");
    const totalsByCurrency = new Map<string, number>();
    const invoiceIds = new Set<string>();
    if (!batch) {
      for (const p of rawPayments) {
        totalsByCurrency.set(p.currency, (totalsByCurrency.get(p.currency) ?? 0) + Number(p.amount ?? 0));
        if (p.invoiceId) invoiceIds.add(p.invoiceId);
      }
    }
    const finalTotals = totalsByCurrency.size
      ? Array.from(totalsByCurrency.entries()).map(([currency, amount]) => ({ currency, amount }))
      : [{ currency: fallbackCur, amount: items.reduce((acc, p) => acc + (p.currency === fallbackCur ? p.amount : 0), 0) }];
    return {
      ...result,
      items,
      total,
      rows: undefined,
      filters: f,
      totals: finalTotals,
      receiptCount: rawPayments.length || items.length,
      invoiceCount: invoiceIds.size || (items.length ? 1 : 0),
    };
  });
}

export async function getCalendarPage(
  input: ListParameters,
  batch?: ExportBatch,
) {
  return runAtomicMutation(async () => {
    const { mapEvent } = await import("./calendar");
    const f = listParameters(input);
    const q = f.q.toLowerCase();
    const [rawEvents, rawDeals] = await Promise.all([
      listTableRows<any>("workflow", "calendar_event").catch(() => []),
      listTableRows<any>("sales", "crm_deal").catch(() => []),
    ]);
    const dealMap = new Map<string, any>(rawDeals.map((d): [any, any] => [d.id, d]));
    const enriched = rawEvents.map((e) => ({
      ...e,
      deal: e.dealId ? dealMap.get(e.dealId) || null : null,
    }));
    const filtered = enriched.filter((e) => {
      if (f.dealId && e.dealId !== f.dealId) return false;
      if (f.contactId && e.deal?.contactId !== f.contactId) return false;
      if (f.clientId && e.deal?.contactId !== f.clientId) return false;
      if (
        q &&
        ![e.title, e.titleAr, e.description]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
    const result = paginateRows(filtered, f.page, batch);
    const count = batch ? 0 : rawEvents.length;
    return {
      ...result,
      items: result.rows.map(mapEvent),
      rows: undefined,
      filters: f,
      count,
    };
  });
}

export async function getMomsPage(input: ListParameters, batch?: ExportBatch) {
  return runAtomicMutation(async () => {
    const { mapDatabaseMom } = await import("./moms");
    const f = listParameters(input);
    const q = f.q.toLowerCase();
    const [rawMoms, rawDeals, rawContacts, rawUsers] = await Promise.all([
      listTableRows<any>("workflow", "minute_of_meeting").catch(() => []),
      listTableRows<any>("sales", "crm_deal").catch(() => []),
      listTableRows<any>("sales", "crm_contact").catch(() => []),
      listTableRows<any>("identity", "user").catch(() => []),
    ]);
    const dealMap = new Map<string, any>(rawDeals.map((d): [any, any] => [d.id, d]));
    const contactMap = new Map<string, any>(rawContacts.map((c): [any, any] => [c.id, c]));
    const userMap = new Map<string, any>(rawUsers.map((u): [any, any] => [u.id, u]));
    const filtered = rawMoms.filter((m) => {
      if (f.dealId && m.dealId !== f.dealId) return false;
      if (f.contactId && m.clientId !== f.contactId) return false;
      if (f.clientId && m.clientId !== f.clientId) return false;
      if (f.status !== "all" && m.status !== f.status) return false;
      if (
        q &&
        ![m.momNumber, m.title, m.titleAr, m.agenda]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
    const result = paginateRows(filtered, f.page, batch);
    const enrichedRows = result.rows.map((m) => ({
      ...m,
      meetingDate: new Date(m.meetingDate || Date.now()),
      createdAt: new Date(m.createdAt || Date.now()),
      updatedAt: new Date(m.updatedAt || m.createdAt || Date.now()),
      deal: m.dealId ? dealMap.get(m.dealId) || null : null,
      client: m.clientId ? contactMap.get(m.clientId) || null : null,
      createdBy: m.createdById ? userMap.get(m.createdById) || null : null,
      approvedBy: m.approvedById ? userMap.get(m.approvedById) || null : null,
    }));
    const count = batch ? 0 : rawMoms.length;
    return {
      ...result,
      items: enrichedRows.map(mapDatabaseMom),
      rows: undefined,
      filters: f,
      count,
    };
  });
}

export async function getCompanyDocumentsPage(
  input: ListParameters,
  batch?: ExportBatch,
) {
  return runAtomicMutation(async () => {
    const { mapCompanyDocument } = await import("./company-documents");
    const f = listParameters(input);
    const q = f.q.toLowerCase();
    const rawDocs = await listTableRows<any>("system", "company_document").catch(() => []);
    const filtered = rawDocs.filter((d) => {
      if (f.status !== "all" && d.category !== f.status) return false;
      if (
        q &&
        ![d.titleEn, d.titleAr, d.documentNumber]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
    const result = paginateRows(filtered, f.page, batch);
    const count = batch ? 0 : rawDocs.length;
    return {
      ...result,
      items: result.rows.map(mapCompanyDocument),
      rows: undefined,
      filters: f,
      count,
    };
  });
}

export const listDomains = {
  contacts: (
    input: ListParameters,
    batch?: ExportBatch,
    _scope?: string[] | null,
  ) => getClientsPage(input as ClientListParameters, batch),
  deals: getDealsPage,
  invoices: getInvoicesPage,
  payments: getPaymentsPage,
  expenses: getExpensesPage,
  archive: getAttachmentsPage,
  calendar: getCalendarPage,
  moms: getMomsPage,
  companyDocuments: getCompanyDocumentsPage,
};
export async function* iterateListExport(
  domain: keyof typeof listDomains,
  input: ListParameters,
  scope?: string[] | null,
) {
  let after: string | undefined;
  while (true) {
    const result = await (
      listDomains[domain] as (
        input: ListParameters,
        batch: ExportBatch,
        scope?: string[] | null,
      ) => ReturnType<(typeof listDomains)[typeof domain]>
    )(input, { after, batchSize: 500 }, scope);
    if (!result.items.length) return;
    yield result.items;
    after = result.items[result.items.length - 1].id;
    if (result.items.length < 500) return;
  }
}

export async function getAttachmentsPage(
  input: ListParameters,
  batch?: ExportBatch,
) {
  const f = listParameters(input);
  const { getAllAttachments } = await import("./attachments");
  return runAtomicMutation(async () => {
    const all = await getAllAttachments({}).catch(() => []);
    const q = f.q.toLowerCase();
    const filtered = all.filter((a: any) => {
      if (f.status !== "all" && a.entity_type !== f.status) return false;
      if (q) {
        const hay = [a.file_name, a.entity_id, a.entity_label, a.uploaded_by_name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const paged = paginateRows(filtered as any[], f.page, batch);
    const counts: Record<string, number> = {};
    if (!batch) {
      for (const a of all as any[]) {
        counts[a.entity_type] = (counts[a.entity_type] ?? 0) + 1;
      }
    }
    return {
      items: paged.rows,
      total: paged.total,
      page: paged.page,
      pageSize: 50,
      filters: f,
      counts,
    };
  });
}
export async function getExpensesPage(
  input: ListParameters,
  batch?: ExportBatch,
  scope?: string[] | null,
) {
  return runAtomicMutation(async () => {
    const { mapExpense } = await import("./expenses");
    const f = listParameters(input);
    const q = f.q.toLowerCase();
    const scopeSet = scope ? new Set(scope) : null;
    const [rawExpenses, rawCategories, rawContacts, rawDeals] = await Promise.all([
      listTableRows<any>("finance", "expense").catch(() => []),
      listTableRows<any>("finance", "expense_category").catch(() => []),
      listTableRows<any>("sales", "crm_contact").catch(() => []),
      listTableRows<any>("sales", "crm_deal").catch(() => []),
    ]);
    const catMap = new Map<string, any>(rawCategories.map((c): [any, any] => [c.id, c]));
    const contactMap = new Map<string, any>(rawContacts.map((c): [any, any] => [c.id, c]));
    const dealMap = new Map<string, any>(rawDeals.map((d): [any, any] => [d.id, d]));
    const enriched = rawExpenses.map((e) => ({
      ...e,
      category: e.categoryId ? catMap.get(e.categoryId) || null : null,
      client: e.clientId ? contactMap.get(e.clientId) || null : null,
      deal: e.dealId ? dealMap.get(e.dealId) || null : null,
      expenseDate: new Date(e.expenseDate || Date.now()),
      createdAt: new Date(e.createdAt || Date.now()),
      updatedAt: new Date(e.updatedAt || e.createdAt || Date.now()),
    }));
    const filtered = enriched.filter((e) => {
      if (scopeSet && (!e.createdById || !scopeSet.has(e.createdById))) return false;
      if (f.status !== "all" && e.categoryId !== f.status) return false;
      if (
        q &&
        ![e.descriptionEn, e.descriptionAr, e.vendorName, e.client?.companyName, e.deal?.title]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
    const result = paginateRows(filtered, f.page, batch);
    const totalsByCurrency = new Map<string, number>();
    const byScopeMap = new Map<string, number>();
    if (!batch) {
      for (const e of rawExpenses) {
        totalsByCurrency.set(e.currency, (totalsByCurrency.get(e.currency) ?? 0) + Number(e.amount ?? 0));
        byScopeMap.set(e.scope, (byScopeMap.get(e.scope) ?? 0) + 1);
      }
    }
    let items = (result.rows || []).map(mapExpense);
    let totalCount = rawExpenses.length;
    let finalTotals = Array.from(totalsByCurrency.entries()).map(([currency, amount]) => ({
      currency,
      amount,
    }));
    if (!items.length) {
      const { listExpenses, listExpenseCategories } = await import("@platform/api-client");
      const [apiExpenses, apiCategories] = await Promise.all([
        listExpenses().catch(() => []),
        listExpenseCategories().catch(() => []),
      ]);
      if (apiExpenses.length) {
        const catMap = new Map<string, any>((apiCategories || []).map((c: any): [any, any] => [c.id, c] as [string, any]));
        items = apiExpenses.map((e: any) => {
          const cat = e.categoryId ? catMap.get(e.categoryId) : undefined;
          return mapExpense({
            ...e,
            category: cat,
            descriptionEn: e.descriptionEn || e.title || "Expense",
            descriptionAr: e.descriptionAr || undefined,
            vendorName: e.vendorName || e.vendor || undefined,
            expenseDate: e.expenseDate
              ? (typeof e.expenseDate === "string" ? new Date(e.expenseDate) : e.expenseDate)
              : new Date(),
            createdAt: e.createdAt
              ? (typeof e.createdAt === "string" ? new Date(e.createdAt) : e.createdAt)
              : new Date(),
            updatedAt: e.updatedAt
              ? (typeof e.updatedAt === "string" ? new Date(e.updatedAt) : e.updatedAt)
              : new Date(),
          });
        });
        totalCount = items.length;
        const sum = items.reduce((acc, exp) => acc + (exp.amount || 0), 0);
        const fallbackCur = await companyCurrency().catch(() => "USD");
        finalTotals = [{ currency: fallbackCur, amount: sum }];
      }
    }
    return {
      ...result,
      scopeCounts: Object.fromEntries(byScopeMap.entries()) as Record<string, number>,
      items,
      rows: undefined,
      filters: f,
      totals: finalTotals,
      count: totalCount,
    };
  });
}
