import type { Prisma } from "@prisma/client";
import { db, runAtomicMutation } from "../db";
import { REQUEST_CLOSED_STATUSES, REQUEST_SORTS, REQUEST_SOURCES, canTransitionRequest, requestKindOf, type RequestKind, type RequestSort } from "../constants/requests";
import { cancelPendingApprovals } from "../services/approval-engine";
import { assignRequest, reassignRequest } from "./inquiries";
import { getNextSequenceNumber } from "./sequence";
import { assertAssigneeAvailable, assertActorNotOnLeave } from "./leave";

export async function createConsolidatedRequest(
  data: {
    requestType: "SR" | "inquiry" | "quote_request";
    name: string;
    email: string;
    phone?: string | null;
    companyName?: string | null;
    serviceType?: string | null;
    budgetRange?: string | null;
    timeline?: string | null;
    message: string;
    priority?: string;
    team?: string | null;
    assignedToId?: string | null;
    customerId?: string | null;
    slaDueDate?: Date | null;
  },
  actorId?: string,
): Promise<any> {
  if (actorId) {
    await assertActorNotOnLeave(actorId);
  }

  // Generate sequence reference e.g. SR-2026-000001 or CR-2026-000001
  // Change requests (CR) are retired: client feedback arrives as inquiries and is triaged in the inbox.
  if ((data.requestType as string) === "CR") throw new Error("Change requests are no longer created; log a service request or an inquiry");
  const prefix = data.requestType === "SR" ? "SR" : "INQ";
  const reference = await getNextSequenceNumber(prefix);

  if (data.assignedToId) {
    const periodStart = new Date();
    const periodEnd = data.slaDueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await assertAssigneeAvailable(data.assignedToId, periodStart, periodEnd);
  }

  const emailNorm = data.email.toLowerCase().trim();

  const inquiry = await db.$transaction(async (tx) => {
    const inq = await tx.inquiry.create({
      data: {
        reference,
        requestType: data.requestType,
        intent: data.requestType === "quote_request" ? "quote_request" : "inquiry",
        name: data.name,
        email: data.email,
        emailNorm,
        phone: data.phone || null,
        companyName: data.companyName || null,
        serviceType: data.serviceType || null,
        budgetRange: data.budgetRange || null,
        timeline: data.timeline || null,
        message: data.message,
        priority: data.priority || "normal",
        team: data.team || null,
        assignedToId: data.assignedToId || null,
        customerId: data.customerId || null,
        slaDueDate: data.slaDueDate || null,
        workflowStatus: data.assignedToId ? "assigned" : "received",
      },
      include: {
        assignedTo: { select: { id: true, fullName: true, email: true } },
        customer: true,
      },
    });

    if (actorId) {
      await tx.requestEvent.create({
        data: {
          inquiryId: inq.id,
          actorId,
          eventType: "created",
          details: {
            requestType: data.requestType,
            reference,
            priority: data.priority || "normal",
            assignedToId: data.assignedToId || null,
          },
        },
      });

      if (data.assignedToId) {
        await tx.requestAssignment.create({
          data: {
            inquiryId: inq.id,
            assignedToId: data.assignedToId,
            assignedById: actorId,
            team: data.team || null,
            reason: "Initial assignment upon request creation",
            active: true,
          },
        });
      }
    }

    return inq;
  });

  return inquiry;
}

/**
 * The single assignment path for SR/CR: locks the row, validates the workflow state and the assignee's
 * availability, then records the assignment history.
 */
