"use server";

import { revalidatePath } from "next/cache";
import {
  createBackupForIT,
  verifyBackupForIT,
} from "@platform/api-client";
import { asUser, requireAllowed } from "../../../lib/session";

export async function triggerBackupAction(kind: "database" | "bucket" | "full") {
  const user = await requireAllowed("backups", "execute");
  const res = await asUser(() => createBackupForIT(user.token, kind));
  revalidatePath("/backups");
  return { ok: true as const, value: res };
}

export async function verifyBackupAction(id: string) {
  const user = await requireAllowed("backups", "execute");
  await asUser(() => verifyBackupForIT(user.token, id));
  revalidatePath("/backups");
  return { ok: true as const };
}
