import { cache } from "react";
import { forbidden } from "next/navigation";
import { assertInScope, scopedUserIds } from "@platform/database";
import type { DataScopeArea } from "@platform/database/constants/data-scope";
import { requireAuth } from "./auth";

export const dataScope = cache(async (area: DataScopeArea) =>
  scopedUserIds(await requireAuth(), area),
);

export async function requireRecordInScope(
  area: DataScopeArea,
  ownerId: string | null | undefined,
) {
  try {
    assertInScope(await dataScope(area), ownerId);
  } catch {
    forbidden();
  }
}

export async function assertRecordInScope(
  area: DataScopeArea,
  ownerId: string | null | undefined,
) {
  assertInScope(await dataScope(area), ownerId);
}
