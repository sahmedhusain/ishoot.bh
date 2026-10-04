import { db, runAtomicMutation } from "../db";
import { APPROVAL_TARGET_TYPES, APPROVER_MODES, type ApprovalTargetType, type ApproverMode } from "../constants/approvals";
import { ALL_ACTIONS, ALL_RESOURCES, ALL_ROLES } from "../constants/permissions";

export interface ApprovalPolicyStepInput {
  approverMode: ApproverMode;
  roleKey?: string | null;
  userId?: string | null;
  permission?: string | null;
}

export interface ApprovalPolicyView {
  targetType: ApprovalTargetType;
  enabled: boolean;
  allowSelfApproval: boolean;
  autoApproveRoles: string[];
  steps: Array<ApprovalPolicyStepInput & { order: number }>;
}

/** Every target type, including ones without a stored policy (shown as enabled with no steps). */
export async function listApprovalPolicies(): Promise<ApprovalPolicyView[]> {
  const stored = await db.approvalPolicy.findMany({ include: { steps: { orderBy: { order: "asc" } } } });
  const byType = new Map(stored.map((policy) => [policy.targetType, policy]));
  return APPROVAL_TARGET_TYPES.map((targetType) => {
    const policy = byType.get(targetType);
    return {
      targetType,
      enabled: policy?.enabled ?? true,
      allowSelfApproval: policy?.allowSelfApproval ?? false,
      autoApproveRoles: policy?.autoApproveRoles ?? [],
      steps: (policy?.steps ?? []).map((step) => ({
        order: step.order,
        approverMode: step.approverMode as ApproverMode,
        roleKey: step.roleKey,
        userId: step.userId,
        permission: step.permission,
      })),
    };
  });
}

function validateStep(step: ApprovalPolicyStepInput) {
  if (!(APPROVER_MODES as readonly string[]).includes(step.approverMode)) throw new Error("Invalid approver type");
  if (step.approverMode === "role" && !(ALL_ROLES as readonly string[]).includes(step.roleKey ?? ""))
    throw new Error("Choose a role for this step");
  if (step.approverMode === "user" && !step.userId) throw new Error("Choose a user for this step");
  if (step.approverMode === "permission") {
    const [resource, action] = (step.permission ?? "").split(":");
    if (!(ALL_RESOURCES as readonly string[]).includes(resource) || !(ALL_ACTIONS as readonly string[]).includes(action))
      throw new Error("Choose a permission for this step");
  }
}

export async function updateApprovalPolicy(
  targetType: ApprovalTargetType,
  input: Omit<ApprovalPolicyView, "targetType" | "steps"> & { steps: ApprovalPolicyStepInput[] },
): Promise<void> {
  if (!(APPROVAL_TARGET_TYPES as readonly string[]).includes(targetType)) throw new Error("Unknown approval type");
  if (input.steps.length > 5) throw new Error("A policy can have at most five steps");
  if (input.enabled && input.steps.length === 0) throw new Error("An enabled policy needs at least one approval step");
  input.steps.forEach(validateStep);
  const autoApproveRoles = input.autoApproveRoles.filter((role) => (ALL_ROLES as readonly string[]).includes(role));
  if (input.steps.some((step) => step.approverMode === "user")) {
    const ids = input.steps.filter((step) => step.approverMode === "user").map((step) => step.userId!);
    const active = await db.user.count({ where: { id: { in: ids }, isActive: true } });
    if (active !== new Set(ids).size) throw new Error("Choose active users for user steps");
  }

  await runAtomicMutation(async () => {
    const policy = await db.approvalPolicy.upsert({
      where: { targetType },
      update: { enabled: input.enabled, allowSelfApproval: input.allowSelfApproval, autoApproveRoles },
      create: { targetType, enabled: input.enabled, allowSelfApproval: input.allowSelfApproval, autoApproveRoles },
    });
    await db.approvalPolicyStep.deleteMany({ where: { policyId: policy.id } });
    if (input.steps.length) {
      await db.approvalPolicyStep.createMany({
        data: input.steps.map((step, index) => ({
          policyId: policy.id,
          order: index + 1,
          approverMode: step.approverMode,
          roleKey: step.approverMode === "role" ? step.roleKey ?? null : null,
          userId: step.approverMode === "user" ? step.userId ?? null : null,
          permission: step.approverMode === "permission" ? step.permission ?? null : null,
        })),
      });
    }
  });
}
