"use server";
import { measureOperation, updateApprovalPolicy, createActivityLog, type ApprovalTargetType, type ApproverMode } from "@ishoot/database";
import { revalidatePath } from "next/cache";
import { validateActionArguments } from "../../lib/action-input";
import { requirePermission } from "../../lib/auth";

export async function updateApprovalPolicyAction(
  targetType: string,
  policy: {
    enabled: boolean;
    allowSelfApproval: boolean;
    autoApproveRoles: string[];
    steps: { approverMode: string; roleKey?: string | null; userId?: string | null; permission?: string | null }[];
  },
) {
  return measureOperation("action:updateApprovalPolicyAction", async () => {
    const actor = await requirePermission("settings", "write");
    validateActionArguments("updateApprovalPolicyAction", { targetType, policy });
    // Approval routing is governance: same rule as role permissions.
    if (actor.role !== "super_admin") throw new Error("Only super administrators can change approval policies");
    // Values are validated against the approval/permission constants inside updateApprovalPolicy.
    await updateApprovalPolicy(targetType as ApprovalTargetType, {
      ...policy,
      steps: policy.steps.map((step) => ({ ...step, approverMode: step.approverMode as ApproverMode })),
    });
    await createActivityLog({
      user_id: actor.id,
      action: "update",
      entity_type: "approval_policy",
      entity_id: targetType,
      details: { policy },
    });
    revalidatePath("/dashboard/settings/approvals");
    return { success: true };
  });
}
