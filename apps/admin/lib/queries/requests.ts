import { slaDueFor } from "../services/service-sla";
import { serverMessages } from "@platform/locales";
import { runAtomicMutation } from "../api/atomic";
import { listTableRows, upsertTableRow } from "../api/tables";
import {
  REQUEST_CLOSED_STATUSES,
  REQUEST_SORTS,
  REQUEST_SOURCES,
  canTransitionRequest,
  referencePrefixFor,
  requestKindOf,
  type RequestKind,
  type RequestSort,
} from "../constants/requests";
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

  if ((data.requestType as string) === "CR")
    throw new Error(serverMessages.changeRequestsAreNoLongerCreatedLog);
  const reference = await getNextSequenceNumber(
    referencePrefixFor({
      requestType: data.requestType,
      intent:
        data.requestType === "quote_request" ? "quote_request" : "inquiry",
    }),
  );

  if (data.assignedToId) {
    const periodStart = new Date();
    const periodEnd =
      data.slaDueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await assertAssigneeAvailable(data.assignedToId, periodStart, periodEnd);
  }

  const emailNorm = data.email.toLowerCase().trim();
  const slaDueDate = data.slaDueDate || (await slaDueFor(data.priority, new Date()));

  return runAtomicMutation(async () => {
    const inqId = crypto.randomUUID();
    const inq = await upsertTableRow<Record<string, any>>("sales", "inquiry", {
      id: inqId,
      reference,
      requestType: data.requestType,
      intent:
        data.requestType === "quote_request" ? "quote_request" : "inquiry",
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
      slaDueDate: slaDueDate.toISOString(),
      workflowStatus: data.assignedToId ? "assigned" : "received",
    });

    if (actorId) {
      await upsertTableRow("system", "request_event", {
        id: crypto.randomUUID(),
        inquiryId: inqId,
        actorId,
        eventType: "created",
        details: {
          requestType: data.requestType,
          reference,
          priority: data.priority || "normal",
          assignedToId: data.assignedToId || null,
        },
      });

      if (data.assignedToId) {
        await upsertTableRow("system", "request_assignment", {
          id: crypto.randomUUID(),
          inquiryId: inqId,
          assignedToId: data.assignedToId,
          assignedById: actorId,
          team: data.team || null,
          reason: "Initial assignment upon request creation",
          active: true,
        });
      }
    }

    const [users, contacts] = await Promise.all([
      data.assignedToId ? listTableRows<Record<string, any>>("identity", "user") : Promise.resolve([]),
      data.customerId ? listTableRows<Record<string, any>>("sales", "crm_contact") : Promise.resolve([]),
    ]);
    const assignedTo = data.assignedToId
      ? users.find((u) => u.id === data.assignedToId) ?? null
      : null;
    const customer = data.customerId
      ? contacts.find((c) => c.id === data.customerId) ?? null
      : null;

    return {
      ...inq,
      assignedTo: assignedTo
        ? { id: assignedTo.id, fullName: assignedTo.fullName, email: assignedTo.email }
        : null,
      customer,
    };
  });
}

