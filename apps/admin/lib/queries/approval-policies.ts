import { serverMessages } from "@platform/locales";
import { runAtomicMutation } from "../api/atomic";
import { deleteTableRow, listTableRows, upsertTableRow } from "../api/tables";
import {
  APPROVAL_CONDITION_FIELDS,
  APPROVAL_TARGET_TYPES,
  APPROVER_MODES,
  type ApprovalTargetType,
  type ApproverMode,
} from "../constants/approvals";
import {
  ALL_ACTIONS,
  ALL_RESOURCES,
  ALL_ROLES,
} from "../constants/permissions";

export interface ApprovalPolicyStepInput {
  approverMode: ApproverMode;
  roleKey?: string | null;
  userId?: string | null;
  permission?: string | null;
  minAmount?: number | null;
  minDays?: number | null;
  minDiscountPercent?: number | null;
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

export async function listApprovalPolicies(): Promise<ApprovalPolicyView[]> {
  const [stored, allSteps] = await Promise.all([
    listTableRows<Record<string, any>>("system", "approval_policy"),
    listTableRows<Record<string, any>>("system", "approval_policy_step"),
  ]);
  const byType = new Map<string, any>(stored.map((policy) => [String(policy.targetType), policy]));
  return APPROVAL_TARGET_TYPES.map((targetType) => {
    const policy = byType.get(targetType);
    const steps = policy
      ? allSteps
          .filter((s) => s.policyId === policy.id)
          .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
      : [];
    return {
      targetType,
      enabled: policy?.enabled ?? true,
      allowSelfApproval: policy?.allowSelfApproval ?? false,
      autoApproveRoles: Array.isArray(policy?.autoApproveRoles) ? policy.autoApproveRoles : [],
      reminderAfterHours: policy?.reminderAfterHours ?? null,
      steps: steps.map((step) => ({
        order: Number(step.order ?? 0),
        approverMode: step.approverMode as ApproverMode,
        roleKey: step.roleKey ?? null,
        userId: step.userId ?? null,
        permission: step.permission ?? null,
        minAmount: num(step.minAmount),
        minDays: num(step.minDays),
        minDiscountPercent: num(step.minDiscountPercent),
        escalateAfterHours: step.escalateAfterHours ?? null,
        escalateMode: (step.escalateMode as "role" | "user" | null) ?? null,
        escalateRoleKey: step.escalateRoleKey ?? null,
        escalateUserId: step.escalateUserId ?? null,
      })),
    };
  });
}

function validateStep(step: ApprovalPolicyStepInput) {
  if (!(APPROVER_MODES as readonly string[]).includes(step.approverMode))
    throw new Error(serverMessages.invalidApproverType);
  if (
    step.approverMode === "role" &&
    !(ALL_ROLES as readonly string[]).includes(step.roleKey ?? "")
  )
    throw new Error(serverMessages.chooseARoleForThisStep);
  if (step.approverMode === "user" && !step.userId)
    throw new Error(serverMessages.chooseAUserForThisStep);
  if (step.approverMode === "permission") {
    const [resource, action] = (step.permission ?? "").split(":");
    if (
      !(ALL_RESOURCES as readonly string[]).includes(resource) ||
      !(ALL_ACTIONS as readonly string[]).includes(action)
    )
      throw new Error(serverMessages.chooseAPermissionForThisStep);
  }
  for (const [value, max] of [
    [step.minAmount, 1e11],
    [step.minDays, 9999],
    [step.minDiscountPercent, 100],
  ] as const) {
    if (value != null && (!Number.isFinite(value) || value < 0 || value > max))
      throw new Error(serverMessages.stepConditionsMustBePositiveNumbers);
  }
  if (step.escalateAfterHours != null) {
    if (
      !Number.isInteger(step.escalateAfterHours) ||
      step.escalateAfterHours < 1 ||
      step.escalateAfterHours > 720
    )
      throw new Error(serverMessages.escalateAfter1To720Hours);
    if (
      step.escalateMode === "role" &&
      !(ALL_ROLES as readonly string[]).includes(step.escalateRoleKey ?? "")
    )
      throw new Error(serverMessages.chooseARoleToEscalateTo);
    if (step.escalateMode === "user" && !step.escalateUserId)
      throw new Error(serverMessages.chooseAPersonToEscalateTo);
    if (step.escalateMode !== "role" && step.escalateMode !== "user")
      throw new Error(serverMessages.chooseWhoToEscalateTo);
  }
}

export async function updateApprovalPolicy(
  targetType: ApprovalTargetType,
  input: Omit<
    ApprovalPolicyView,
    "targetType" | "steps" | "reminderAfterHours"
  > & { reminderAfterHours?: number | null; steps: ApprovalPolicyStepInput[] },
): Promise<void> {
  if (!(APPROVAL_TARGET_TYPES as readonly string[]).includes(targetType))
    throw new Error(serverMessages.unknownApprovalType);
  const reminderAfterHours = input.reminderAfterHours ?? null;
  if (
    reminderAfterHours != null &&
    (!Number.isInteger(reminderAfterHours) ||
      reminderAfterHours < 1 ||
      reminderAfterHours > 720)
  )
    throw new Error(serverMessages.remindAfter1To720Hours);
  const allowed = APPROVAL_CONDITION_FIELDS[targetType];
  for (const step of input.steps)
    for (const field of ["minAmount", "minDays", "minDiscountPercent"] as const)
      if (step[field] != null && !allowed.includes(field))
        throw new Error(serverMessages.thisConditionDoesNotApplyToThis);
  if (input.steps.length > 5)
    throw new Error(serverMessages.aPolicyCanHaveAtMostFive);
  if (input.enabled && input.steps.length === 0)
    throw new Error(serverMessages.anEnabledPolicyNeedsAtLeastOne);
  input.steps.forEach(validateStep);
  const autoApproveRoles = input.autoApproveRoles.filter((role) =>
    (ALL_ROLES as readonly string[]).includes(role),
  );
  if (
    input.steps.some(
      (step) => step.approverMode === "user" || step.escalateMode === "user",
    )
  ) {
    const ids = new Set(
      input.steps.flatMap((step) => [
        ...(step.approverMode === "user" ? [step.userId!] : []),
        ...(step.escalateMode === "user" && step.escalateAfterHours != null
          ? [step.escalateUserId!]
          : []),
      ]),
    );
    const users = await listTableRows<Record<string, any>>("identity", "user");
    const activeCount = users.filter((u) => u.isActive && ids.has(String(u.id))).length;
    if (activeCount !== ids.size)
      throw new Error(serverMessages.chooseActiveUsersForUserSteps);
  }

  await runAtomicMutation(async () => {
    const [policies, existingSteps] = await Promise.all([
      listTableRows<Record<string, any>>("system", "approval_policy"),
      listTableRows<Record<string, any>>("system", "approval_policy_step"),
    ]);
    const existing = policies.find((p) => p.targetType === targetType);
    const policy = await upsertTableRow<Record<string, any>>("system", "approval_policy", {
      id: existing?.id || crypto.randomUUID(),
      targetType,
      enabled: input.enabled,
      allowSelfApproval: input.allowSelfApproval,
      autoApproveRoles,
      reminderAfterHours,
    });
    for (const s of existingSteps) {
      if (s.policyId === policy.id) {
        await deleteTableRow("system", "approval_policy_step", String(s.id));
      }
    }
    for (let index = 0; index < input.steps.length; index++) {
      const step = input.steps[index];
      await upsertTableRow("system", "approval_policy_step", {
        id: crypto.randomUUID(),
        policyId: policy.id,
        order: index + 1,
        approverMode: step.approverMode,
        roleKey: step.approverMode === "role" ? (step.roleKey ?? null) : null,
        userId: step.approverMode === "user" ? (step.userId ?? null) : null,
        permission:
          step.approverMode === "permission"
            ? (step.permission ?? null)
            : null,
        minAmount: step.minAmount ?? null,
        minDays: step.minDays ?? null,
        minDiscountPercent: step.minDiscountPercent ?? null,
        escalateAfterHours: step.escalateAfterHours ?? null,
        escalateMode:
          step.escalateAfterHours != null ? (step.escalateMode ?? null) : null,
        escalateRoleKey:
          step.escalateAfterHours != null && step.escalateMode === "role"
            ? (step.escalateRoleKey ?? null)
            : null,
        escalateUserId:
          step.escalateAfterHours != null && step.escalateMode === "user"
            ? (step.escalateUserId ?? null)
            : null,
      });
    }
  });
}
