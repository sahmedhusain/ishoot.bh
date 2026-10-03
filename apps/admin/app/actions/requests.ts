"use server";

import {
  assignRequest,
  reassignRequest,
  returnRequest,
  approveRequest,
  confirmRequest,
  resolveRequest,
  createActivityLog,
} from "@ishoot/database";
import { revalidatePath } from "next/cache";
import { requirePermission, getCurrentUser } from "../../lib/auth";

export async function assignRequestAction(
  id: string,
  assignment: {
    assignedToId: string;
    team: string;
    notes?: string;
  }
) {
  const actor = await requirePermission("requests", "write");
  const user = await getCurrentUser();

  const updated = await assignRequest(id, {
    assignedToId: assignment.assignedToId,
    team: assignment.team,
    assignedByName: user?.full_name || actor.full_name,
    notes: assignment.notes,
  });

  if (!updated) {
    return { success: false, error: "Failed to assign request" };
  }

  await createActivityLog({
    user_id: actor.id,
    action: "update",
    entity_type: "inquiry",
    entity_id: id,
    details: {
      action: "assign",
      assignedToId: assignment.assignedToId,
      team: assignment.team,
    },
  });

  revalidatePath("/dashboard/requests");
  return { success: true, request: updated };
}

export async function reassignRequestAction(
  id: string,
  assignment: {
    newAssignedToId: string;
    newTeam?: string;
    notes: string;
  }
) {
  const actor = await requirePermission("requests", "write");
  const user = await getCurrentUser();

  const updated = await reassignRequest(id, {
    newAssignedToId: assignment.newAssignedToId,
    newTeam: assignment.newTeam,
    reassignedByName: user?.full_name || actor.full_name,
    notes: assignment.notes,
  });

  if (!updated) {
    return { success: false, error: "Failed to re-assign request" };
  }

  await createActivityLog({
    user_id: actor.id,
    action: "update",
    entity_type: "inquiry",
    entity_id: id,
    details: {
      action: "reassign",
      newAssignedToId: assignment.newAssignedToId,
      newTeam: assignment.newTeam,
      notes: assignment.notes,
    },
  });

  revalidatePath("/dashboard/requests");
  return { success: true, request: updated };
}

export async function returnRequestAction(
  id: string,
  details: {
    reason: string;
  }
) {
  const actor = await requirePermission("requests", "write");
  const user = await getCurrentUser();

  const updated = await returnRequest(id, {
    returnedByName: user?.full_name || actor.full_name,
    reason: details.reason,
  });

  if (!updated) {
    return { success: false, error: "Failed to return request" };
  }

  await createActivityLog({
    user_id: actor.id,
    action: "update",
    entity_type: "inquiry",
    entity_id: id,
    details: {
      action: "return",
      reason: details.reason,
    },
  });

  revalidatePath("/dashboard/requests");
  return { success: true, request: updated };
}

export async function approveRequestAction(
  id: string,
  details: {
    notes?: string;
  }
) {
  const actor = await requirePermission("requests", "approve");
  const user = await getCurrentUser();

  const updated = await approveRequest(id, {
    approvedById: actor.id,
    approvedByName: user?.full_name || actor.full_name,
    notes: details.notes,
  });

  if (!updated) {
    return { success: false, error: "Failed to approve request" };
  }

  await createActivityLog({
    user_id: actor.id,
    action: "approve",
    entity_type: "inquiry",
    entity_id: id,
    details: {
      action: "approve",
      notes: details.notes,
    },
  });

  revalidatePath("/dashboard/requests");
  return { success: true, request: updated };
}

export async function confirmRequestAction(
  id: string,
  details: {
    notes?: string;
  }
) {
  const actor = await requirePermission("requests", "approve");
  const user = await getCurrentUser();

  const updated = await confirmRequest(id, {
    confirmedById: actor.id,
    confirmedByName: user?.full_name || actor.full_name,
    notes: details.notes,
  });

  if (!updated) {
    return { success: false, error: "Failed to confirm request" };
  }

  await createActivityLog({
    user_id: actor.id,
    action: "update",
    entity_type: "inquiry",
    entity_id: id,
    details: {
      action: "confirm",
      notes: details.notes,
    },
  });

  revalidatePath("/dashboard/requests");
  return { success: true, request: updated };
}

export async function resolveRequestAction(
  id: string,
  details: {
    resolutionNotes: string;
  }
) {
  const actor = await requirePermission("requests", "write");
  const user = await getCurrentUser();

  const updated = await resolveRequest(id, {
    resolutionNotes: details.resolutionNotes,
    resolvedByName: user?.full_name || actor.full_name,
  });

  if (!updated) {
    return { success: false, error: "Failed to resolve request" };
  }

  await createActivityLog({
    user_id: actor.id,
    action: "update",
    entity_type: "inquiry",
    entity_id: id,
    details: {
      action: "resolve",
      resolutionNotes: details.resolutionNotes,
    },
  });

  revalidatePath("/dashboard/requests");
  return { success: true, request: updated };
}