export async function assignConsolidatedRequest(
  id: string,
  newAssigneeId: string,
  actorId: string,
  team?: string | null,
  reason?: string | null,
): Promise<any> {
  await assertActorNotOnLeave(actorId);

  return runAtomicMutation(async () => {
    const [inquiries, users, assignments, contacts] = await Promise.all([
      listTableRows<Record<string, any>>("sales", "inquiry"),
      listTableRows<Record<string, any>>("identity", "user"),
      listTableRows<Record<string, any>>("system", "request_assignment"),
      listTableRows<Record<string, any>>("sales", "crm_contact"),
    ]);
    const request = inquiries.find((i) => i.id === id);
    if (!request) throw new Error(serverMessages.requestNotFound);

    const periodStart = new Date();
    const periodEnd = request.slaDueDate
      ? new Date(request.slaDueDate)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await assertAssigneeAvailable(newAssigneeId, periodStart, periodEnd);

    const actor = users.find((u) => u.id === actorId);
    const isFirstAssignment =
      canTransitionRequest(String(request.workflowStatus ?? ""), "assign") &&
      (!request.assignedToId ||
        !canTransitionRequest(String(request.workflowStatus ?? ""), "reassign"));
    if (isFirstAssignment) {
      await assignRequest(id, {
        assignedToId: newAssigneeId,
        team: team || undefined,
        assignedById: actorId,
        assignedByName: actor?.fullName,
        notes: reason || undefined,
      });
    } else {
      if (request.workflowStatus === "pending_approval")
        await cancelPendingApprovals("service_request", id);
      await reassignRequest(id, {
        newAssignedToId: newAssigneeId,
        newTeam: team || undefined,
        reassignedById: actorId,
        reassignedByName: actor?.fullName,
        notes: reason?.trim() || "Reassigned",
      });
    }

    for (const a of assignments) {
      if (a.inquiryId === id && a.active) {
        await upsertTableRow("system", "request_assignment", {
          id: a.id,
          active: false,
        });
      }
    }
    await upsertTableRow("system", "request_assignment", {
      id: crypto.randomUUID(),
      inquiryId: id,
      assignedToId: newAssigneeId,
      assignedById: actorId,
      team: team || null,
      reason: reason || (isFirstAssignment ? "Assigned" : "Reassigned"),
      active: true,
    });
    await upsertTableRow("system", "request_event", {
      id: crypto.randomUUID(),
      inquiryId: id,
      actorId,
      eventType: "assignment",
      details: {
        previousAssigneeId: request.assignedToId,
        newAssigneeId,
        team,
        reason,
      },
    });

    const refreshed = (await listTableRows<Record<string, any>>("sales", "inquiry")).find(
      (i) => i.id === id,
    );
    if (!refreshed) return null;
    const assignedTo = refreshed.assignedToId
      ? users.find((u) => u.id === refreshed.assignedToId) ?? null
      : null;
    const customer = refreshed.customerId
      ? contacts.find((c) => c.id === refreshed.customerId) ?? null
      : null;
    return {
      ...refreshed,
      assignedTo: assignedTo
        ? { id: assignedTo.id, fullName: assignedTo.fullName, email: assignedTo.email }
        : null,
      customer,
    };
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

  return runAtomicMutation(async () => {
    const commentId = crypto.randomUUID();
    const c = await upsertTableRow<Record<string, any>>("system", "request_comment", {
      id: commentId,
      inquiryId: id,
      authorId,
      body,
      isClientVisible,
      attachments: attachments || null,
    });

    await upsertTableRow("system", "request_event", {
      id: crypto.randomUUID(),
      inquiryId: id,
      actorId: authorId,
      eventType: "comment",
      details: {
        commentId,
        isClientVisible,
      },
    });

    const users = await listTableRows<Record<string, any>>("identity", "user");
    const author = users.find((u) => u.id === authorId) ?? null;

    return {
      ...c,
      author: author
        ? { id: author.id, fullName: author.fullName, email: author.email }
        : null,
    };
  });
}

export async function addRequestEvent(
  inquiryId: string,
  eventType: string,
  details: any,
  actorId?: string,
): Promise<any> {
  const evt = await upsertTableRow<Record<string, any>>("system", "request_event", {
    id: crypto.randomUUID(),
    inquiryId,
    actorId: actorId || null,
    eventType,
    details: details || {},
  });
  let actor: any = null;
  if (actorId) {
    const users = await listTableRows<Record<string, any>>("identity", "user");
    const u = users.find((x) => x.id === actorId);
    if (u) actor = { id: u.id, fullName: u.fullName, email: u.email };
  }
  return { ...evt, actor };
}

export type ConsolidatedRequest = Record<string, any> & {
  convertedDeal: {
    id: string;
    title: string;
    dealStage: string;
    dealValue: number;
  } | null;
  quotations: {
    id: string;
    quotationNumber: string;
    totalAmount: number;
    currency: string;
    status: string;
  }[];
};

export async function getConsolidatedRequestById(
  id: string,
): Promise<ConsolidatedRequest | null> {
  const [inquiries, contacts, users, deals, quotations, events, assignments, comments] =
    await Promise.all([
      listTableRows<Record<string, any>>("sales", "inquiry"),
      listTableRows<Record<string, any>>("sales", "crm_contact"),
      listTableRows<Record<string, any>>("identity", "user"),
      listTableRows<Record<string, any>>("sales", "crm_deal"),
      listTableRows<Record<string, any>>("sales", "quotation", "created_at DESC"),
      listTableRows<Record<string, any>>("system", "request_event", "created_at DESC"),
      listTableRows<Record<string, any>>("system", "request_assignment", "created_at DESC"),
      listTableRows<Record<string, any>>("system", "request_comment", "created_at ASC"),
    ]);

  const request = inquiries.find((i) => i.id === id);
  if (!request) return null;

  const userSummary = (uid: string | null | undefined) => {
    if (!uid) return null;
    const u = users.find((x) => x.id === uid);
    return u ? { id: String(u.id), fullName: String(u.fullName ?? ""), email: String(u.email ?? "") } : null;
  };

  const deal = request.convertedDealId
    ? deals.find((d) => d.id === request.convertedDealId)
    : deals.find((d) => d.inquiryId === id);

  const reqQuotations = quotations
    .filter((q) => q.inquiryId === id)
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .map((q) => ({
      id: String(q.id),
      quotationNumber: String(q.quotationNumber ?? ""),
      totalAmount: Number(q.totalAmount ?? 0),
      currency: String(q.currency ?? "BHD"),
      status: String(q.status ?? "draft"),
    }));

  const requestEvents = events
    .filter((e) => e.inquiryId === id)
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .map((e) => ({ ...e, actor: userSummary(e.actorId) }));

  const reqAssignments = assignments
    .filter((a) => a.inquiryId === id)
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .map((a) => ({
      ...a,
      assignedTo: userSummary(a.assignedToId),
      assignedBy: userSummary(a.assignedById),
    }));

  const reqComments = comments
    .filter((c) => c.inquiryId === id)
    .sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime())
    .map((c) => ({ ...c, author: userSummary(c.authorId) }));

  return {
    ...request,
    customer: request.customerId ? (contacts.find((c) => c.id === request.customerId) ?? null) : null,
    assignedTo: userSummary(request.assignedToId),
    convertedDeal: deal
      ? {
          id: String(deal.id),
          title: String(deal.title ?? ""),
          dealStage: String(deal.dealStage ?? ""),
          dealValue: Number(deal.dealValue ?? 0),
        }
      : null,
    quotations: reqQuotations,
    requestEvents,
    assignments: reqAssignments,
    comments: reqComments,
  };
}

export interface RequestListFilters {
  kind?: RequestKind | "all";
  status?: string;
  scope?: "all" | "mine" | "unassigned";
  team?: string;
  priority?: string;
  overdue?: boolean;
  due?: string;
  assignee?: string;
  source?: string;
  customerId?: string;
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

function matchesKind(r: Record<string, any>, kind: RequestKind): boolean {
  const rt = String(r.requestType ?? "");
  const intent = String(r.intent ?? "");
  if (kind === "service") return rt === "SR";
  if (kind === "feedback")
    return rt === "CR" || intent === "complaint" || intent === "suggestion";
  if (kind === "quote")
    return rt !== "SR" && rt !== "CR" && (rt === "quote_request" || intent === "quote_request");
  return rt !== "SR" && rt !== "CR" && rt !== "quote_request" && intent === "inquiry";
}

function filterInquiries(
  rows: Record<string, any>[],
  filters: RequestListFilters,
  viewerId: string,
  visible?: string[] | null,
  now = new Date(),
) {
  const closed = new Set<string>(REQUEST_CLOSED_STATUSES);
  const visibleSet = visible ? new Set(visible) : null;
  const due = filters.overdue ? "overdue" : filters.due;
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const weekEnd = new Date(now.getTime() + 7 * 86400000);

  const day = (value: string | undefined, end = false) =>
    value &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value))
      ? new Date(`${value}T${end ? "23:59:59.999" : "00:00:00"}+03:00`)
      : null;
  const from = day(filters.from);
  const to = day(filters.to, true);
  const term = filters.search?.trim().slice(0, 200).toLowerCase() ?? "";

  return rows.filter((r) => {
    if (visibleSet && (!r.assignedToId || !visibleSet.has(String(r.assignedToId)))) return false;
    if (filters.kind && filters.kind !== "all" && !matchesKind(r, filters.kind)) return false;
    const status = filters.status || "open";
    const isOpen = !closed.has(String(r.workflowStatus ?? ""));
    if (status === "open" && !isOpen) return false;
    if (status !== "open" && status !== "all" && r.workflowStatus !== status) return false;
    if (filters.scope === "mine" && r.assignedToId !== viewerId) return false;
    if (filters.scope === "unassigned" && r.assignedToId != null) return false;
    if (filters.team && filters.team !== "all" && r.team !== filters.team) return false;
    if (filters.priority && filters.priority !== "all" && r.priority !== filters.priority) return false;

    const slaDate = r.slaDueDate ? new Date(r.slaDueDate) : null;
    if (due === "overdue" && !(isOpen && slaDate && slaDate < now)) return false;
    if (due === "today" && !(isOpen && slaDate && slaDate >= now && slaDate <= endOfToday)) return false;
    if (due === "week" && !(isOpen && slaDate && slaDate >= now && slaDate <= weekEnd)) return false;
    if (due === "none" && r.slaDueDate != null) return false;

    if (filters.assignee && filters.assignee !== "all" && filters.assignee.length <= 150) {
      if (r.assignedToId !== filters.assignee) return false;
    }
    if (filters.source && (REQUEST_SOURCES as readonly string[]).includes(filters.source)) {
      if (r.source !== filters.source) return false;
    }
    if (filters.customerId && filters.customerId.length <= 150) {
      if (r.customerId !== filters.customerId) return false;
    }
    if (from || to) {
      const cr = r.createdAt ? new Date(r.createdAt) : null;
      if (!cr) return false;
      if (from && cr < from) return false;
      if (to && cr > to) return false;
    }
    if (term) {
      const fields = [r.name, r.email, r.companyName, r.message, r.reference, r.serviceType];
      if (!fields.some((f) => f && String(f).toLowerCase().includes(term))) return false;
    }
    return true;
  });
}