export async function assignConsolidatedRequest(
  id: string,
  newAssigneeId: string,
  actorId: string,
  team?: string | null,
  reason?: string | null,
): Promise<any> {
  await assertActorNotOnLeave(actorId);

  return runAtomicMutation(async () => {
    const request = await db.inquiry.findUnique({
      where: { id },
      select: { id: true, slaDueDate: true, assignedToId: true, workflowStatus: true },
    });
    if (!request) throw new Error("Request not found");

    const periodStart = new Date();
    const periodEnd = request.slaDueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await assertAssigneeAvailable(newAssigneeId, periodStart, periodEnd);

    const actor = await db.user.findUnique({ where: { id: actorId }, select: { fullName: true } });
    const isFirstAssignment = canTransitionRequest(request.workflowStatus, "assign") && !request.assignedToId;
    if (isFirstAssignment) {
      await assignRequest(id, {
        assignedToId: newAssigneeId,
        team: team || undefined,
        assignedById: actorId,
        assignedByName: actor?.fullName,
        notes: reason || undefined,
      });
    } else {
      // Re-assigning work that is waiting for approval withdraws that approval.
      if (request.workflowStatus === "pending_approval") await cancelPendingApprovals("service_request", id);
      await reassignRequest(id, {
        newAssignedToId: newAssigneeId,
        newTeam: team || undefined,
        reassignedById: actorId,
        reassignedByName: actor?.fullName,
        notes: reason?.trim() || "Reassigned",
      });
    }

    await db.requestAssignment.updateMany({ where: { inquiryId: id, active: true }, data: { active: false } });
    await db.requestAssignment.create({
      data: {
        inquiryId: id,
        assignedToId: newAssigneeId,
        assignedById: actorId,
        team: team || null,
        reason: reason || (isFirstAssignment ? "Assigned" : "Reassigned"),
        active: true,
      },
    });
    await db.requestEvent.create({
      data: {
        inquiryId: id,
        actorId,
        eventType: "assignment",
        details: { previousAssigneeId: request.assignedToId, newAssigneeId, team, reason },
      },
    });

    return db.inquiry.findUnique({
      where: { id },
      include: { assignedTo: { select: { id: true, fullName: true, email: true } }, customer: true },
    });
  });
}

export async function addRequestComment(
  id: string,
  authorId: string,
  body: string,
  isClientVisible: boolean = false,
  attachments?: any,
): Promise<any> {
  await assertActorNotOnLeave(authorId);

  const comment = await db.$transaction(async (tx) => {
    const c = await tx.requestComment.create({
      data: {
        inquiryId: id,
        authorId,
        body,
        isClientVisible,
        attachments: attachments || null,
      },
      include: {
        author: { select: { id: true, fullName: true, email: true } },
      },
    });

    await tx.requestEvent.create({
      data: {
        inquiryId: id,
        actorId: authorId,
        eventType: "comment",
        details: {
          commentId: c.id,
          isClientVisible,
        },
      },
    });

    return c;
  });

  return comment;
}

export async function addRequestEvent(
  inquiryId: string,
  eventType: string,
  details: any,
  actorId?: string,
): Promise<any> {
  return await db.requestEvent.create({
    data: {
      inquiryId,
      actorId: actorId || null,
      eventType,
      details: details || {},
    },
    include: {
      actor: { select: { id: true, fullName: true, email: true } },
    },
  });
}

