"use server";

import { revalidatePath } from "next/cache";
import { IT_ROLES } from "@platform/contracts";
import {
  createITAccountForIT,
  updateITAccountForIT,
  listITRolesForIT,
  isApiError,
  type ITRole,
  type ITProvisioning,
} from "@platform/api-client";
import { asUser, requireAllowed } from "../../../lib/session";

type Failure = "invalid" | "exists" | "lastAdmin" | "unavailable";
type Outcome =
  { ok: true; provisioning?: ITProvisioning } | { ok: false; reason: Failure };

async function checkCanAssignRole(
  token: string,
  userRoles: readonly string[],
  targetRole: string,
): Promise<boolean> {
  const { items: allRoles } = await asUser(() =>
    listITRolesForIT(token).catch(() => ({ items: [] })),
  );
  if (!allRoles || allRoles.length === 0) return true;
  const userRoleObjs = allRoles.filter((r) => userRoles.includes(r.id));
  const isTopLevel = userRoleObjs.some((r) => !r.reportingToRole);
  if (isTopLevel) return true;

  // Role delegation check: targetRole must report to user's role hierarchy
  let current = allRoles.find((r) => r.id === targetRole);
  while (current && current.reportingToRole) {
    if (userRoles.includes(current.reportingToRole)) return true;
    current = allRoles.find((r) => r.id === current?.reportingToRole);
  }
  return false;
}

function failed(error: unknown): { ok: false; reason: Failure } {
  if (isApiError(error)) {
    if (error.status === 401 || error.status === 403) throw error;
    if (error.code === "account_exists") return { ok: false, reason: "exists" };
    if (error.code === "last_it_admin")
      return { ok: false, reason: "lastAdmin" };
    if (error.status === 400 || error.status === 422)
      return { ok: false, reason: "invalid" };
  }
  return { ok: false, reason: "unavailable" };
}

export async function createITAccountAction(form: FormData): Promise<Outcome> {
  const user = await requireAllowed("it_accounts", "create");
  const email = form.get("email"),
    password = form.get("password"),
    role = form.get("role"),
    reportingTo = form.get("reportingTo");
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof role !== "string" ||
    role.trim() === "" ||
    role.length > 100
  )
    return { ok: false, reason: "invalid" };

  // Role delegation safeguard via database role hierarchy
  const canAssign = await checkCanAssignRole(user.token, user.roles, role);
  if (!canAssign) {
    return { ok: false, reason: "invalid" };
  }

  const reportingToVal = typeof reportingTo === "string" && reportingTo.trim() !== "" ? reportingTo.trim() : null;

  const result = await asUser(() =>
    createITAccountForIT(user.token, { email, password, role, reportingTo: reportingToVal })
      .then((provisioning) => ({ ok: true as const, provisioning }))
      .catch(failed),
  );
  if (result.ok) revalidatePath("/it-accounts");
  return result;
}

export async function updateITAccountAction(
  id: string,
  form: FormData,
): Promise<Outcome> {
  const user = await requireAllowed("it_accounts", "edit");
  const role = form.get("role"),
    reportingTo = form.get("reportingTo");
  if (typeof role !== "string" || role.trim() === "" || role.length > 100)
    return { ok: false, reason: "invalid" };

  // Role delegation safeguard via database role hierarchy
  const canAssign = await checkCanAssignRole(user.token, user.roles, role);
  if (!canAssign) {
    return { ok: false, reason: "invalid" };
  }

  const reportingToVal = typeof reportingTo === "string" && reportingTo.trim() !== "" ? reportingTo.trim() : null;

  const result = await asUser(() =>
    updateITAccountForIT(user.token, id, {
      role,
      active: form.get("active") === "on",
      reportingTo: reportingToVal,
    })
      .then(() => ({ ok: true as const }))
      .catch(failed),
  );
  if (result.ok) revalidatePath("/it-accounts");
  return result;
}
