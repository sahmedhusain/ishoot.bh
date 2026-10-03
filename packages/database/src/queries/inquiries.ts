import { db } from "../db";
import { Inquiry } from "../types";

function mapInquiry(inq: any): Inquiry {
  return {
    id: inq.id,
    type: inq.intent || "inquiry",
    subject: inq.reference || (inq.serviceType ? inq.serviceType : inq.message ? inq.message.slice(0, 45) + "..." : undefined),
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
    return [];
  }
}

export async function getRequestsAndComplaints(filters?: {
  intent?: string; // "service_request" | "complaint" | "quote_request" | "inquiry"
  team?: string;
  workflowStatus?: string;
  search?: string;
}): Promise<Inquiry[]> {
  try {
    const where: any = {};
    if (filters?.intent && filters.intent !== "all") where.intent = filters.intent;
    if (filters?.team && filters.team !== "all") where.team = filters.team;
    if (filters?.workflowStatus && filters.workflowStatus !== "all")
      where.workflowStatus = filters.workflowStatus;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
        { companyName: { contains: filters.search, mode: "insensitive" } },
        { message: { contains: filters.search, mode: "insensitive" } },
        { reference: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const items = await db.inquiry.findMany({
      where,
      include: {
        assignedTo: { select: { fullName: true } },
        notes: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { author: { select: { fullName: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return items.map(mapInquiry);
  } catch (error) {
    console.error("Error fetching requests and complaints:", error);
    return [];
  }
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
    return false;
  }
}

export async function assignRequest(
  id: string,
  assignment: {
    assignedToId: string;
    team?: string;
    assignedByName?: string;
    notes?: string;
  }
): Promise<Inquiry | null> {
  try {
    const existing = await db.inquiry.findUnique({ where: { id } });
    if (!existing) return null;

    const history = (existing.customAssignments as any[]) || [];
    history.push({
      assignedToId: assignment.assignedToId,
      assignedByName: assignment.assignedByName || "Admin",
      timestamp: new Date().toISOString(),
      notes: assignment.notes || "Assigned",
      action: "assign",
    });

    const updated = await db.inquiry.update({
      where: { id },
      data: {
        assignedToId: assignment.assignedToId,
        team: assignment.team || existing.team,
        workflowStatus: "assigned",
        status: existing.status === "new" ? "in_progress" : existing.status,
        customAssignments: history,
      },
      include: {
        assignedTo: { select: { fullName: true } },
      },
    });

    return mapInquiry(updated);
  } catch (error) {
    console.error(`Error assigning request ${id}:`, error);
    return null;
  }
}

export async function reassignRequest(
  id: string,
  assignment: {
    newAssignedToId: string;
    newTeam?: string;
    reassignedByName?: string;
    notes: string;
  }
): Promise<Inquiry | null> {
  try {
    const existing = await db.inquiry.findUnique({ where: { id } });
    if (!existing) return null;

    const history = (existing.customAssignments as any[]) || [];
    history.push({
      assignedToId: assignment.newAssignedToId,
      assignedByName: assignment.reassignedByName || "Admin",
      timestamp: new Date().toISOString(),
      notes: assignment.notes,
      action: "reassign",
    });

    const updated = await db.inquiry.update({
      where: { id },
      data: {
        assignedToId: assignment.newAssignedToId,
        team: assignment.newTeam || existing.team,
        workflowStatus: "assigned",
        customAssignments: history,
      },
      include: {
        assignedTo: { select: { fullName: true } },
      },
    });

    return mapInquiry(updated);
  } catch (error) {
    console.error(`Error reassigning request ${id}:`, error);
    return null;
  }
}

export async function returnRequest(
  id: string,
  details: {
    returnedByName?: string;
    reason: string;
  }
): Promise<Inquiry | null> {
  try {
    const existing = await db.inquiry.findUnique({ where: { id } });
    if (!existing) return null;

    const history = (existing.customAssignments as any[]) || [];
    history.push({
      assignedByName: details.returnedByName || "Admin",
      timestamp: new Date().toISOString(),
      notes: details.reason,
      action: "return",
    });

    const updated = await db.inquiry.update({
      where: { id },
      data: {
        workflowStatus: "returned",
        returnReason: details.reason,
        customAssignments: history,
      },
      include: {
        assignedTo: { select: { fullName: true } },
      },
    });

    return mapInquiry(updated);
  } catch (error) {
    console.error(`Error returning request ${id}:`, error);
    return null;
  }
}

export async function approveRequest(
  id: string,
  details: {
    approvedById: string;
    approvedByName?: string;
    notes?: string;
  }
): Promise<Inquiry | null> {
  try {
    const existing = await db.inquiry.findUnique({ where: { id } });
    if (!existing) return null;

    const history = (existing.customAssignments as any[]) || [];
    history.push({
      assignedByName: details.approvedByName || "Executive",
      timestamp: new Date().toISOString(),
      notes: details.notes || "Approved",
      action: "approve",
    });

    const updated = await db.inquiry.update({
      where: { id },
      data: {
        workflowStatus: "pending_approval",
        approvalNotes: details.notes || null,
        customAssignments: history,
      },
      include: {
        assignedTo: { select: { fullName: true } },
      },
    });

    return mapInquiry(updated);
  } catch (error) {
    console.error(`Error approving request ${id}:`, error);
    return null;
  }
}

export async function confirmRequest(
  id: string,
  details: {
    confirmedById: string;
    confirmedByName?: string;
    notes?: string;
  }
): Promise<Inquiry | null> {
  try {
    const existing = await db.inquiry.findUnique({ where: { id } });
    if (!existing) return null;

    const history = (existing.customAssignments as any[]) || [];
    history.push({
      assignedByName: details.confirmedByName || "Manager",
      timestamp: new Date().toISOString(),
      notes: details.notes || "Confirmed",
      action: "confirm",
    });

    const updated = await db.inquiry.update({
      where: { id },
      data: {
        workflowStatus: "confirmed",
        confirmedById: details.confirmedById,
        confirmedAt: new Date(),
        customAssignments: history,
      },
      include: {
        assignedTo: { select: { fullName: true } },
      },
    });

    return mapInquiry(updated);
  } catch (error) {
    console.error(`Error confirming request ${id}:`, error);
    return null;
  }
}

export async function resolveRequest(
  id: string,
  details: {
    resolvedByName?: string;
    resolutionNotes: string;
  }
): Promise<Inquiry | null> {
  try {
    const existing = await db.inquiry.findUnique({ where: { id } });
    if (!existing) return null;

    const history = (existing.customAssignments as any[]) || [];
    history.push({
      assignedByName: details.resolvedByName || "Specialist",
      timestamp: new Date().toISOString(),
      notes: details.resolutionNotes,
      action: "resolve",
    });

    const updated = await db.inquiry.update({
      where: { id },
      data: {
        workflowStatus: "resolved",
        status: "resolved",
        resolvedAt: new Date(),
        resolutionNotes: details.resolutionNotes,
        customAssignments: history,
      },
      include: {
        assignedTo: { select: { fullName: true } },
      },
    });

    return mapInquiry(updated);
  } catch (error) {
    console.error(`Error resolving request ${id}:`, error);
    return null;
  }
}

export async function deleteInquiry(id: string): Promise<boolean> {
  try {
    await db.inquiry.delete({ where: { id } });
    return true;
  } catch (e) {
    console.error(`Error deleting inquiry ${id}:`, e);
    return false;
  }
}
