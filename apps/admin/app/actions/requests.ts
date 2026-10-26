"use server";
import { serverMessages } from "@platform/locales";

import { ROUTES } from "../../constants/routes";
import { measureOperation } from "@platform/database";
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
} from "@platform/database";
import { revalidatePath } from "next/cache";
import { requireAuth, requirePermission, getCurrentUser } from "../../lib/auth";
import { assertRecordInScope } from "../../lib/data-scope";

/** A request outside the person's data scope cannot be changed, even by someone who knows its id. */
async function requireRequestInScope(id: string) {
  const request = await db.inquiry.findUnique({
    where: { id },
    select: { assignedToId: true },
  });
  if (request) await assertRecordInScope("requests", request.assignedToId);
}

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
    await requireRequestInScope(id);

    const updated = await assignConsolidatedRequest(
      id,
      assignment.assignedToId,
      actor.id,
      assignment.team,
      assignment.notes,
    );

    if (!updated) {
      return {
        success: false,
        error: serverMessages.runtimeFailedToAssignRequest,
      };
    }

    revalidatePath(ROUTES.requests.list);
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
    await requireRequestInScope(id);

    const updated = await assignConsolidatedRequest(
      id,
      assignment.newAssignedToId,
      actor.id,
      assignment.newTeam,
      assignment.notes,
    );

    if (!updated) {
      return {
        success: false,
        error: serverMessages.runtimeFailedToReAssignRequest,
      };
    }

    revalidatePath(ROUTES.requests.list);
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
    await requireRequestInScope(id);
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
      return {
        success: false,
        error: serverMessages.runtimeFailedToReturnRequest,
      };
    }

    revalidatePath(ROUTES.requests.list);
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
    await requireRequestInScope(id);

    const outcome = await runAtomicMutation(async () => {
      const pending = await findPendingApproval("service_request", id);
      if (!pending)
        throw new Error(serverMessages.submitTheRequestForApprovalFirst);
      return decideApprovalRequest(
        pending.id,
        actor.id,
        "approved",
        details.notes,
      );
    });

    revalidatePath(ROUTES.requests.list);
    revalidatePath(ROUTES.requests.detail(id));
    revalidatePath(ROUTES.approvals());
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
    await requireRequestInScope(id);

    const outcome = await runAtomicMutation(async () => {
      await submitRequestForApproval(id, {
        submittedById: actor.id,
        submittedByName: actor.full_name,
        notes: details.notes,
      });
      const request = await db.inquiry.findUniqueOrThrow({
        where: { id },
        select: { reference: true, requestType: true },
      });
      return submitForApproval({
        targetType: "service_request",
        targetId: id,
        requesterId: actor.id,
        policySnapshot: {
          reference: request.reference,
          requestType: request.requestType,
        },
      });
    });

    revalidatePath(ROUTES.requests.list);
    revalidatePath(ROUTES.requests.detail(id));
    revalidatePath(ROUTES.approvals());
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
    await requireRequestInScope(id);
    const user = await getCurrentUser();

    const updated = await confirmRequest(id, {
      confirmedById: actor.id,
      confirmedByName: user?.full_name || actor.full_name,
      notes: details.notes,
    });

    if (!updated) {
      return {
        success: false,
        error: serverMessages.runtimeFailedToConfirmRequest,
      };
    }

    revalidatePath(ROUTES.requests.list);
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
    await requireRequestInScope(id);
    const user = await getCurrentUser();

    const updated = await resolveRequest(id, {
      resolutionNotes: details.resolutionNotes,
      resolvedById: actor.id,
      resolvedByName: user?.full_name || actor.full_name,
    });

    if (!updated) {
      return {
        success: false,
        error: serverMessages.runtimeFailedToResolveRequest,
      };
    }

    revalidatePath(ROUTES.requests.list);
    return { success: true, request: updated };
  });
}

export async function createConsolidatedRequestAction(data: {
  requestType: "SR" | "inquiry" | "quote_request";
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
  return measureOperation(
    "action:createConsolidatedRequestAction",
    async () => {
      const actor = await requirePermission("requests", "write");
      validateActionArguments("createConsolidatedRequestAction", { data });

      const { createConsolidatedRequest } = await import("@platform/database");
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

      revalidatePath(ROUTES.requests.list);
      return { success: true, request: created };
    },
  );
}

export async function assignRequestWithAvailabilityAction(
  id: string,
  assignment: {
    assignedToId: string;
    team?: string;
    reason?: string;
  },
): Promise<{ success: boolean; request?: any; error?: string }> {
  return measureOperation(
    "action:assignRequestWithAvailabilityAction",
    async () => {
      const actor = await requirePermission("requests", "assign");
      validateActionArguments("assignRequestWithAvailabilityAction", {
        id,
        assignment,
      });
      await requireRequestInScope(id);

      const updated = await assignConsolidatedRequest(
        id,
        assignment.assignedToId,
        actor.id,
        assignment.team,
        assignment.reason,
      );

      revalidatePath(ROUTES.requests.list);
      revalidatePath(ROUTES.requests.detail(id));
      return { success: true, request: updated };
    },
  );
}

export async function addRequestCommentAction(
  inquiryId: string,
  body: string,
  isClientVisible: boolean = false,
  attachments?: unknown,
): Promise<{ success: boolean; comment?: any; error?: string }> {
  return measureOperation("action:addRequestCommentAction", async () => {
    const actor = await requirePermission("requests", "write");
    validateActionArguments("addRequestCommentAction", {
      inquiryId,
      body,
      isClientVisible,
      attachments,
    });
    await requireRequestInScope(inquiryId);

    const { addRequestComment } = await import("@platform/database");
    const comment = await addRequestComment(
      inquiryId,
      actor.id,
      body,
      isClientVisible,
      attachments,
    );

    revalidatePath(ROUTES.requests.detail(inquiryId));
    return { success: true, comment };
  });
}