const consolidatedRequestInclude = {
  customer: true,
  assignedTo: { select: { id: true, fullName: true, email: true } },
  convertedDeal: { select: { id: true, title: true, dealStage: true, dealValue: true } },
  quotations: {
    select: { id: true, quotationNumber: true, totalAmount: true, currency: true, status: true },
    orderBy: { createdAt: "desc" },
  },
  requestEvents: {
    include: { actor: { select: { id: true, fullName: true, email: true } } },
    orderBy: { createdAt: "desc" },
  },
  assignments: {
    include: {
      assignedTo: { select: { id: true, fullName: true, email: true } },
      assignedBy: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  },
  comments: {
    include: { author: { select: { id: true, fullName: true, email: true } } },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.InquiryInclude;

type RawConsolidatedRequest = Prisma.InquiryGetPayload<{ include: typeof consolidatedRequestInclude }>;

/** A request with everything its detail page shows. Money is converted to numbers so it can cross into client components. */
export type ConsolidatedRequest = Omit<RawConsolidatedRequest, "convertedDeal" | "quotations"> & {
  convertedDeal: (Omit<NonNullable<RawConsolidatedRequest["convertedDeal"]>, "dealValue"> & { dealValue: number }) | null;
  quotations: (Omit<RawConsolidatedRequest["quotations"][number], "totalAmount"> & { totalAmount: number })[];
};

export async function getConsolidatedRequestById(id: string): Promise<ConsolidatedRequest | null> {
  const request = await db.inquiry.findUnique({ where: { id }, include: consolidatedRequestInclude });
  if (!request) return null;
  return {
    ...request,
    convertedDeal: request.convertedDeal
      ? { ...request.convertedDeal, dealValue: Number(request.convertedDeal.dealValue) }
      : null,
    quotations: request.quotations.map((quotation) => ({ ...quotation, totalAmount: Number(quotation.totalAmount) })),
  };
}



export interface RequestListFilters {
  kind?: RequestKind | "all";
  /** "open" (default) hides resolved/archived/rejected; any workflow status narrows further. */
  status?: string;
  scope?: "all" | "mine" | "unassigned";
  team?: string;
  priority?: string;
  /** Kept for old links: the same as due = "overdue". */
  overdue?: boolean;
  /** "overdue", "today" (due by end of today), "week" (due within 7 days) or "none" (no SLA date). */
  due?: string;
  assignee?: string;
  source?: string;
  customerId?: string;
  /** Received on or after / on or before (YYYY-MM-DD). */
  from?: string;
  to?: string;
  search?: string;
  sort?: string;
}

export interface RequestListRow {
  id: string;
  reference: string;
  kind: RequestKind;
  title: string;
  customer: string;
  priority: string;
  workflowStatus: string;
  team: string | null;
  source: string;
  assignee: string | null;
  slaDueDate: string | null;
  overdue: boolean;
  createdAt: string;
}

const kindWhere = (kind: RequestKind): Prisma.InquiryWhereInput =>
  kind === "service"
    ? { requestType: "SR" }
    : kind === "feedback"
      ? { OR: [{ requestType: "CR" }, { intent: { in: ["complaint", "suggestion"] } }] }
      : kind === "quote"
        ? { requestType: { notIn: ["SR", "CR"] }, OR: [{ requestType: "quote_request" }, { intent: "quote_request" }] }
        : { requestType: { notIn: ["SR", "CR", "quote_request"] }, intent: "inquiry" };

function requestWhere(filters: RequestListFilters, viewerId: string): Prisma.InquiryWhereInput {
  const now = new Date();
  const open: Prisma.InquiryWhereInput = { workflowStatus: { notIn: [...REQUEST_CLOSED_STATUSES] } };
  const and: Prisma.InquiryWhereInput[] = [];
  if (filters.kind && filters.kind !== "all") and.push(kindWhere(filters.kind));
  const status = filters.status || "open";
  if (status === "open") and.push(open);
  else if (status !== "all") and.push({ workflowStatus: status });
  if (filters.scope === "mine") and.push({ assignedToId: viewerId });
  if (filters.scope === "unassigned") and.push({ assignedToId: null });
  if (filters.team && filters.team !== "all") and.push({ team: filters.team });
  if (filters.priority && filters.priority !== "all") and.push({ priority: filters.priority });
  const due = filters.overdue ? "overdue" : filters.due;
  if (due === "overdue") and.push(open, { slaDueDate: { lt: now } });
  if (due === "today") {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    and.push(open, { slaDueDate: { gte: now, lte: end } });
  }
  if (due === "week") and.push(open, { slaDueDate: { gte: now, lte: new Date(now.getTime() + 7 * 86400000) } });
  if (due === "none") and.push({ slaDueDate: null });
  if (filters.assignee && filters.assignee !== "all" && filters.assignee.length <= 150) and.push({ assignedToId: filters.assignee });
  if (filters.source && (REQUEST_SOURCES as readonly string[]).includes(filters.source)) and.push({ source: filters.source });
  if (filters.customerId && filters.customerId.length <= 150) and.push({ customerId: filters.customerId });
  const day = (value: string | undefined, end = false) =>
    value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) ? new Date(`${value}T${end ? "23:59:59.999" : "00:00:00"}+03:00`) : null;
  const from = day(filters.from);
  const to = day(filters.to, true);
  if (from || to) and.push({ createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } });
  if (filters.search?.trim()) {
    const term = filters.search.trim().slice(0, 200);
    and.push({ OR: ["name", "email", "companyName", "message", "reference", "serviceType"].map((field) => ({ [field]: { contains: term, mode: "insensitive" as const } })) });
  }
  return and.length ? { AND: and } : {};
}

const REQUEST_ORDER: Record<Exclude<RequestSort, "priority">, Prisma.InquiryOrderByWithRelationInput[]> = {
  // Most urgent first: overdue SLAs, then newest.
  urgency: [{ slaDueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }, { id: "desc" }],
  newest: [{ createdAt: "desc" }, { id: "desc" }],
  oldest: [{ createdAt: "asc" }, { id: "asc" }],
  sla_asc: [{ slaDueDate: { sort: "asc", nulls: "last" } }, { id: "asc" }],
  sla_desc: [{ slaDueDate: { sort: "desc", nulls: "last" } }, { id: "asc" }],
  customer_asc: [{ companyName: { sort: "asc", nulls: "last" } }, { name: "asc" }, { id: "asc" }],
};

const listSelect = {
  id: true, reference: true, requestType: true, intent: true, serviceType: true, message: true, name: true, companyName: true, source: true,
  priority: true, workflowStatus: true, team: true, slaDueDate: true, createdAt: true, assignedTo: { select: { fullName: true } },
} satisfies Prisma.InquirySelect;
type ListRecord = Prisma.InquiryGetPayload<{ select: typeof listSelect }>;

/** One page of matches. Priority order (urgent, high, normal) walks the priority buckets in turn. */
async function requestPage(where: Prisma.InquiryWhereInput, sort: RequestSort, skip: number, take: number): Promise<ListRecord[]> {
  if (sort !== "priority") return db.inquiry.findMany({ where, select: listSelect, orderBy: REQUEST_ORDER[sort], skip, take });
  const buckets = ["urgent", "high", "normal"];
  const rest: Prisma.InquiryWhereInput = { priority: { notIn: buckets } };
  const groups = [...buckets.map((priority) => ({ priority })), rest];
  const rows: ListRecord[] = [];
  for (const group of groups) {
    if (rows.length >= take) break;
    const bucket: Prisma.InquiryWhereInput = { AND: [where, group] };
    const count = await db.inquiry.count({ where: bucket });
    if (skip >= count) {
      skip -= count;
      continue;
    }
    rows.push(...(await db.inquiry.findMany({ where: bucket, select: listSelect, orderBy: REQUEST_ORDER.urgency, skip, take: take - rows.length })));
    skip = 0;
  }
  return rows;
}

function toRow(r: ListRecord, now: Date): RequestListRow {
  const closed = new Set<string>(REQUEST_CLOSED_STATUSES);
  return {
    id: r.id,
    reference: r.reference,
    kind: requestKindOf(r),
    title: r.serviceType || (r.message.length > 80 ? r.message.slice(0, 80) + "…" : r.message),
    customer: r.companyName || r.name,
    priority: r.priority,
    workflowStatus: r.workflowStatus,
    team: r.team,
    source: r.source,
    assignee: r.assignedTo?.fullName ?? null,
    slaDueDate: r.slaDueDate?.toISOString() ?? null,
    overdue: !!r.slaDueDate && r.slaDueDate < now && !closed.has(r.workflowStatus),
    createdAt: r.createdAt.toISOString(),
  };
}

/** Every match for the CSV export, walked by id. */
export async function getRequestExportBatch(filters: RequestListFilters, viewerId: string, batch: { after?: string; batchSize: number }) {
  const where = requestWhere(filters, viewerId);
  const rows = await db.inquiry.findMany({
    where: { AND: [where, ...(batch.after ? [{ id: { gt: batch.after } }] : [])] },
    select: listSelect,
    orderBy: { id: "asc" },
    take: Math.min(500, batch.batchSize),
  });
  const now = new Date();
  return rows.map((r) => toRow(r, now));
}

/** The request inbox: lean rows, server-side filters and sorting, and the counters the managers need. */
export async function getRequestList(filters: RequestListFilters, viewerId: string, page = 1) {
  const now = new Date();
  const open: Prisma.InquiryWhereInput = { workflowStatus: { notIn: [...REQUEST_CLOSED_STATUSES] } };
  const where = requestWhere(filters, viewerId);
  const sort: RequestSort = (REQUEST_SORTS as readonly string[]).includes(filters.sort ?? "") ? (filters.sort as RequestSort) : "urgency";
  const safePage = Number.isInteger(page) && page >= 1 ? Math.min(page, 10000) : 1;
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [rows, total, openCount, overdueCount, unassignedCount, awaitingApproval, mineCount, resolvedThisMonth] = await runAtomicMutation(
    () =>
      Promise.all([
        requestPage(where, sort, (safePage - 1) * 50, 50),
        db.inquiry.count({ where }),
        db.inquiry.count({ where: open }),
        db.inquiry.count({ where: { ...open, slaDueDate: { lt: now } } }),
        db.inquiry.count({ where: { ...open, assignedToId: null } }),
        db.inquiry.count({ where: { workflowStatus: "pending_approval" } }),
        db.inquiry.count({ where: { ...open, assignedToId: viewerId } }),
        db.inquiry.count({ where: { workflowStatus: "resolved", resolvedAt: { gte: monthStart } } }),
      ]),
    "RepeatableRead",
  );
  return {
    page: safePage,
    pageSize: 50,
    total,
    sort,
    stats: { open: openCount, overdue: overdueCount, unassigned: unassignedCount, awaitingApproval, mine: mineCount, resolvedThisMonth },
    items: rows.map((r) => toRow(r, now)),
  };
}
