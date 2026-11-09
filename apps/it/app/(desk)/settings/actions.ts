"use server";

import { revalidatePath } from "next/cache";
import {
  listITRolesForIT,
  saveITRoleForIT,
  deleteITRoleForIT,
  type ITRoleDraft,
  isApiError,
} from "@platform/api-client";
import { asUser, requireAllowed } from "../../../lib/session";

export type RoleActionOutcome =
  | { ok: true }
  | { ok: false; reason: "invalid" | "exists" | "assigned" | "forbidden" | "unavailable" };

function handleRoleError(error: unknown): RoleActionOutcome {
  if (isApiError(error)) {
    if (error.status === 401 || error.status === 403) return { ok: false, reason: "forbidden" };
    if (error.code === "role_exists") return { ok: false, reason: "exists" };
    if (error.code === "role_assigned") return { ok: false, reason: "assigned" };
    if (error.status === 400 || error.status === 422) return { ok: false, reason: "invalid" };
  }
  return { ok: false, reason: "unavailable" };
}

export async function getITRolesAction(): Promise<{ ok: boolean; items: ITRoleDraft[]; error?: string }> {
  try {
    const user = await requireAllowed("roles", "read");
    const result = await asUser(() => listITRolesForIT(user.token));
    return { ok: true, items: result.items };
  } catch (err) {
    return { ok: false, items: [], error: err instanceof Error ? err.message : "Failed to load roles" };
  }
}

export async function saveITRoleAction(draft: ITRoleDraft, create: boolean): Promise<RoleActionOutcome> {
  try {
    const user = await requireAllowed("roles", create ? "create" : "edit");
    const res = await asUser(() =>
      saveITRoleForIT(user.token, draft, create)
        .then(() => ({ ok: true as const }))
        .catch(handleRoleError),
    );
    if (res.ok) {
      revalidatePath("/settings");
      revalidatePath("/it-accounts");
    }
    return res;
  } catch (err) {
    return handleRoleError(err);
  }
}

export async function deleteITRoleAction(id: string): Promise<RoleActionOutcome> {
  try {
    const user = await requireAllowed("roles", "delete");
    const res = await asUser(() =>
      deleteITRoleForIT(user.token, id)
        .then(() => ({ ok: true as const }))
        .catch(handleRoleError),
    );
    if (res.ok) {
      revalidatePath("/settings");
      revalidatePath("/it-accounts");
    }
    return res;
  } catch (err) {
    return handleRoleError(err);
  }
}
