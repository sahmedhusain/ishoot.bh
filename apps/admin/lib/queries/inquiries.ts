import { serverMessages } from "@platform/locales";
import {
  listInquiries,
  getInquiry,
  createInquiry as createSalesInquiry,
  updateInquiryStatus as updateSalesInquiryStatus,
  deleteInquiry as deleteSalesInquiry,
  type Inquiry as SalesInquiry,
} from "@platform/api-client";
import {
  REQUEST_CLOSED_STATUSES,
  REQUEST_TEAMS,
  REQUEST_TRANSITION_TARGET,
  canTransitionRequest,
  type RequestTransition,
} from "../constants/requests";
import { Inquiry } from "../types";

function mapInquiry(inq: any): Inquiry {
  return {
    id: inq.id,
    type: inq.inquiryType || inq.intent || "inquiry",
    subject:
      inq.subject ||
      inq.reference ||
      (inq.serviceType
        ? inq.serviceType
        : inq.message
          ? inq.message.slice(0, 45) + "..."
          : undefined),
    full_name: inq.requesterName || inq.name || "Customer",
    email: inq.requesterEmail || inq.email || "",
    phone: inq.requesterPhone || inq.phone || undefined,
    company: inq.companyName || inq.company || undefined,
    services_requested: inq.serviceType ? inq.serviceType.split(", ") : [],
    budget_range: inq.budgetRange || undefined,
    target_timeline: inq.timeline || undefined,
    message: inq.message || "",
    status: (inq.status as any) || "new",
    team: inq.team || undefined,
    workflow_status: (inq.workflowStatus as any) || "received",
    custom_assignments: (inq.customAssignments as any) || [],
    approval_notes: inq.approvalNotes || undefined,
    approved_by_id: inq.approvedById || undefined,
    approved_at: inq.approvedAt ? new Date(inq.approvedAt).toISOString() : undefined,
    return_reason: inq.returnReason || undefined,
    resolution_notes: inq.resolutionNotes || undefined,
    confirmed_at: inq.confirmedAt ? new Date(inq.confirmedAt).toISOString() : undefined,
    confirmed_by_id: inq.confirmedById || undefined,
    confirmation_sent: inq.confirmationStatus === "sent",
    notification_sent: inq.notificationStatus === "sent",
    confirmation_status: inq.confirmationStatus,
    notification_status: inq.notificationStatus,
    intent: inq.inquiryType || inq.intent || "inquiry",
    reference: inq.reference || inq.id,
    assigned_to_id: inq.assigneeId || inq.assignedToId || undefined,
    assigned_to_name: inq.assignedTo?.fullName,
    priority: inq.priority || "normal",
    location: inq.location || undefined,
    project_reference: inq.projectReference || undefined,
    customer_id: inq.customerId || undefined,
    merge_flag: inq.mergeFlag,
    source: inq.source,
    notes: inq.notes || [],
    locale: inq.locale || "ar",
    created_at: inq.createdAt ? new Date(inq.createdAt).toISOString() : new Date().toISOString(),
  };
}

export async function createInquiry(
  inquiry: Omit<
    Inquiry,
    "id" | "created_at" | "status" | "confirmation_sent" | "notification_sent"
  >,
): Promise<Inquiry> {
  const created = await createSalesInquiry({
    inquiryType: inquiry.intent || inquiry.type || "general",
    subject: inquiry.subject || inquiry.services_requested?.join(", ") || "General Inquiry",
    message: inquiry.message || "",
    status: "new",
    priority: inquiry.priority || "normal",
    requesterName: inquiry.full_name,
    requesterEmail: inquiry.email,
    requesterPhone: inquiry.phone || null,
  });
  return mapInquiry(created);
}

export async function getAllInquiries(
  includeComplaints = false,
  page = 1,
): Promise<Inquiry[]> {
  try {
    const list = await listInquiries();
    let filtered = list || [];
    if (!includeComplaints) {
      filtered = filtered.filter((i) => i.inquiryType !== "complaint");
    }
    const start = (Math.max(1, page) - 1) * 50;
    return filtered.slice(start, start + 50).map(mapInquiry);
  } catch (e) {
    console.error("Error fetching inquiries:", e);
    return [];
  }
}

export interface RequestFilters {
  intent?: string;
  team?: string;
  workflowStatus?: string;
  search?: string;
}

export async function getRequestsPage(filters: RequestFilters = {}, page = 1) {
  let list: SalesInquiry[] = [];
  try {
    list = await listInquiries();
  } catch (e) {
    console.error("Error fetching inquiries for requests page:", e);
  }

  let filtered = list;
  if (filters.intent && filters.intent !== "all") {
    filtered = filtered.filter((i) => (i.inquiryType || "inquiry") === filters.intent);
  }
  if (filters.search) {
    const term = filters.search.trim().toLowerCase();
    filtered = filtered.filter(
      (i) =>
        i.requesterName?.toLowerCase().includes(term) ||
        i.requesterEmail?.toLowerCase().includes(term) ||
        i.requesterPhone?.toLowerCase().includes(term) ||
        i.subject?.toLowerCase().includes(term) ||
        i.message?.toLowerCase().includes(term),
    );
  }

  const safePage =
    Number.isInteger(page) && page >= 1 ? Math.min(page, 10000) : 1;
  const total = filtered.length;
  const start = (safePage - 1) * 50;
  const items = filtered.slice(start, start + 50);

  const stats = { total: 0, complaints: 0, services: 0, approvals: 0 };
  for (const item of list) {
    stats.total++;
    if (item.inquiryType === "complaint") stats.complaints++;
    if (["service_request", "quote_request"].includes(item.inquiryType))
      stats.services++;
    if (["assigned", "pending_approval"].includes(item.status))
      stats.approvals++;
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
    await updateSalesInquiryStatus(id, status);
    return true;
  } catch (e) {
    console.error(`Error updating inquiry ${id}:`, e);
    return false;
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

  const targetStatus = REQUEST_TRANSITION_TARGET[action] || "in_progress";
  await updateSalesInquiryStatus(id, targetStatus);
  const inq = await getInquiry(id);
  return mapInquiry(inq);
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
    await deleteSalesInquiry(id);
    return true;
  } catch (e) {
    console.error(`Error deleting inquiry ${id}:`, e);
    return false;
  }
}
