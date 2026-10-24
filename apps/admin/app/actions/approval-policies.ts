"use server";
import { serverMessages } from "@platform/locales";
import { ROUTES } from "../../constants/routes";
import { measureOperation, updateApprovalPolicy, createActivityLog, type ApprovalTargetType, type ApproverMode } from "@platform/database";
import { revalidatePath } from "next/cache";
import { validateActionArguments } from "../../lib/action-input";
import { requirePermission } from "../../lib/auth";

export async function updateApprovalPolicyAction(
  targetType: string,
  policy: {
    enabled: boolean;
    allowSelfApproval: boolean;
    autoApproveRoles: string[];
    reminderAfterHours?: number | null;
    steps: {
      approverMode: string;
      roleKey?: string | null;
      userId?: string | null;
      permission?: string | null;
      minAmount?: number | null;
      minDays?: number | null;
      minDiscountPercent?: number | null;
      escalateAfterHours?: number | null;
      escalateMode?: string | null;
      escalateRoleKey?: string | null;
      escalateUserId?: string | null;
    }[];
  },
) {
  return measureOperation("action:updateApprovalPolicyAction", async () => {
    const actor = await requirePermission("settings", "write");
    validateActionArguments("updateApprovalPolicyAction", { targetType, policy });
    // Approval routing is governance: same rule as role permissions.
    if (actor.role !== "super_admin") throw new Error(serverMessages.onlySuperAdministratorsCanChangeApprovalPolicies);
    // Values are validated against the approval/permission constants inside updateApprovalPolicy.
    await updateApprovalPolicy(targetType as ApprovalTargetType, {
      ...policy,
      steps: policy.steps.map((step) => ({
        ...step,
        approverMode: step.approverMode as ApproverMode,
        escalateMode: step.escalateMode === "role" || step.escalateMode === "user" ? step.escalateMode : null,
      })),
    });
    await createActivityLog({
      user_id: actor.id,
      action: "update",
      entity_type: "approval_policy",
      entity_id: targetType,
      details: { policy },
    });
    revalidatePath(ROUTES.settings.approvals);
    return { success: true };
  });
}
