"use server";
// The signed-in person's status (available, busy, in a meeting…), kept by the realtime service (docs/adr/0012).
import { serverMessages } from "@platform/locales";
import { clearMyStatus, getMyStatus, isApiError, setMyStatus } from "@platform/api-client";
import { validateActionArguments } from "../../lib/action-input";
import { requireAuth } from "../../lib/auth";

export async function getMyStatusAction() {
  validateActionArguments("getMyStatusAction", {});
  const user = await requireAuth();
  return getMyStatus("staff", user.id);
}

/** Sets the status the person chose, with an optional message and end time (ISO). */
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

/** Goes back to the automatic status (from the calendar, leave and activity). */
export async function clearMyStatusAction() {
  validateActionArguments("clearMyStatusAction", {});
  const user = await requireAuth();
  return clearMyStatus("staff", user.id);
}
