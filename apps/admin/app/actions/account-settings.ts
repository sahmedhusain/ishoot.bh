"use server";
import { serverMessages } from "@platform/locales";
import { ROUTES } from "../../constants/routes";
import { validateActionArguments } from "../../lib/action-input";
import {
  measureOperation,
  runAtomicMutation,
  applyAccountChanges,
  createAccountChangeRequest,
  submitForApproval,
  cancelPendingApprovals,
  createActivityLog,
  type AccountChanges,
} from "@platform/database";
import { listEmployees } from "@platform/api-client";
import { hasPermission, requireAuth } from "../../lib/auth";
import { revalidatePath } from "next/cache";

function revalidateAccount(userId: string, employeeId: string | null) {
  revalidatePath(ROUTES.users.list);
  revalidatePath(ROUTES.approvals());
  revalidatePath(ROUTES.finance.commissions());
  if (employeeId) revalidatePath(ROUTES.hr.employee(employeeId));
}

export async function saveAccountSettingsAction(
  userId: string,
  changes: {
    role?: string;
    managerId?: string | null;
    status?: string;
    statusReason?: string | null;
    discountLimitPercent?: number | null;
    commissionRatePercent?: number | null;
  },
  reason?: string | null,
) {
  validateActionArguments("saveAccountSettingsAction", {
    userId,
    changes,
    reason,
  });
  return measureOperation("action:saveAccountSettingsAction", async () => {
    const actor = await requireAuth();
    const [canManageUsers, canEditEmployees] = await Promise.all([
      hasPermission("users", "write"),
      hasPermission("employees", "edit"),
    ]);
    if (!canManageUsers && !canEditEmployees)
      throw new Error(serverMessages.youDoNotHavePermissionToChange);
    const input = {
      ...changes,
      status: changes.status as AccountChanges["status"],
    };
    const employees = await listEmployees().catch(() => []);
    const employee = employees.find((e) => (e as any).userId === userId);

    if (canManageUsers) {
      const applied = await runAtomicMutation(async () => {
        return applyAccountChanges(userId, input, actor.id);
      });
      revalidateAccount(userId, employee?.id ?? null);
      return {
        mode: "applied" as const,
        changed: Object.keys(applied.changes),
      };
    }

    const outcome = await runAtomicMutation(async () => {
      const request = await createAccountChangeRequest(
        userId,
        input,
        actor.id,
        reason,
      );
      const approval = await submitForApproval({
        targetType: "account_change",
        targetId: request.id,
        requesterId: actor.id,
        policySnapshot: {
          userId,
          fields: Object.keys(request.changes as object),
        },
      });
      await createActivityLog({
        user_id: actor.id,
        action: "request",
        entity_type: "account_change",
        entity_id: request.id,
        details: {
          userId,
          changes: request.changes,
          approvalStatus: approval.status,
        },
      });
      return approval;
    });
    revalidateAccount(userId, employee?.id ?? null);
    return {
      mode:
        outcome.status === "approved"
          ? ("applied" as const)
          : ("pending" as const),
      changed: [] as string[],
    };
  });
}

export async function cancelAccountChangeAction(requestId: string) {
  validateActionArguments("cancelAccountChangeAction", { requestId });
  return measureOperation("action:cancelAccountChangeAction", async () => {
    const actor = await requireAuth();
    await runAtomicMutation(async () => {
      await cancelPendingApprovals("account_change", requestId);
    });
    revalidateAccount(actor.id, null);
    return { success: true };
  });
}
