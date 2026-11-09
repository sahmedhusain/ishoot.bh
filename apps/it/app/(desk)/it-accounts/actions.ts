"use server";

import { revalidatePath } from "next/cache";
import { IT_ROLES } from "@platform/contracts";
import {
  createITAccountForIT,
  updateITAccountForIT,
  isApiError,
  type ITRole,
  type ITProvisioning,
} from "@platform/api-client";
import { asUser, requireAllowed } from "../../../lib/session";

type Failure = "invalid" | "exists" | "lastAdmin" | "unavailable";
type Outcome =
  { ok: true; provisioning?: ITProvisioning } | { ok: false; reason: Failure };

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

  // Team Lead role delegation safeguard: team leads cannot create admins or managers
  const isSuperOrManager = user.roles.includes("it_super_admin") || user.roles.includes("it_admin") || user.roles.includes("it_manager");
  if (!isSuperOrManager && (role === "it_super_admin" || role === "it_admin" || role === "it_manager")) {
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

  // Team Lead role delegation safeguard: team leads cannot promote to admin/manager
  const isSuperOrManager = user.roles.includes("it_super_admin") || user.roles.includes("it_admin") || user.roles.includes("it_manager");
  if (!isSuperOrManager && (role === "it_super_admin" || role === "it_admin" || role === "it_manager")) {
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
