import { serverMessages } from "@platform/locales";
import { db } from "../db";
import { referencePrefixFor } from "../constants/requests";
import { getNextSequenceNumber } from "./sequence";
import {
  REQUEST_CLOSED_STATUSES,
  REQUEST_TEAMS,
  REQUEST_TRANSITION_TARGET,
  canTransitionRequest,
  type RequestTransition,
} from "../constants/requests";
import type { Prisma } from "@prisma/client";
import { Inquiry } from "../types";

function mapInquiry(inq: any): Inquiry {
  return {
    id: inq.id,
    type: inq.intent || "inquiry",
    subject:
      inq.reference ||
      (inq.serviceType
        ? inq.serviceType
        : inq.message
          ? inq.message.slice(0, 45) + "..."
          : undefined),
    full_name: inq.name,
    email: inq.email,
    phone: inq.phone || undefined,
    company: inq.companyName || undefined,
    services_requested: inq.serviceType ? inq.serviceType.split(", ") : [],
    budget_range: inq.budgetRange || undefined,
    target_timeline: inq.timeline || undefined,
    message: inq.message,
    status: (inq.status as any) || "new",
    team: inq.team || undefined,
    workflow_status: (inq.workflowStatus as any) || "received",
    custom_assignments: (inq.customAssignments as any) || [],
    approval_notes: inq.approvalNotes || undefined,
    approved_by_id: inq.approvedById || undefined,
    approved_at: inq.approvedAt?.toISOString(),
    return_reason: inq.returnReason || undefined,
    resolution_notes: inq.resolutionNotes || undefined,
    confirmed_at: inq.confirmedAt ? inq.confirmedAt.toISOString() : undefined,
    confirmed_by_id: inq.confirmedById || undefined,
    confirmation_sent: inq.confirmationStatus === "sent",
    notification_sent: inq.notificationStatus === "sent",
    confirmation_status: inq.confirmationStatus,
    notification_status: inq.notificationStatus,
    intent: inq.intent,
    reference: inq.reference,
    assigned_to_id: inq.assignedToId || undefined,
    assigned_to_name: inq.assignedTo?.fullName,
    priority: inq.priority,
    location: inq.location || undefined,
    project_reference: inq.projectReference || undefined,
    customer_id: inq.customerId || undefined,
    merge_flag: inq.mergeFlag,
    source: inq.source,
    notes: inq.notes?.map((note: any) => ({
      id: note.id,
      body: note.body,
      author: note.author.fullName,
      created_at: note.createdAt.toISOString(),
    })),
    locale: inq.locale || "ar",
    created_at: inq.createdAt.toISOString(),
  };
}

export async function createInquiry(
  inquiry: Omit<
    Inquiry,
    "id" | "created_at" | "status" | "confirmation_sent" | "notification_sent"
  >,
): Promise<Inquiry> {
  const created = await db.inquiry.create({
    data: {
      reference: await getNextSequenceNumber(
        referencePrefixFor({ intent: inquiry.intent }),
      ),
      name: inquiry.full_name,
      email: inquiry.email,
      phone: inquiry.phone || null,
      companyName: inquiry.company || null,
      serviceType: inquiry.services_requested
        ? inquiry.services_requested.join(", ")
        : null,
      budgetRange: inquiry.budget_range || null,
      timeline: inquiry.target_timeline || null,
      message: inquiry.message || "",
      status: "new",
      workflowStatus: "received",
      intent: inquiry.intent || "inquiry",
      team: inquiry.team || null,
      locale: inquiry.locale || "ar",
    },
  });
  return mapInquiry(created);
}