function sortInquiries(rows: Record<string, any>[], sort: RequestSort) {
  const priorityRank = (p: string) =>
    p === "urgent" ? 0 : p === "high" ? 1 : p === "normal" ? 2 : 3;
  const slaMs = (r: Record<string, any>, fallback: number) =>
    r.slaDueDate ? new Date(r.slaDueDate).getTime() : fallback;
  const crMs = (r: Record<string, any>) =>
    r.createdAt ? new Date(r.createdAt).getTime() : 0;

  const copy = [...rows];
  copy.sort((a, b) => {
    if (sort === "priority") {
      const pr = priorityRank(String(a.priority ?? "")) - priorityRank(String(b.priority ?? ""));
      if (pr !== 0) return pr;
    }
    if (sort === "priority" || sort === "urgency") {
      const sDiff = slaMs(a, Infinity) - slaMs(b, Infinity);
      if (sDiff !== 0) return sDiff;
      const cDiff = crMs(b) - crMs(a);
      if (cDiff !== 0) return cDiff;
      return String(b.id).localeCompare(String(a.id));
    }
    if (sort === "newest") return crMs(b) - crMs(a) || String(b.id).localeCompare(String(a.id));
    if (sort === "oldest") return crMs(a) - crMs(b) || String(a.id).localeCompare(String(b.id));
    if (sort === "sla_asc") return slaMs(a, Infinity) - slaMs(b, Infinity) || String(a.id).localeCompare(String(b.id));
    if (sort === "sla_desc") return slaMs(b, -Infinity) - slaMs(a, -Infinity) || String(a.id).localeCompare(String(b.id));
    if (sort === "customer_asc") {
      const ac = String(a.companyName ?? "\uffff").localeCompare(String(b.companyName ?? "\uffff"));
      if (ac !== 0) return ac;
      const an = String(a.name ?? "").localeCompare(String(b.name ?? ""));
      if (an !== 0) return an;
      return String(a.id).localeCompare(String(b.id));
    }
    return 0;
  });
  return copy;
}

