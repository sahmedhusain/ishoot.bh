import { cache } from "react";
import { forbidden } from "next/navigation";
import { assertInScope, scopedUserIds } from "@platform/database";
import type { DataScopeArea } from "@platform/database/constants/data-scope";
import { requireAuth } from "./auth";

/** The staff accounts whose records the signed-in person may see in `area`; null for every record. */
export const dataScope = cache(async (area: DataScopeArea) =>
  scopedUserIds(await requireAuth(), area),
);

/** For pages: a record outside the person's data scope renders the "no access" page. */
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

/** For server actions: a record outside the person's data scope is refused with an error. */
export async function assertRecordInScope(
  area: DataScopeArea,
  ownerId: string | null | undefined,
) {
  assertInScope(await dataScope(area), ownerId);
}
