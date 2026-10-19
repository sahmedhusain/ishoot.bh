"use server";
import { serverMessages } from "@ishoot/locales";
import { validateActionArguments } from "../../lib/action-input";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { consumeAbuseLimit } from "@ishoot/database";
import { getSessionByToken } from "@ishoot/database/queries/sessions";
import {
  changeOwnPassword,
  revokeOwnSession,
  revokeOtherSessions,
} from "@ishoot/database/queries/account-security";
import { requireAuth, SESSION_COOKIE_NAME } from "../../lib/auth";
import { ROUTES } from "../../constants/routes";
export async function changeMyPasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  code?: string;
}) {
  validateActionArguments("changeMyPasswordAction", { input });
  const user = await requireAuth();
  await consumeAbuseLimit("change-password", user.id, 5);
  await changeOwnPassword(user.id, input);
  (await cookies()).delete(SESSION_COOKIE_NAME);
  return { success: true };
}
export async function revokeMySessionAction(id: string) {
  validateActionArguments("revokeMySessionAction", { id });
  const user = await requireAuth();
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const current = token ? await getSessionByToken(token) : null;
  await revokeOwnSession(user.id, id, current?.id);
  revalidatePath(ROUTES.profile());
}
export async function revokeOtherSessionsAction() {
  validateActionArguments("revokeOtherSessionsAction", {});
  const user = await requireAuth();
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const current = token ? await getSessionByToken(token) : null;
  if (!current) throw new Error(serverMessages.profileSecurityError5);
  await revokeOtherSessions(user.id, current.id);
  revalidatePath(ROUTES.profile());
}
