"use server";

import { revalidatePath } from "next/cache";
import {
  createAPIKeyForIT,
  revokeAPIKeyForIT,
} from "@platform/api-client";
import { asUser, requireAllowed } from "../../../lib/session";

export async function createAPIKeyAction(
  name: string,
  scopes: string[],
  rateLimit: number
) {
  const user = await requireAllowed("api_keys", "create");
  const res = await asUser(() =>
    createAPIKeyForIT(user.token, name, scopes, rateLimit)
  );
  revalidatePath("/api-keys");
  return { ok: true as const, value: res };
}

export async function revokeAPIKeyAction(id: string) {
  const user = await requireAllowed("api_keys", "delete");
  await asUser(() => revokeAPIKeyForIT(user.token, id));
  revalidatePath("/api-keys");
  return { ok: true as const };
}
