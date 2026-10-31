"use server";
import { revalidatePath } from "next/cache";
import { requireFeatureEnabled } from "@platform/database";
import {
  createCommissionRule,
  recordCommissionSnapshot,
  reverseCommissionSnapshot,
  type CommissionRuleInput,
  type RecordCommissionInput,
} from "@platform/database/queries/commissions";
import { requirePermission } from "../../lib/auth";
import { validateActionArguments } from "../../lib/action-input";

/** Create an effective-dated commission rule for sales attribution. */
export async function createCommissionRuleAction(input: CommissionRuleInput) {
  validateActionArguments("createCommissionRuleAction", { input });
  await requireFeatureEnabled("finance");
  const actor = await requirePermission("payments", "edit");
  const result = await createCommissionRule(input, actor.id);
  revalidatePath("/dashboard/commissions");
  return result;
}

/** Calculate and record an immutable commission snapshot for a sale. */
export async function recordCommissionSnapshotAction(input: RecordCommissionInput) {
  validateActionArguments("recordCommissionSnapshotAction", { input });
  await requireFeatureEnabled("finance");
  const actor = await requirePermission("payments", "create");
  const result = await recordCommissionSnapshot(input, actor.id);
  revalidatePath("/dashboard/commissions");
  return result;
}

/** Reverse an earned commission snapshot with linking to the original calculation. */
export async function reverseCommissionSnapshotAction(input: { snapshotId: string; reason: string }) {
  validateActionArguments("reverseCommissionSnapshotAction", { input });
  await requireFeatureEnabled("finance");
  const actor = await requirePermission("payments", "edit");
  const result = await reverseCommissionSnapshot(input.snapshotId, input.reason, actor.id);
  revalidatePath("/dashboard/commissions");
  return result;
}
