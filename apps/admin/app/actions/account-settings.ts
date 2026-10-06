"use server";
import { ROUTES } from "../../constants/routes";
import { validateActionArguments } from "../../lib/action-input";
import {
  measureOperation,
  runAtomicMutation,
  db,
  applyAccountChanges,
  createAccountChangeRequest,
  submitForApproval,
  cancelPendingApprovals,
  createActivityLog,
  type AccountChanges,
} from "@ishoot/database";
import { hasPermission, requireAuth } from "../../lib/auth";
import { revalidatePath } from "next/cache";

function revalidateAccount(userId: string, employeeId: string | null) {
  revalidatePath(ROUTES.users.list);
  revalidatePath(ROUTES.approvals());
  revalidatePath(ROUTES.finance.commissions());
  if (employeeId) revalidatePath(ROUTES.hr.employee(employeeId));
}

/**
 * Saves a person's account settings. People who manage users (admins) apply them at once; HR (employee editors)
 * file them for an admin's approval. Super Admin accounts are protected either way.
 */
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
  validateActionArguments("saveAccountSettingsAction", { userId, changes, reason });
  return measureOperation("action:saveAccountSettingsAction", async () => {
    const actor = await requireAuth();
    const [canManageUsers, canEditEmployees] = await Promise.all([hasPermission("users", "write"), hasPermission("employees", "edit")]);
    if (!canManageUsers && !canEditEmployees) throw new Error("You do not have permission to change account settings");
    const input = { ...changes, status: changes.status as AccountChanges["status"] };
    const employee = await db.employee.findFirst({ where: { userId }, select: { id: true } });

    if (canManageUsers) {
      const applied = await runAtomicMutation(async () => {
        await db.$queryRaw`SELECT pg_advisory_xact_lock(19041005)::text`;
        return applyAccountChanges(userId, input, actor.id);
      });
      revalidateAccount(userId, employee?.id ?? null);
      return { mode: "applied" as const, changed: Object.keys(applied.changes) };
    }

    const outcome = await runAtomicMutation(async () => {
      const request = await createAccountChangeRequest(userId, input, actor.id, reason);
      const approval = await submitForApproval({ targetType: "account_change", targetId: request.id, requesterId: actor.id, policySnapshot: { userId, fields: Object.keys(request.changes as object) } });
      await createActivityLog({ user_id: actor.id, action: "request", entity_type: "account_change", entity_id: request.id, details: { userId, changes: request.changes, approvalStatus: approval.status } });
      return approval;
    });
    revalidateAccount(userId, employee?.id ?? null);
    return { mode: outcome.status === "approved" ? ("applied" as const) : ("pending" as const), changed: [] as string[] };
  });
}

/** Withdraws an account change that is still waiting for approval (the person who filed it, or a user admin). */
export async function cancelAccountChangeAction(requestId: string) {
  validateActionArguments("cancelAccountChangeAction", { requestId });
  return measureOperation("action:cancelAccountChangeAction", async () => {
    const actor = await requireAuth();
    const request = await db.accountChangeRequest.findUniqueOrThrow({ where: { id: requestId }, select: { status: true, requestedById: true, userId: true } });
    if (request.status !== "pending") throw new Error("Only pending changes can be withdrawn");
    if (request.requestedById !== actor.id && !(await hasPermission("users", "write"))) throw new Error("Only the person who filed it can withdraw this change");
    await runAtomicMutation(async () => {
      await db.accountChangeRequest.update({ where: { id: requestId }, data: { status: "cancelled", decidedAt: new Date() } });
      await cancelPendingApprovals("account_change", requestId);
    });
    const employee = await db.employee.findFirst({ where: { userId: request.userId }, select: { id: true } });
    revalidateAccount(request.userId, employee?.id ?? null);
    return { success: true };
  });
}
