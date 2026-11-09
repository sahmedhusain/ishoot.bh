"use server";

import { revalidatePath } from "next/cache";
import { requireAllowed } from "../../../lib/session";

export async function retryJobAction(id: string) {
  await requireAllowed("jobs", "execute");

  revalidatePath("/jobs");
  return { ok: true as const };
}

export async function discardJobAction(id: string) {
  await requireAllowed("jobs", "execute");

  revalidatePath("/jobs");
  return { ok: true as const };
}
