"use server";
import { revalidatePath } from "next/cache";
import {
  createActivityLog,
  deleteRecurringExpense,
  measureOperation,
  recordRecurringExpense,
  requireFeatureEnabled,
  runAtomicMutation,
  saveRecurringExpense,
  skipRecurringExpense,
  type RecurringExpenseInput,
} from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { validateActionArguments } from "../../lib/action-input";
import { requirePermission } from "../../lib/auth";

const refresh = () => {
  revalidatePath(ROUTES.expenses.recurring);
  revalidatePath(ROUTES.expenses.list());
  revalidatePath(ROUTES.finance.overview);
};

export async function saveRecurringExpenseAction(
  data: RecurringExpenseInput,
  recurringId?: string,
) {
  return measureOperation("action:saveRecurringExpenseAction", async () => {
    await requireFeatureEnabled("invoicing");
    const user = await requirePermission("expenses", "write");
    validateActionArguments("saveRecurringExpenseAction", {
      data,
      recurringId,
    });
    const saved = await runAtomicMutation(async () => {
      const saved = await saveRecurringExpense(data, user.id, recurringId);
      await createActivityLog({
        user_id: user.id,
        action: recurringId ? "update" : "create",
        entity_type: "recurring_expense",
        entity_id: saved.id,
        details: {
          title: saved.titleEn,
          amount: Number(saved.amount),
          frequency: saved.frequency,
          autoRecord: saved.autoRecord,
        },
      });
      return saved;
    });
    refresh();
    return { success: true, id: saved.id };
  });
}

export async function recordRecurringExpenseAction(
  recurringId: string,
  actual: {
    amount?: number;
    input_vat_amount?: number;
    receipt_url?: string;
    notes?: string;
  } = {},
) {
  return measureOperation("action:recordRecurringExpenseAction", async () => {
    await requireFeatureEnabled("invoicing");
    const user = await requirePermission("expenses", "write");
    validateActionArguments("recordRecurringExpenseAction", {
      recurringId,
      actual,
    });
    const result = await runAtomicMutation(async () => {
      const result = await recordRecurringExpense(recurringId, user.id, actual);
      await createActivityLog({
        user_id: user.id,
        action: "record",
        entity_type: "recurring_expense",
        entity_id: recurringId,
        details: result,
      });
      return result;
    });
    refresh();
    return { success: true, ...result };
  });
}

export async function skipRecurringExpenseAction(recurringId: string) {
  return measureOperation("action:skipRecurringExpenseAction", async () => {
    await requireFeatureEnabled("invoicing");
    const user = await requirePermission("expenses", "write");
    validateActionArguments("skipRecurringExpenseAction", { recurringId });
    const dueDate = await runAtomicMutation(async () => {
      const dueDate = await skipRecurringExpense(recurringId);
      await createActivityLog({
        user_id: user.id,
        action: "skip",
        entity_type: "recurring_expense",
        entity_id: recurringId,
        details: { dueDate },
      });
      return dueDate;
    });
    refresh();
    return { success: true, dueDate };
  });
}

export async function deleteRecurringExpenseAction(recurringId: string) {
  return measureOperation("action:deleteRecurringExpenseAction", async () => {
    await requireFeatureEnabled("invoicing");
    const user = await requirePermission("expenses", "delete");
    validateActionArguments("deleteRecurringExpenseAction", { recurringId });
    await runAtomicMutation(async () => {
      await deleteRecurringExpense(recurringId);
      await createActivityLog({
        user_id: user.id,
        action: "delete",
        entity_type: "recurring_expense",
        entity_id: recurringId,
        details: {},
      });
    });
    refresh();
    return { success: true };
  });
}
