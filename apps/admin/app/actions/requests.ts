"use server";
import { measureOperation } from "@ishoot/database";
import { validateActionArguments } from "../../lib/action-input";

import {
  assignRequest,
  reassignRequest,
  returnRequest,
  approveRequest,
  confirmRequest,
  resolveRequest,
} from "@ishoot/database";
import { revalidatePath } from "next/cache";
import { requirePermission, getCurrentUser } from "../../lib/auth";

export async function assignRequestAction(
  id: string,
  assignment: {
    assignedToId: string;
    team: string;
    notes?: string;
  },
) {
  return measureOperation("action:assignRequestAction", async () => {
    const actor = await requirePermission("requests", "write");
    validateActionArguments("assignRequestAction", { id, assignment });
    const user = await getCurrentUser();

    const updated = await assignRequest(id, {
      assignedToId: assignment.assignedToId,
      team: assignment.team,
      assignedById: actor.id,
      assignedByName: user?.full_name || actor.full_name,
      notes: assignment.notes,
    });

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
    const actor = await requirePermission("requests", "write");
    validateActionArguments("reassignRequestAction", { id, assignment });
    const user = await getCurrentUser();

    const updated = await reassignRequest(id, {
      newAssignedToId: assignment.newAssignedToId,
      newTeam: assignment.newTeam,
      reassignedById: actor.id,
      reassignedByName: user?.full_name || actor.full_name,
      notes: assignment.notes,
    });

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

    const updated = await returnRequest(id, {
      returnedById: actor.id,
      returnedByName: user?.full_name || actor.full_name,
      reason: details.reason,
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
    const actor = await requirePermission("requests", "approve");
    validateActionArguments("approveRequestAction", { id, details });
    const user = await getCurrentUser();

    const updated = await approveRequest(id, {
      approvedById: actor.id,
      approvedByName: user?.full_name || actor.full_name,
      notes: details.notes,
    });

    if (!updated) {
      return { success: false, error: "Failed to approve request" };
    }

    revalidatePath("/dashboard/requests");
    return { success: true, request: updated };
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