function toRow(
  r: Record<string, any>,
  userById: Map<string, string>,
  now: Date,
): RequestListRow {
  const closed = new Set<string>(REQUEST_CLOSED_STATUSES);
  const msg = String(r.message ?? "");
  const slaDate = r.slaDueDate ? new Date(r.slaDueDate) : null;
  const createdDate = r.createdAt ? new Date(r.createdAt) : now;
  return {
    id: String(r.id),
    reference: String(r.reference ?? ""),
    kind: requestKindOf(r as any),
    title: r.serviceType || (msg.length > 80 ? msg.slice(0, 80) + "…" : msg),
    customer: String(r.companyName || r.name || ""),
    priority: String(r.priority ?? "normal"),
    workflowStatus: String(r.workflowStatus ?? "received"),
    team: r.team ?? null,
    source: String(r.source ?? ""),
    assignee: r.assignedToId ? (userById.get(String(r.assignedToId)) ?? null) : null,
    slaDueDate: slaDate ? slaDate.toISOString() : null,
    overdue: !!slaDate && slaDate < now && !closed.has(String(r.workflowStatus ?? "")),
    createdAt: createdDate.toISOString(),
  };
}

export async function getRequestExportBatch(
  filters: RequestListFilters,
  viewerId: string,
  batch: { after?: string; batchSize: number },
  visible?: string[] | null,
) {
  const [inquiries, users] = await Promise.all([
    listTableRows<Record<string, any>>("sales", "inquiry"),
    listTableRows<Record<string, any>>("identity", "user"),
  ]);
  const now = new Date();
  const userById = new Map(users.map((u) => [String(u.id), String(u.fullName ?? "")]));
  const rows = filterInquiries(inquiries, filters, viewerId, visible, now)
    .filter((r) => !batch.after || String(r.id) > batch.after)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    .slice(0, Math.min(500, batch.batchSize));
  return rows.map((r) => toRow(r, userById, now));
}

