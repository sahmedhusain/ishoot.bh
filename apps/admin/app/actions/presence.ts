"use server";
import { serverMessages } from "@platform/locales";
import { clearMyStatus, isApiError, setMyStatus } from "@platform/api-client";
import { validateActionArguments } from "../../lib/action-input";
import { requireAuth } from "../../lib/auth";

export async function setMyStatusAction(choice: { status: string; message?: string | null; expiresAt?: string | null }) {
  validateActionArguments("setMyStatusAction", { choice });
  const user = await requireAuth();
  try {
    return await setMyStatus("staff", user.id, choice);
  } catch (error) {
    if (isApiError(error) && error.status === 422) throw new Error(serverMessages.statusInvalid);
    throw error;
  }
}

export async function clearMyStatusAction() {
  validateActionArguments("clearMyStatusAction", {});
  const user = await requireAuth();
  return clearMyStatus("staff", user.id);
}
