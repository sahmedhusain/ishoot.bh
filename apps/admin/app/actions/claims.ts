"use server";
import { getTranslations, formatMessage } from "@platform/locales";
import { ROUTES } from "../../constants/routes";
import {
  measureOperation,
  runAtomicMutation,
  createExpenseClaim,
  scheduleExpenseClaim,
  payExpenseClaim,
  cancelExpenseClaim,
  submitForApproval,
  createActivityLog,
  createNotification,
} from "@platform/database";
import { revalidatePath } from "next/cache";
import { validateActionArguments } from "../../lib/action-input";
import { requirePermission } from "../../lib/auth";

function refresh() {
  revalidatePath(ROUTES.claims.list());
  revalidatePath(ROUTES.expenses.list());
  revalidatePath(ROUTES.approvals());
}

export async function submitExpenseClaimAction(data: {
  amount: number;
  currency?: string;
  expenseDate: string;
  reason: string;
  categoryId?: string | null;
  dealId?: string | null;
  invoiceId?: string | null;
  calendarEventId?: string | null;
  receiptUrl: string;
}) {
  return measureOperation("action:submitExpenseClaimAction", async () => {
    const user = await requirePermission("self_service", "create");
    validateActionArguments("submitExpenseClaimAction", { data });
    const result = await runAtomicMutation(async () => {
      const claim = await createExpenseClaim(data, user.id);
      const approval = await submitForApproval({
        targetType: "expense_claim",
        targetId: claim.id,
        requesterId: user.id,
        policySnapshot: {
          amount: claim.amount,
          currency: claim.currency,
          claimNumber: claim.claimNumber,
        },
      });
      await createActivityLog({
        user_id: user.id,
        action: "create",
        entity_type: "expense_claim",
        entity_id: claim.id,
        details: { amount: claim.amount, currency: claim.currency },
      });
      return { claim, approvalStatus: approval.status };
    });
    refresh();
    return { success: true, ...result };
  });
}

export async function cancelExpenseClaimAction(id: string) {
  return measureOperation("action:cancelExpenseClaimAction", async () => {
    const user = await requirePermission("self_service", "create");
    validateActionArguments("cancelExpenseClaimAction", { id });
    const claim = await runAtomicMutation(async () => {
      const claim = await cancelExpenseClaim(id, user.id);
      await createActivityLog({
        user_id: user.id,
        action: "cancel",
        entity_type: "expense_claim",
        entity_id: id,
      });
      return claim;
    });
    refresh();
    return { success: true, claim };
  });
}

export async function scheduleExpenseClaimAction(
  id: string,
  payOn?: string | null,
) {
  return measureOperation("action:scheduleExpenseClaimAction", async () => {
    const user = await requirePermission("expenses", "write");
    validateActionArguments("scheduleExpenseClaimAction", { id, payOn });
    const claim = await runAtomicMutation(async () => {
      const claim = await scheduleExpenseClaim(id, user.id, payOn);
      await createActivityLog({
        user_id: user.id,
        action: "schedule",
        entity_type: "expense_claim",
        entity_id: id,
        details: { payOn: payOn ?? null },
      });
      const kind = claim.scheduledForDate ? "scheduledOn" : "scheduled";
      const params = {
        number: claim.claimNumber,
        date: claim.scheduledForDate ?? "",
      };
      const copy = getTranslations("en").admin.claims.notifications[kind];
      await createNotification({
        user_id: claim.claimantId,
        title: copy.title,
        message: formatMessage(copy.message, params),
        message_key: `claims.notifications.${kind}`,
        message_params: params,
        type: "info",
        entity_type: "expense_claim",
        entity_id: id,
      });
      return claim;
    });
    refresh();
    return { success: true, claim };
  });
}

export async function payExpenseClaimAction(
  id: string,
  payment: {
    method: string;
    reference?: string | null;
    categoryId?: string | null;
  },
) {
  return measureOperation("action:payExpenseClaimAction", async () => {
    const user = await requirePermission("expenses", "write");
    validateActionArguments("payExpenseClaimAction", { id, payment });
    const claim = await runAtomicMutation(async () => {
      const claim = await payExpenseClaim(id, user.id, payment);
      await createActivityLog({
        user_id: user.id,
        action: "pay",
        entity_type: "expense_claim",
        entity_id: id,
        details: {
          method: payment.method,
          reference: payment.reference ?? null,
          expenseId: claim.expenseId,
        },
      });
      const params = {
        number: claim.claimNumber,
        currency: claim.currency,
        amount: claim.amount.toFixed(3),
      };
      const copy = getTranslations("en").admin.claims.notifications.paid;
      await createNotification({
        user_id: claim.claimantId,
        title: copy.title,
        message: formatMessage(copy.message, params),
        message_key: "claims.notifications.paid",
        message_params: params,
        type: "success",
        entity_type: "expense_claim",
        entity_id: id,
      });
      return claim;
    });
    refresh();
    if (claim.deal) revalidatePath(ROUTES.crm.deal(claim.deal.id));
    return { success: true, claim };
  });
}
