import type { Prisma } from "@prisma/client";
import { db, runAtomicMutation } from "../db";
import { mapContact, mapDeal } from "./crm";
import type { Invoice, Payment } from "../types";
import { getClientsPage, type ClientListParameters } from "./client-profiles";

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
const contains = (q: string) => ({ contains: q, mode: "insensitive" as const });
export const contactListSelect = {
  id: true,
  firstName: true,
  lastName: true,
  companyName: true,
  email: true,
  phone: true,
  contactType: true,
  jobTitle: true,
  createdAt: true,
  updatedAt: true,
} as const;
const contactSearch = (q: string) => ({
  OR: ["firstName", "lastName", "companyName", "email", "phone"].map((key) => ({
    [key]: contains(q),
  })),
});
type ExportBatch = { after?: string; batchSize: number };
async function pageQuery<T>(
  delegate: string,
  where: any,
  select: any,
  requestedPage: number,
  batch?: ExportBatch,
): Promise<{ rows: T[]; total: number; page: number; pageSize: number }> {
  // Count and rows use one snapshot, including a bounded correction for deleted last pages.
  return db.$transaction(
    async (tx) => {
      const model = (tx as any)[delegate];
      if (batch) {
        const rows = await model.findMany({
          where: {
            AND: [where, ...(batch.after ? [{ id: { gt: batch.after } }] : [])],
          },
          select,
          take: Math.min(500, batch.batchSize),
          orderBy: { id: "asc" },
        });
        return { rows, total: 0, page: 1, pageSize: 500 };
      }
      const total = await model.count({ where });
      const page = Math.min(requestedPage, Math.max(1, Math.ceil(total / 50)));
      const rows = await model.findMany({
        where,
        select,
        take: 50,
        skip: (page - 1) * 50,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      return { rows, total, page, pageSize: 50 };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
/** `scope`: the staff accounts whose deals the viewer may see (data scope); null or missing for all of them. */
export async function getDealsPage(
  input: ListParameters,
  batch?: ExportBatch,
  scope?: string[] | null,
) {
  const f = listParameters(input);
  const where = {
    ...(scope ? { assignedTo: { in: scope } } : {}),
    ...(f.contactId ? { contactId: f.contactId } : {}),
    ...(f.status !== "all" ? { dealStage: f.status } : {}),
    ...(f.q
      ? { OR: [{ title: contains(f.q) }, { contact: contactSearch(f.q) }] }
      : {}),
  };
  const result = await pageQuery<any>(
    "crmDeal",
    where,
    {
      id: true,
      contactId: true,
      title: true,
      dealStage: true,
      dealValue: true,
      currency: true,
      probability: true,
      expectedCloseDate: true,
      shootDate: true,
      assignedTo: true,
      createdAt: true,
      updatedAt: true,
      contact: { select: contactListSelect },
    } satisfies Prisma.CrmDealSelect,
    f.page,
    batch,
  );
  return {
    ...result,
    items: result.rows.map(mapDeal),
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
    const where = {
      ...(f.dealId ? { dealId: f.dealId } : {}),
      ...(f.clientId ? { clientId: f.clientId } : {}),
      ...(f.status !== "all" ? { status: f.status } : {}),
      ...(f.q
        ? {
            OR: [
              { invoiceNumber: contains(f.q) },
              { client: contactSearch(f.q) },
              { deal: { contact: contactSearch(f.q) } },
            ],
          }
        : {}),
    };
    const result = await pageQuery<any>(
      "invoice",
      where,
      {
        id: true,
        invoiceNumber: true,
        issueDate: true,
        dueDate: true,
        status: true,
        currency: true,
        totalAmount: true,
        client: { select: contactListSelect },
        deal: { select: { contact: { select: contactListSelect } } },
      } satisfies Prisma.InvoiceSelect,
      f.page,
      batch,
    );
    const paid = await db.payment.groupBy({
      by: ["invoiceId", "currency"],
      where: { invoiceId: { in: result.rows.map((r) => r.id) } },
      _sum: { amount: true },
    });
    const items: InvoiceListRow[] = result.rows.map((r) => {
      const amountPaid = Number(
        paid.find((p) => p.invoiceId === r.id && p.currency === r.currency)
          ?._sum.amount || 0,
      );
      return {
        id: r.id,
        contact_id: r.client?.id || r.deal?.contact?.id || "",
        invoice_number: r.invoiceNumber,
        issue_date: r.issueDate.toISOString().slice(0, 10),
        due_date: r.dueDate.toISOString().slice(0, 10),
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
    return { ...result, items, rows: undefined, filters: f };
  }, "RepeatableRead");
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
    const where = {
      ...(f.dealId ? { invoice: { dealId: f.dealId } } : {}),
      ...(f.clientId ? { invoice: { clientId: f.clientId } } : {}),
      ...(f.q
        ? {
            OR: [
              { receiptNumber: contains(f.q) },
              { invoice: { invoiceNumber: contains(f.q) } },
              { invoice: { client: contactSearch(f.q) } },
              { invoice: { deal: { contact: contactSearch(f.q) } } },
            ],
          }
        : {}),
    };
    const result = await pageQuery<any>(
      "payment",
      where,
      {
        id: true,
        invoiceId: true,
        receiptNumber: true,
        paymentDate: true,
        amount: true,
        currency: true,
        paymentMethod: true,
        invoice: {
          select: {
            invoiceNumber: true,
            client: {
              select: { firstName: true, lastName: true, companyName: true },
            },
            deal: {
              select: {
                contact: {
                  select: {
                    firstName: true,
                    lastName: true,
                    companyName: true,
                  },
                },
              },
            },
          },
        },
      } satisfies Prisma.PaymentSelect,
      f.page,
      batch,
    );
    const items: PaymentListRow[] = result.rows.map((r) => {
      const c = r.invoice.client || r.invoice.deal?.contact;
      return {
        id: r.id,
        invoice_id: r.invoiceId,
        receipt_number: r.receiptNumber,
        payment_date: r.paymentDate.toISOString().slice(0, 10),
        amount: Number(r.amount),
        currency: r.currency,
        payment_method: r.paymentMethod,
        invoiceNumber: r.invoice.invoiceNumber,
        customerName:
          c?.companyName ||
          [c?.firstName, c?.lastName].filter(Boolean).join(" "),
      };
    });
    const [totals, receiptCount, invoiceCount] = batch
      ? [[], 0, 0]
      : await Promise.all([
          db.payment.groupBy({ by: ["currency"], _sum: { amount: true } }),
          db.payment.count(),
          db.$queryRaw<
            Array<{ count: bigint }>
          >`SELECT count(DISTINCT "invoiceId") count FROM "Payment"`.then((r) =>
            Number(r[0].count),
          ),
        ]);
    return {
      ...result,
      items,
      rows: undefined,
      filters: f,
      totals: totals.map((t) => ({
        currency: t.currency,
        amount: Number(t._sum.amount),
      })),
      receiptCount,
      invoiceCount,
    };
  }, "RepeatableRead");
}

export async function getCalendarPage(
  input: ListParameters,
  batch?: ExportBatch,
) {
  return runAtomicMutation(async () => {
    const { mapEvent } = await import("./calendar");
    const f = listParameters(input);
    const where = {
      ...(f.dealId ? { dealId: f.dealId } : {}),
      ...(f.contactId ? { deal: { contactId: f.contactId } } : {}),
      ...(f.clientId ? { deal: { contactId: f.clientId } } : {}),
      ...(f.q
        ? {
            OR: [
              { title: contains(f.q) },
              { titleAr: contains(f.q) },
              { description: contains(f.q) },
            ],
          }
        : {}),
    };
    const result = await pageQuery<any>(
      "calendarEvent",
      where,
      {
        id: true,
        title: true,
        titleAr: true,
        description: true,
        startDate: true,
        endDate: true,
        allDay: true,
        location: true,
        color: true,
        eventType: true,
        dealId: true,
        createdById: true,
        googleEventId: true,
        googleCalendarId: true,
        recurrence: true,
        reminders: true,
        attendees: true,
        createdAt: true,
        updatedAt: true,
        deal: true,
      },
      f.page,
      batch,
    );
    const count = batch ? 0 : await db.calendarEvent.count();
    return {
      ...result,
      items: result.rows.map(mapEvent),
      rows: undefined,
      filters: f,
      count,
    };
  }, "RepeatableRead");
}

export async function getMomsPage(input: ListParameters, batch?: ExportBatch) {
  return runAtomicMutation(async () => {
    const { mapPrismaMom } = await import("./moms");
    const f = listParameters(input);
    const where = {
      ...(f.dealId ? { dealId: f.dealId } : {}),
      ...(f.contactId ? { clientId: f.contactId } : {}),
      ...(f.clientId ? { clientId: f.clientId } : {}),
      ...(f.status !== "all" ? { status: f.status } : {}),
      ...(f.q
        ? {
            OR: [
              { momNumber: contains(f.q) },
              { title: contains(f.q) },
              { titleAr: contains(f.q) },
              { agenda: contains(f.q) },
            ],
          }
        : {}),
    };
    const result = await pageQuery<any>(
      "minuteOfMeeting",
      where,
      {
        id: true,
        momNumber: true,
        title: true,
        titleAr: true,
        meetingDate: true,
        startTime: true,
        endTime: true,
        location: true,
        dealId: true,
        clientId: true,
        attendees: true,
        agenda: true,
        discussionPoints: true,
        actionItems: true,
        decisions: true,
        notes: true,
        status: true,
        createdById: true,
        approvedById: true,
        signatureUrl: true,
        pdfStoragePath: true,
        createdAt: true,
        updatedAt: true,
        deal: { select: { title: true } },
        client: {
          select: { firstName: true, lastName: true, companyName: true },
        },
        createdBy: { select: { fullName: true } },
        approvedBy: { select: { fullName: true } },
      },
      f.page,
      batch,
    );
    const count = batch ? 0 : await db.minuteOfMeeting.count();
    return {
      ...result,
      items: result.rows.map(mapPrismaMom),
      rows: undefined,
      filters: f,
      count,
    };
  }, "RepeatableRead");
}

export async function getCompanyDocumentsPage(
  input: ListParameters,
  batch?: ExportBatch,
) {
  return runAtomicMutation(async () => {
    const { mapCompanyDocument } = await import("./company-documents");
    const f = listParameters(input);
    const where = {
      ...(f.status !== "all" ? { category: f.status } : {}),
      ...(f.q
        ? {
            OR: [
              { titleEn: contains(f.q) },
              { titleAr: contains(f.q) },
              { documentNumber: contains(f.q) },
            ],
          }
        : {}),
    };
    const result = await pageQuery<any>(
      "companyDocument",
      where,
      {
        id: true,
        titleEn: true,
        titleAr: true,
        category: true,
        documentNumber: true,
        fileUrl: true,
        fileSize: true,
        mimeType: true,
        validFrom: true,
        validUntil: true,
        notes: true,
        uploadedById: true,
        createdAt: true,
        updatedAt: true,
      },
      f.page,
      batch,
    );
    const count = batch ? 0 : await db.companyDocument.count();
    return {
      ...result,
      items: result.rows.map(mapCompanyDocument),
      rows: undefined,
      filters: f,
      count,
    };
  }, "RepeatableRead");
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
// Full export is keyset-batched independently of UI pages. Only one batch is retained.
export async function* iterateListExport(
  domain: keyof typeof listDomains,
  input: ListParameters,
  /** Data scope for deals and expenses (other lists ignore it). */
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
  const { Prisma } = await import("@prisma/client");
  const { getAllAttachments } = await import("./attachments");
  const { runAtomicMutation } = await import("../db");
  const pattern = `%${f.q.replace(/[\\%_]/g, "\\$&")}%`;
  const condition = Prisma.sql`WHERE (${f.q}='' OR a."fileName" ILIKE ${pattern} OR a."entityId" ILIKE ${pattern} OR u."fullName" ILIKE ${pattern} OR c."companyName" ILIKE ${pattern} OR concat(c."firstName",' ',c."lastName") ILIKE ${pattern} OR i."invoiceNumber" ILIKE ${pattern} OR d.title ILIKE ${pattern} OR p."receiptNumber" ILIKE ${pattern}) AND (${f.status}='all' OR a."entityType"=${f.status})`;
  const joins = Prisma.sql`FROM "Attachment" a LEFT JOIN "User" u ON u.id=a."uploadedById" LEFT JOIN "CrmContact" c ON c.id=a."entityId" AND a."entityType" IN ('contact','customer_vault') LEFT JOIN "Invoice" i ON i.id=a."entityId" AND a."entityType"='invoice' LEFT JOIN "CrmDeal" d ON d.id=a."entityId" AND a."entityType"='deal' LEFT JOIN "Payment" p ON p.id=a."entityId" AND a."entityType"='payment'`;
  return runAtomicMutation(async () => {
    const [count] = batch
      ? [{ count: BigInt(0) }]
      : await db.$queryRaw<Array<{ count: bigint }>>(
          Prisma.sql`SELECT count(*) ${joins} ${condition}`,
        );
    const total = Number(count.count),
      page = Math.min(f.page, Math.max(1, Math.ceil(total / 50)));
    const ids = await db.$queryRaw<Array<{ id: string }>>(
      batch
        ? Prisma.sql`SELECT a.id ${joins} ${condition} AND a.id > ${batch.after || ""} ORDER BY a.id ASC LIMIT ${Math.min(500, batch.batchSize)}`
        : Prisma.sql`SELECT a.id ${joins} ${condition} ORDER BY a."createdAt" DESC,a.id DESC LIMIT 50 OFFSET ${(page - 1) * 50}`,
    );
    const fetched = await getAllAttachments({ ids: ids.map((r) => r.id) });
    const positions = new Map(ids.map((row, index) => [row.id, index]));
    const items = fetched.sort(
      (a, b) => positions.get(a.id)! - positions.get(b.id)!,
    );
    const groups = batch
      ? []
      : await db.attachment.groupBy({ by: ["entityType"], _count: true });
    return {
      items,
      total,
      page,
      pageSize: 50,
      filters: f,
      counts: Object.fromEntries(groups.map((g) => [g.entityType, g._count])),
    };
  }, "RepeatableRead");
}
export async function getExpensesPage(
  input: ListParameters,
  batch?: ExportBatch,
  /** The staff accounts whose expenses the viewer may see (data scope); null or missing for all of them. */
  scope?: string[] | null,
) {
  return runAtomicMutation(async () => {
    const { mapExpense } = await import("./expenses");
    const f = listParameters(input);
    const where = {
      ...(scope ? { createdById: { in: scope } } : {}),
      ...(f.status !== "all" ? { categoryId: f.status } : {}),
      ...(f.q
        ? {
            OR: [
              { descriptionEn: contains(f.q) },
              { descriptionAr: contains(f.q) },
              { vendorName: contains(f.q) },
              { client: { companyName: contains(f.q) } },
              { deal: { title: contains(f.q) } },
            ],
          }
        : {}),
    };
    const result = await pageQuery<any>(
      "expense",
      where,
      {
        id: true,
        categoryId: true,
        dealId: true,
        clientId: true,
        scope: true,
        status: true,
        paymentMethod: true,
        receiptUrl: true,
        inputVatAmount: true,
        client: {
          select: { firstName: true, lastName: true, companyName: true },
        },
        deal: { select: { title: true } },
        descriptionEn: true,
        descriptionAr: true,
        amount: true,
        currency: true,
        expenseDate: true,
        vendorName: true,
        isBillable: true,
        isRecurring: true,
        createdAt: true,
        category: {
          select: {
            id: true,
            slug: true,
            nameEn: true,
            nameAr: true,
            color: true,
            displayOrder: true,
            kind: true,
            isSystem: true,
            isActive: true,
          },
        },
      } satisfies Prisma.ExpenseSelect,
      f.page,
      batch,
    );
    const [totals, count, byScope] = batch
      ? [[], 0, []]
      : await Promise.all([
          db.expense.groupBy({ by: ["currency"], _sum: { amount: true } }),
          db.expense.count(),
          db.expense.groupBy({ by: ["scope"], _count: { _all: true } }),
        ]);
    return {
      ...result,
      scopeCounts: Object.fromEntries(
        byScope.map((g) => [g.scope, g._count._all]),
      ) as Record<string, number>,
      items: result.rows.map(mapExpense),
      rows: undefined,
      filters: f,
      totals: totals.map((t) => ({
        currency: t.currency,
        amount: Number(t._sum.amount),
      })),
      count,
    };
  }, "RepeatableRead");
}
