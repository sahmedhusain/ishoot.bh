"use server";
import { serverMessages } from "@platform/locales";
import { validateActionArguments } from "../../lib/action-input";
import { headers, cookies } from "next/headers";
import { clearedCookies } from "../../lib/identity-session";
import { revalidatePath } from "next/cache";
import { consumeAbuseLimit } from "@platform/database";
import { trustedClientIp } from "@platform/database/services/abuse-limits";
import { logOwnSecurityChange } from "@platform/database/queries/account-security";
import {
  changeOwnPassword,
  isApiError,
  revokeOtherOwnSessions,
  revokeOwnSession,
} from "@platform/api-client";
import { getStaffToken, requireAuth } from "../../lib/auth";
import { ROUTES } from "../../constants/routes";

async function staffToken() {
  const staff = await getStaffToken();
  if (!staff) throw new Error(serverMessages.unauthorized);
  return staff;
}

/** Changes the person's own password through identity, which ends every session, including this one. */
export async function changeMyPasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  code?: string;
}) {
  validateActionArguments("changeMyPasswordAction", { input });
  const user = await requireAuth();
  await consumeAbuseLimit("change-password", user.id, 5);
  const bytes = Buffer.byteLength(input.newPassword, "utf8");
  if (input.newPassword.length < 12 || bytes > 72)
    throw new Error(serverMessages.profileSecurityError0);
  if (input.newPassword === input.currentPassword)
    throw new Error(serverMessages.profileSecurityError2);
  const { token } = await staffToken();
  try {
    await changeOwnPassword(token, {
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
      code: input.code || undefined,
      clientIp: trustedClientIp(await headers()) || undefined,
    });
  } catch (error) {
    if (isApiError(error, "mfa_required"))
      throw new Error(serverMessages.profileSecurityError3);
    if (isApiError(error, "password_rejected"))
      throw new Error(
        input.code
          ? serverMessages.profileSecurityError3
          : serverMessages.profileSecurityError1,
      );
    throw error;
  }
  const jar = await cookies();
  for (const c of clearedCookies()) jar.set(c.name, c.value, c.options);
  await logOwnSecurityChange(user.id, "change_password");
  return { success: true };
}

export async function revokeMySessionAction(id: string) {
  validateActionArguments("revokeMySessionAction", { id });
  await requireAuth();
  const staff = await staffToken();
  if (id === staff.sessionId)
    throw new Error(serverMessages.profileSecurityError4);
  try {
    await revokeOwnSession(staff.token, id);
  } catch (error) {
    if (isApiError(error) && error.status === 404)
      throw new Error(serverMessages.profileSecurityError5);
    throw error;
  }
  await logOwnSecurityChange(staff.userId, "revoke_session", id);
  revalidatePath(ROUTES.profile());
}

export async function revokeOtherSessionsAction() {
  validateActionArguments("revokeOtherSessionsAction", {});
  await requireAuth();
  const staff = await staffToken();
  await revokeOtherOwnSessions(staff.token);
  await logOwnSecurityChange(staff.userId, "revoke_other_sessions");
  revalidatePath(ROUTES.profile());
}
