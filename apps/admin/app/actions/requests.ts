"use server";
import { measureOperation } from "@ishoot/database";
import { validateActionArguments } from "../../lib/action-input";

import {
  assignConsolidatedRequest,
  returnRequest,
  confirmRequest,
  resolveRequest,
  submitRequestForApproval,
  submitForApproval,
  findPendingApproval,
  decideApprovalRequest,
  cancelPendingApprovals,
  runAtomicMutation,
  db,
} from "@ishoot/database";
import { revalidatePath } from "next/cache";
import { requireAuth, requirePermission, getCurrentUser } from "../../lib/auth";

export async function assignRequestAction(
  id: string,
  assignment: {
    assignedToId: string;
    team: string;
    notes?: string;
  },
) {
  return measureOperation("action:assignRequestAction", async () => {
    const actor = await requirePermission("requests", "assign");
    validateActionArguments("assignRequestAction", { id, assignment });

    const updated = await assignConsolidatedRequest(id, assignment.assignedToId, actor.id, assignment.team, assignment.notes);

    if (!updated) {
      return { success: false, error: "Failed to assign request" };
    }

    revalidatePath("/dashboard/requests");
    return { success: true, request: updated };
  });
}

export async function reassignRequestAction(
  id: string,
  assignment: {
    newAssignedToId: string;
    newTeam?: string;
    notes: string;
  },
) {
  return measureOperation("action:reassignRequestAction", async () => {
    const actor = await requirePermission("requests", "assign");
    validateActionArguments("reassignRequestAction", { id, assignment });

    const updated = await assignConsolidatedRequest(id, assignment.newAssignedToId, actor.id, assignment.newTeam, assignment.notes);

    if (!updated) {
      return { success: false, error: "Failed to re-assign request" };
    }

    revalidatePath("/dashboard/requests");
    return { success: true, request: updated };
  });
}

export async function returnRequestAction(
  id: string,
  details: {
    reason: string;
  },
) {
  return measureOperation("action:returnRequestAction", async () => {
    const actor = await requirePermission("requests", "write");
    validateActionArguments("returnRequestAction", { id, details });
    const user = await getCurrentUser();

    const updated = await runAtomicMutation(async () => {
      await cancelPendingApprovals("service_request", id);
      return returnRequest(id, {
        returnedById: actor.id,
        returnedByName: user?.full_name || actor.full_name,
        reason: details.reason,
      });
    });

    if (!updated) {
      return { success: false, error: "Failed to return request" };
    }

    revalidatePath("/dashboard/requests");
    return { success: true, request: updated };
  });
}

export async function approveRequestAction(
  id: string,
  details: {
    notes?: string;
  },
) {
  return measureOperation("action:approveRequestAction", async () => {
    // Who may approve is defined by the service request approval policy and enforced by the engine.
    const actor = await requireAuth();
    validateActionArguments("approveRequestAction", { id, details });

    const outcome = await runAtomicMutation(async () => {
      const pending = await findPendingApproval("service_request", id);
      if (!pending) throw new Error("Submit the request for approval first");
      return decideApprovalRequest(pending.id, actor.id, "approved", details.notes);
    });

    revalidatePath("/dashboard/requests");
    revalidatePath(`/dashboard/requests/${id}`);
    revalidatePath("/dashboard/approvals");
    return { success: true, status: outcome.status };
  });
}

export async function submitRequestForApprovalAction(
  id: string,
  details: {
    notes?: string;
  },
) {
  return measureOperation("action:submitRequestForApprovalAction", async () => {
    const actor = await requirePermission("requests", "write");
    validateActionArguments("submitRequestForApprovalAction", { id, details });

    const outcome = await runAtomicMutation(async () => {
      await submitRequestForApproval(id, { submittedById: actor.id, submittedByName: actor.full_name, notes: details.notes });
      const request = await db.inquiry.findUniqueOrThrow({ where: { id }, select: { reference: true, requestType: true } });
      return submitForApproval({
        targetType: "service_request",
        targetId: id,
        requesterId: actor.id,
        policySnapshot: { reference: request.reference, requestType: request.requestType },
      });
    });

    revalidatePath("/dashboard/requests");
    revalidatePath(`/dashboard/requests/${id}`);
    revalidatePath("/dashboard/approvals");
    return { success: true, status: outcome.status };
  });
}

