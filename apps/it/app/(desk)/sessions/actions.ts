"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isApiError, revokeIdentitySessionForIT } from "@platform/api-client";
import { asUser, requireAllowed } from "../../../lib/session";
import { clearedCookies } from "../../../lib/credentials";

export async function revokeSessionAction(
  id: string,
): Promise<{ ok: boolean }> {
  const user = await requireAllowed("sessions", "delete");
  if (typeof id !== "string" || id.length !== 36) return { ok: false };
  const result = await asUser(() =>
    revokeIdentitySessionForIT(user.token, id)
      .then(() => ({ ok: true }))
      .catch((error: unknown) => {
        if (isApiError(error) && (error.status === 401 || error.status === 403))
          throw error;
        return { ok: false };
      }),
  );
  if (result.ok && id === user.sessionId) {
    const jar = await cookies();
    for (const cookie of clearedCookies())
      jar.set(cookie.name, cookie.value, cookie.options);
    redirect("/login");
  }
  if (result.ok) revalidatePath("/sessions");
  return result;
}
