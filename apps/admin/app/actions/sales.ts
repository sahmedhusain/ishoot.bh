"use server";
import { serverMessages } from "@platform/locales";
import { ROUTES } from "../../constants/routes";
import {
  measureOperation,
  runAtomicMutation,
  reassignSalesOwner,
  setUserCommissionRate,
  recordCommissionPayout,
  createActivityLog,
} from "@platform/database";
import { revalidatePath } from "next/cache";
import { validateActionArguments } from "../../lib/action-input";
import { hasPermission, requireAuth, requirePermission } from "../../lib/auth";

export async function reassignSalesOwnerAction(
  entityType: "quotation" | "invoice",
  id: string,
  toUserId: string,
  reason?: string | null,
) {
  return measureOperation("action:reassignSalesOwnerAction", async () => {
    const actor = await requireAuth();
    validateActionArguments("reassignSalesOwnerAction", {
      entityType,
      id,
      toUserId,
      reason,
    });
    const resource = entityType === "quotation" ? "quotations" : "invoices";
    if (
      !(await hasPermission(resource, "assign")) &&
      !(await hasPermission(resource, "edit")) &&
      !(await hasPermission("deals", "assign"))
    )
      throw new Error(serverMessages.youDoNotHavePermissionToChange2);
    const result = await runAtomicMutation(async () => {
      const result = await reassignSalesOwner(
        entityType,
        id,
        toUserId,
        actor.id,
        reason,
      );
      if (result.changed)
        await createActivityLog({
          user_id: actor.id,
          action: "reassign",
          entity_type: entityType,
          entity_id: id,
          details: { salesOwnerId: toUserId, reason: reason ?? null },
        });
      return result;
    });
    revalidatePath(
      entityType === "quotation"
        ? ROUTES.quotations.detail(id)
        : ROUTES.invoices.detail(id),
    );
    revalidatePath(ROUTES.finance.commissions());
    return { success: true, ...result };
  });
}

export async function updateUserCommissionRateAction(
  id: string,
  rate: number | null,
) {
  return measureOperation("action:updateUserCommissionRateAction", async () => {
    const actor = await requirePermission("users", "write");
    validateActionArguments("updateUserCommissionRateAction", { id, rate });
    const result = await runAtomicMutation(async () => {
      if (id === "super-admin" || id === "usr_super_admin")
        throw new Error(serverMessages.superAdminAccountsAreProtectedAndCannot);
      const result = await setUserCommissionRate(id, rate);
      await createActivityLog({
        user_id: actor.id,
        action: "update",
        entity_type: "user",
        entity_id: id,
        details: {
          commissionRatePercent: {
            to: result.commission_rate_percent,
          },
        },
      });
      return result;
    });
    revalidatePath(ROUTES.users.list);
    revalidatePath(ROUTES.finance.commissions());
    return { success: true, ...result };
  });
}

export async function recordCommissionPayoutAction(
  userId: string,
  month: string,
) {
  return measureOperation("action:recordCommissionPayoutAction", async () => {
    const actor = await requirePermission("expenses", "write");
    validateActionArguments("recordCommissionPayoutAction", { userId, month });
    const payout = await runAtomicMutation(async () => {
      const payout = await recordCommissionPayout(userId, month, actor.id);
      await createActivityLog({
        user_id: actor.id,
        action: "create",
        entity_type: "commission_payout",
        entity_id: payout.id,
        details: { userId, month, amount: Number(payout.amount) },
      });
      return payout;
    });
    revalidatePath(ROUTES.finance.commissions());
    revalidatePath(ROUTES.expenses.list());
    return { success: true, payoutId: payout.id };
  });
}
