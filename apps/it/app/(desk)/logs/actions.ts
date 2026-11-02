"use server";

import { revalidatePath } from "next/cache";
import {
  setDebugToggleForIT,
  removeDebugToggleForIT,
} from "@platform/api-client";
import { asUser, requireAllowed } from "../../../lib/session";

export async function setDebugToggleAction(
  service: string,
  logLevel: string,
  ttlMinutes: number
) {
  const user = await requireAllowed("runtime_config", "edit");
  await asUser(() =>
    setDebugToggleForIT(user.token, service, logLevel, ttlMinutes)
  );
  revalidatePath("/logs");
  return { ok: true as const };
}

export async function removeDebugToggleAction(service: string) {
  const user = await requireAllowed("runtime_config", "edit");
  await asUser(() => removeDebugToggleForIT(user.token, service));
  revalidatePath("/logs");
  return { ok: true as const };
}
