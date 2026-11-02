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
    role = form.get("role");
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof role !== "string" ||
    !IT_ROLES.includes(role)
  )
    return { ok: false, reason: "invalid" };
  const result = await asUser(() =>
    createITAccountForIT(user.token, { email, password, role: role as ITRole })
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
  const role = form.get("role");
  if (typeof role !== "string" || !IT_ROLES.includes(role))
    return { ok: false, reason: "invalid" };
  const result = await asUser(() =>
    updateITAccountForIT(user.token, id, {
      role: role as ITRole,
      active: form.get("active") === "on",
    })
      .then(() => ({ ok: true as const }))
      .catch(failed),
  );
  if (result.ok) revalidatePath("/it-accounts");
  return result;
}
