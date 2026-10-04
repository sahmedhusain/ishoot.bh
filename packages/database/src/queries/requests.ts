import { db, runAtomicMutation } from "../db";
import { canTransitionRequest } from "../constants/requests";
import { cancelPendingApprovals } from "../services/approval-engine";
import { assignRequest, reassignRequest } from "./inquiries";
import { getNextSequenceNumber } from "./sequence";
import { assertAssigneeAvailable, assertActorNotOnLeave } from "./leave";

export async function createConsolidatedRequest(
  data: {
    requestType: "SR" | "CR" | "inquiry" | "quote_request";
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
  const prefix = data.requestType === "CR" ? "CR" : data.requestType === "SR" ? "SR" : "INQ";
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
        intent: data.requestType === "CR" ? "complaint" : data.requestType === "quote_request" ? "quote_request" : "inquiry",
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

export async function getConsolidatedRequestById(id: string): Promise<any> {
  const request = await db.inquiry.findUnique({
    where: { id },
    include: {
      customer: true,
      assignedTo: { select: { id: true, fullName: true, email: true } },
      convertedDeal: { select: { id: true, title: true, dealStage: true, dealValue: true } },
      quotations: {
        select: { id: true, quotationNumber: true, totalAmount: true, status: true },
        orderBy: { createdAt: "desc" },
      },
      requestEvents: {
        include: {
          actor: { select: { id: true, fullName: true, email: true } },
        },
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
        include: {
          author: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return request;
}

