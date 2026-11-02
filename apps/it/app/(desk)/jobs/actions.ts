"use server";

import { revalidatePath } from "next/cache";
import { asUser, requireAllowed } from "../../../lib/session";

export async function retryJobAction(id: string) {
  await requireAllowed("jobs", "execute");
  // In a real execution, calls river retry
  revalidatePath("/jobs");
  return { ok: true as const };
}

export async function discardJobAction(id: string) {
  await requireAllowed("jobs", "execute");
  // In a real execution, calls river discard
  revalidatePath("/jobs");
  return { ok: true as const };
}