export async function getAllInquiries(
  includeComplaints = false,
  page = 1,
): Promise<Inquiry[]> {
  try {
    const inquiries = await db.inquiry.findMany({
      where: includeComplaints ? undefined : { intent: { not: "complaint" } },
      include: {
        assignedTo: { select: { fullName: true } },
        notes: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { author: { select: { fullName: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      skip: (Math.max(1, page) - 1) * 50,
    });
    return inquiries.map(mapInquiry);
  } catch (e) {
    console.error("Error fetching inquiries from DB:", e);
    throw e;
  }
}

export interface RequestFilters {
  intent?: string;
  team?: string;
  workflowStatus?: string;
  search?: string;
}
export async function getRequestsPage(filters: RequestFilters = {}, page = 1) {
  const where: Prisma.InquiryWhereInput = {};
  if (filters.intent && filters.intent !== "all") where.intent = filters.intent;
  if (filters.team && filters.team !== "all") where.team = filters.team;
  if (filters.workflowStatus && filters.workflowStatus !== "all")
    where.workflowStatus = filters.workflowStatus;
  if (filters.search) {
    const term = filters.search.trim().slice(0, 200);
    where.OR = ["name", "email", "phone", "companyName", "message", "reference"].map(
      (field) => ({ [field]: { contains: term, mode: "insensitive" } }),
    );
  }
  const safePage =
    Number.isInteger(page) && page >= 1 ? Math.min(page, 10000) : 1;
  const groupsQuery = db.inquiry.groupBy({
    by: ["intent", "workflowStatus"],
    orderBy: { intent: "asc" },
    _count: { _all: true },
  });
  const [items, total, groups] = await db.$transaction([
    db.inquiry.findMany({
      where,
      include: {
        assignedTo: { select: { fullName: true } },
        notes: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { author: { select: { fullName: true } } },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 50,
      skip: (safePage - 1) * 50,
    }),
    db.inquiry.count({ where }),
    groupsQuery,
  ]);
  const stats = { total: 0, complaints: 0, services: 0, approvals: 0 };
  for (const group of groups) {
    stats.total += group._count._all;
    if (group.intent === "complaint") stats.complaints += group._count._all;
    if (["service_request", "quote_request"].includes(group.intent))
      stats.services += group._count._all;
    if (["assigned", "pending_approval"].includes(group.workflowStatus))
      stats.approvals += group._count._all;
  }
  return {
    items: items.map(mapInquiry),
    total,
    page: safePage,
    pageSize: 50,
    stats,
  };
}

export async function updateInquiryStatus(
  id: string,
  status: Inquiry["status"],
): Promise<boolean> {
  try {
    await db.inquiry.update({
      where: { id },
      data: { status, resolvedAt: status === "resolved" ? new Date() : null },
    });
    return true;
  } catch (e) {
    console.error(`Error updating inquiry ${id}:`, e);
    throw e;
  }
}

async function transitionRequest(
  id: string,
  action: RequestTransition,
  input: {
    actorId: string;
    actorName?: string;
    assigneeId?: string;
    team?: string;
    notes?: string;
  },
): Promise<Inquiry> {
  if (
    typeof id !== "string" ||
    !id ||
    id.length > 100 ||
    typeof input.actorId !== "string" ||
    !input.actorId
  )
    throw new Error(serverMessages.invalidRequestIdentity);
  if (
    input.notes !== undefined &&
    (typeof input.notes !== "string" || input.notes.length > 10000)
  )
    throw new Error(serverMessages.invalidNotes);
  if (
    ["return", "resolve", "reassign"].includes(action) &&
    !input.notes?.trim()
  )
    throw new Error(serverMessages.notesAreRequired);
  if (
    input.team !== undefined &&
    !(REQUEST_TEAMS as readonly string[]).includes(input.team)
  )
    throw new Error(serverMessages.invalidTeam);
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Inquiry" WHERE "id" = ${id} FOR UPDATE`;
    const existing = await tx.inquiry.findUnique({ where: { id } });
    if (!existing) throw new Error(serverMessages.requestNotFound);
    if (
      !canTransitionRequest(existing.workflowStatus, action) ||
      (REQUEST_CLOSED_STATUSES as readonly string[]).includes(existing.status)
    )
      throw new Error(
        "Request state changed or transition is unavailable. Refresh the request.",
      );
    if (action === "assign" || action === "reassign") {
      if (
        typeof input.assigneeId !== "string" ||
        !input.assigneeId ||
        !(await tx.user.findFirst({
          where: { id: input.assigneeId, isActive: true },
          select: { id: true },
        }))
      )
        throw new Error(serverMessages.invalidActiveAssignee);
    }
    const history = Array.isArray(existing.customAssignments)
      ? [...existing.customAssignments]
      : [];
    const timestamp = new Date();
    history.push({
      actorId: input.actorId,
      assignedByName: input.actorName || "",
      assignedToId: input.assigneeId || null,
      timestamp: timestamp.toISOString(),
      notes: input.notes || "",
      action,
    });
    const data = {
      workflowStatus: REQUEST_TRANSITION_TARGET[action],
      customAssignments: history,
      ...(action === "assign" || action === "reassign"
        ? {
            assignedToId: input.assigneeId,
            team: input.team || existing.team,
            status: existing.status === "new" ? "in_progress" : existing.status,
          }
        : {}),
      ...(["assign", "reassign", "return"].includes(action)
        ? {
            approvedById: null,
            approvedAt: null,
            confirmedById: null,
            confirmedAt: null,
          }
        : {}),
      ...(action === "return" ? { returnReason: input.notes } : {}),
      ...(action === "approve"
        ? {
            approvalNotes: input.notes || null,
            approvedById: input.actorId,
            approvedAt: timestamp,
          }
        : {}),
      ...(action === "confirm"
        ? { confirmedById: input.actorId, confirmedAt: timestamp }
        : {}),
      ...(action === "resolve"
        ? {
            status: "resolved",
            resolvedAt: timestamp,
            resolutionNotes: input.notes,
          }
        : {}),
    };
    const updated = await tx.inquiry.update({
      where: { id },
      data,
      include: { assignedTo: { select: { fullName: true } } },
    });
    await tx.activityLog.create({
      data: {
        userId: input.actorId,
        action: action === "approve" ? "approve" : "update",
        entityType: "inquiry",
        entityId: id,
        details: {
          action,
          from: existing.workflowStatus,
          to: updated.workflowStatus,
        },
      },
    });
    return mapInquiry(updated);
  });
}
export async function assignRequest(
  id: string,
  input: {
    assignedToId: string;
    team?: string;
    assignedById: string;
    assignedByName?: string;
    notes?: string;
  },
) {
  return transitionRequest(id, "assign", {
    actorId: input.assignedById,
    actorName: input.assignedByName,
    assigneeId: input.assignedToId,
    team: input.team,
    notes: input.notes,
  });
}
export async function reassignRequest(
  id: string,
  input: {
    newAssignedToId: string;
    newTeam?: string;
    reassignedById: string;
    reassignedByName?: string;
    notes: string;
  },
) {
  return transitionRequest(id, "reassign", {
    actorId: input.reassignedById,
    actorName: input.reassignedByName,
    assigneeId: input.newAssignedToId,
    team: input.newTeam,
    notes: input.notes,
  });
}
export async function returnRequest(
  id: string,
  input: { returnedById: string; returnedByName?: string; reason: string },
) {
  return transitionRequest(id, "return", {
    actorId: input.returnedById,
    actorName: input.returnedByName,
    notes: input.reason,
  });
}
/** Moves finished work to pending_approval; the caller then submits it to the approval engine. */
export async function submitRequestForApproval(
  id: string,
  input: { submittedById: string; submittedByName?: string; notes?: string },
) {
  return transitionRequest(id, "submit", {
    actorId: input.submittedById,
    actorName: input.submittedByName,
    notes: input.notes,
  });
}
/** Applied by the approval engine when the service request policy's approvers sign off. */
export async function approveRequest(
  id: string,
  input: { approvedById: string; approvedByName?: string; notes?: string },
) {
  return transitionRequest(id, "approve", {
    actorId: input.approvedById,
    actorName: input.approvedByName,
    notes: input.notes,
  });
}
export async function confirmRequest(
  id: string,
  input: { confirmedById: string; confirmedByName?: string; notes?: string },
) {
  return transitionRequest(id, "confirm", {
    actorId: input.confirmedById,
    actorName: input.confirmedByName,
    notes: input.notes,
  });
}
export async function resolveRequest(
  id: string,
  input: {
    resolvedById: string;
    resolvedByName?: string;
    resolutionNotes: string;
  },
) {
  return transitionRequest(id, "resolve", {
    actorId: input.resolvedById,
    actorName: input.resolvedByName,
    notes: input.resolutionNotes,
  });
}

export async function deleteInquiry(id: string): Promise<boolean> {
  try {
    await db.inquiry.delete({ where: { id } });
    return true;
  } catch (e) {
    console.error(`Error deleting inquiry ${id}:`, e);
    throw e;
  }
}
