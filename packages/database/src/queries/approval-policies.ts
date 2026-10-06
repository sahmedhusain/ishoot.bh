import { db, runAtomicMutation } from "../db";
import { APPROVAL_CONDITION_FIELDS, APPROVAL_TARGET_TYPES, APPROVER_MODES, type ApprovalTargetType, type ApproverMode } from "../constants/approvals";
import { ALL_ACTIONS, ALL_RESOURCES, ALL_ROLES } from "../constants/permissions";

export interface ApprovalPolicyStepInput {
  approverMode: ApproverMode;
  roleKey?: string | null;
  userId?: string | null;
  permission?: string | null;
  /** Conditions: the step applies only when the record reaches every value set here. */
  minAmount?: number | null;
  minDays?: number | null;
  minDiscountPercent?: number | null;
  /** Escalation: after this many hours at the step, add a role or person as approvers. */
  escalateAfterHours?: number | null;
  escalateMode?: "role" | "user" | null;
  escalateRoleKey?: string | null;
  escalateUserId?: string | null;
}

const num = (value: unknown) => (value == null ? null : Number(value));

export interface ApprovalPolicyView {
  targetType: ApprovalTargetType;
  enabled: boolean;
  allowSelfApproval: boolean;
  autoApproveRoles: string[];
  reminderAfterHours: number | null;
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
      reminderAfterHours: policy?.reminderAfterHours ?? null,
      steps: (policy?.steps ?? []).map((step) => ({
        order: step.order,
        approverMode: step.approverMode as ApproverMode,
        roleKey: step.roleKey,
        userId: step.userId,
        permission: step.permission,
        minAmount: num(step.minAmount),
        minDays: num(step.minDays),
        minDiscountPercent: num(step.minDiscountPercent),
        escalateAfterHours: step.escalateAfterHours,
        escalateMode: step.escalateMode as "role" | "user" | null,
        escalateRoleKey: step.escalateRoleKey,
        escalateUserId: step.escalateUserId,
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
  for (const [value, max] of [[step.minAmount, 1e11], [step.minDays, 9999], [step.minDiscountPercent, 100]] as const) {
    if (value != null && (!Number.isFinite(value) || value < 0 || value > max)) throw new Error("Step conditions must be positive numbers");
  }
  if (step.escalateAfterHours != null) {
    if (!Number.isInteger(step.escalateAfterHours) || step.escalateAfterHours < 1 || step.escalateAfterHours > 720)
      throw new Error("Escalate after 1 to 720 hours");
    if (step.escalateMode === "role" && !(ALL_ROLES as readonly string[]).includes(step.escalateRoleKey ?? ""))
      throw new Error("Choose a role to escalate to");
    if (step.escalateMode === "user" && !step.escalateUserId) throw new Error("Choose a person to escalate to");
    if (step.escalateMode !== "role" && step.escalateMode !== "user") throw new Error("Choose who to escalate to");
  }
}


export async function updateApprovalPolicy(
  targetType: ApprovalTargetType,
  input: Omit<ApprovalPolicyView, "targetType" | "steps" | "reminderAfterHours"> & { reminderAfterHours?: number | null; steps: ApprovalPolicyStepInput[] },
): Promise<void> {
  if (!(APPROVAL_TARGET_TYPES as readonly string[]).includes(targetType)) throw new Error("Unknown approval type");
  const reminderAfterHours = input.reminderAfterHours ?? null;
  if (reminderAfterHours != null && (!Number.isInteger(reminderAfterHours) || reminderAfterHours < 1 || reminderAfterHours > 720))
    throw new Error("Remind after 1 to 720 hours");
  const allowed = APPROVAL_CONDITION_FIELDS[targetType];
  for (const step of input.steps)
    for (const field of ["minAmount", "minDays", "minDiscountPercent"] as const)
      if (step[field] != null && !allowed.includes(field)) throw new Error("This condition does not apply to this request type");
  if (input.steps.length > 5) throw new Error("A policy can have at most five steps");
  if (input.enabled && input.steps.length === 0) throw new Error("An enabled policy needs at least one approval step");
  input.steps.forEach(validateStep);
  const autoApproveRoles = input.autoApproveRoles.filter((role) => (ALL_ROLES as readonly string[]).includes(role));
  if (input.steps.some((step) => step.approverMode === "user" || step.escalateMode === "user")) {
    const ids = input.steps.flatMap((step) => [
      ...(step.approverMode === "user" ? [step.userId!] : []),
      ...(step.escalateMode === "user" && step.escalateAfterHours != null ? [step.escalateUserId!] : []),
    ]);
    const active = await db.user.count({ where: { id: { in: ids }, isActive: true } });
    if (active !== new Set(ids).size) throw new Error("Choose active users for user steps");
  }

  await runAtomicMutation(async () => {
    const policy = await db.approvalPolicy.upsert({
      where: { targetType },
      update: { enabled: input.enabled, allowSelfApproval: input.allowSelfApproval, autoApproveRoles, reminderAfterHours },
      create: { targetType, enabled: input.enabled, allowSelfApproval: input.allowSelfApproval, autoApproveRoles, reminderAfterHours },
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
          minAmount: step.minAmount ?? null,
          minDays: step.minDays ?? null,
          minDiscountPercent: step.minDiscountPercent ?? null,
          escalateAfterHours: step.escalateAfterHours ?? null,
          escalateMode: step.escalateAfterHours != null ? step.escalateMode ?? null : null,
          escalateRoleKey: step.escalateAfterHours != null && step.escalateMode === "role" ? step.escalateRoleKey ?? null : null,
          escalateUserId: step.escalateAfterHours != null && step.escalateMode === "user" ? step.escalateUserId ?? null : null,
        })),
      });
    }
  });
}