export async function getRequestList(
  filters: RequestListFilters,
  viewerId: string,
  page = 1,
  visible?: string[] | null,
) {
  const now = new Date();
  const sort: RequestSort = (REQUEST_SORTS as readonly string[]).includes(
    filters.sort ?? "",
  )
    ? (filters.sort as RequestSort)
    : "urgency";
  const safePage =
    Number.isInteger(page) && page >= 1 ? Math.min(page, 10000) : 1;
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );

  const [inquiries, users] = await Promise.all([
    listTableRows<Record<string, any>>("sales", "inquiry"),
    listTableRows<Record<string, any>>("identity", "user"),
  ]);
  const userById = new Map(users.map((u) => [String(u.id), String(u.fullName ?? "")]));

  const closed = new Set<string>(REQUEST_CLOSED_STATUSES);
  const visibleSet = visible ? new Set(visible) : null;
  const scoped = visibleSet
    ? inquiries.filter((r) => r.assignedToId && visibleSet.has(String(r.assignedToId)))
    : inquiries;
  const openRows = scoped.filter((r) => !closed.has(String(r.workflowStatus ?? "")));

  const filtered = filterInquiries(inquiries, filters, viewerId, visible, now);
  const sorted = sortInquiries(filtered, sort);
  const pageRows = sorted.slice((safePage - 1) * 50, safePage * 50);

  return {
    page: safePage,
    pageSize: 50,
    total: filtered.length,
    sort,
    stats: {
      open: openRows.length,
      overdue: openRows.filter((r) => r.slaDueDate && new Date(r.slaDueDate) < now).length,
      unassigned: openRows.filter((r) => r.assignedToId == null).length,
      awaitingApproval: scoped.filter((r) => r.workflowStatus === "pending_approval").length,
      mine: openRows.filter((r) => r.assignedToId === viewerId).length,
      resolvedThisMonth: scoped.filter(
        (r) =>
          r.workflowStatus === "resolved" &&
          r.resolvedAt &&
          new Date(r.resolvedAt) >= monthStart,
      ).length,
    },
    items: pageRows.map((r) => toRow(r, userById, now)),
  };
}