export async function confirmRequestAction(
  id: string,
  details: {
    notes?: string;
  },
) {
  return measureOperation("action:confirmRequestAction", async () => {
    const actor = await requirePermission("requests", "approve");
    validateActionArguments("confirmRequestAction", { id, details });
    const user = await getCurrentUser();

    const updated = await confirmRequest(id, {
      confirmedById: actor.id,
      confirmedByName: user?.full_name || actor.full_name,
      notes: details.notes,
    });

    if (!updated) {
      return { success: false, error: "Failed to confirm request" };
    }

    revalidatePath("/dashboard/requests");
    return { success: true, request: updated };
  });
}

export async function resolveRequestAction(
  id: string,
  details: {
    resolutionNotes: string;
  },
) {
  return measureOperation("action:resolveRequestAction", async () => {
    const actor = await requirePermission("requests", "write");
    validateActionArguments("resolveRequestAction", { id, details });
    const user = await getCurrentUser();

    const updated = await resolveRequest(id, {
      resolutionNotes: details.resolutionNotes,
      resolvedById: actor.id,
      resolvedByName: user?.full_name || actor.full_name,
    });

    if (!updated) {
      return { success: false, error: "Failed to resolve request" };
    }

    revalidatePath("/dashboard/requests");
    return { success: true, request: updated };
  });
}

export async function createConsolidatedRequestAction(data: {
  requestType: "SR" | "CR" | "inquiry" | "quote_request";
  fullName: string;
  email: string;
  phone?: string;
  company?: string;
  servicesRequested?: string[];
  message?: string;
  budgetRange?: string;
  targetTimeline?: string;
  clientId?: string;
  slaDueDate?: string;
  priority?: string;
  team?: string;
  assignedToId?: string;
}): Promise<{ success: boolean; request?: any; error?: string }> {
  return measureOperation("action:createConsolidatedRequestAction", async () => {
    const actor = await requirePermission("requests", "write");
    validateActionArguments("createConsolidatedRequestAction", { data });

    const { createConsolidatedRequest } = await import("@ishoot/database");
    const created = await createConsolidatedRequest(
      {
        requestType: data.requestType,
        name: data.fullName,
        email: data.email,
        phone: data.phone,
        companyName: data.company,
        serviceType: data.servicesRequested?.join(", "),
        message: data.message || "",
        budgetRange: data.budgetRange,
        timeline: data.targetTimeline,
        customerId: data.clientId,
        slaDueDate: data.slaDueDate ? new Date(data.slaDueDate) : undefined,
        priority: data.priority,
        team: data.team,
        assignedToId: data.assignedToId,
      },
      actor.id,
    );

    revalidatePath("/dashboard/requests");
    return { success: true, request: created };
  });
}

export async function assignRequestWithAvailabilityAction(
  id: string,
  assignment: {
    assignedToId: string;
    team?: string;
    reason?: string;
  },
): Promise<{ success: boolean; request?: any; error?: string }> {
  return measureOperation("action:assignRequestWithAvailabilityAction", async () => {
    const actor = await requirePermission("requests", "assign");
    validateActionArguments("assignRequestWithAvailabilityAction", { id, assignment });

    const updated = await assignConsolidatedRequest(
      id,
      assignment.assignedToId,
      actor.id,
      assignment.team,
      assignment.reason,
    );

    revalidatePath("/dashboard/requests");
    revalidatePath(`/dashboard/requests/${id}`);
    return { success: true, request: updated };
  });
}

export async function addRequestCommentAction(
  inquiryId: string,
  body: string,
  isClientVisible: boolean = false,
  attachments?: unknown,
): Promise<{ success: boolean; comment?: any; error?: string }> {
  return measureOperation("action:addRequestCommentAction", async () => {
    const actor = await requirePermission("requests", "write");
    validateActionArguments("addRequestCommentAction", { inquiryId, body, isClientVisible, attachments });

    const { addRequestComment } = await import("@ishoot/database");
    const comment = await addRequestComment(inquiryId, actor.id, body, isClientVisible, attachments);

    revalidatePath(`/dashboard/requests/${inquiryId}`);
    return { success: true, comment };
  });
}
