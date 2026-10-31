"use server";
import { revalidatePath } from "next/cache";
import { requireFeatureEnabled } from "@platform/database";
import {
  saveRegister,
  saveDrawer,
  openRetailShift,
  closeRetailShift,
  openCashierSession,
  closeCashierSession,
  recordPaymentCollection,
  reversePaymentCollection,
  performRetailClosing,
  type RegisterInput,
  type DrawerInput,
  type OpenSessionInput,
  type CloseSessionInput,
  type PaymentCollectionInput,
  type RetailClosingInput,
} from "@platform/database/queries/retail";
import { requirePermission } from "../../lib/auth";
import { validateActionArguments } from "../../lib/action-input";

/** Create or update a retail point-of-sale register bound to a branch. */
export async function saveRegisterAction(input: RegisterInput) {
  validateActionArguments("saveRegisterAction", { input });
  await requireFeatureEnabled("finance");
  const actor = await requirePermission("payments", "edit");
  const result = await saveRegister(input, actor.id);
  revalidatePath("/dashboard/retail");
  return result;
}

/** Create or update a cash drawer associated with a retail register. */
export async function saveDrawerAction(input: DrawerInput) {
  validateActionArguments("saveDrawerAction", { input });
  await requireFeatureEnabled("finance");
  const actor = await requirePermission("payments", "edit");
  const result = await saveDrawer(input, actor.id);
  revalidatePath("/dashboard/retail");
  return result;
}

/** Open an operational retail shift for a branch. */
export async function openRetailShiftAction(input: { branchId: string }) {
  validateActionArguments("openRetailShiftAction", { input });
  await requireFeatureEnabled("finance");
  const actor = await requirePermission("payments", "edit");
  const result = await openRetailShift(input.branchId, actor.id);
  revalidatePath("/dashboard/retail");
  return result;
}

/** Close a retail shift once all child cashier sessions have concluded. */
export async function closeRetailShiftAction(input: { shiftId: string }) {
  validateActionArguments("closeRetailShiftAction", { input });
  await requireFeatureEnabled("finance");
  const actor = await requirePermission("payments", "edit");
  const result = await closeRetailShift(input.shiftId, actor.id);
  revalidatePath("/dashboard/retail");
  return result;
}

/** Start a cashier custody session on a drawer with an opening cash float. */
export async function openCashierSessionAction(input: OpenSessionInput) {
  validateActionArguments("openCashierSessionAction", { input });
  await requireFeatureEnabled("finance");
  const actor = await requirePermission("payments", "edit");
  const result = await openCashierSession(input, actor.id);
  revalidatePath("/dashboard/retail");
  return result;
}

/** Conclude a cashier session, comparing counted physical cash to expected collections. */
export async function closeCashierSessionAction(input: CloseSessionInput) {
  validateActionArguments("closeCashierSessionAction", { input });
  await requireFeatureEnabled("finance");
  const actor = await requirePermission("payments", "edit");
  const result = await closeCashierSession(input, actor.id);
  revalidatePath("/dashboard/retail");
  return result;
}

/** Record a cash, card, or digital payment collection against an active session or order. */
export async function recordPaymentCollectionAction(input: PaymentCollectionInput) {
  validateActionArguments("recordPaymentCollectionAction", { input });
  await requireFeatureEnabled("finance");
  const actor = await requirePermission("payments", "create");
  const result = await recordPaymentCollection(input, actor.id);
  revalidatePath("/dashboard/retail");
  return result;
}

/** Reverse a previously recorded payment collection with audit justification. */
export async function reversePaymentCollectionAction(input: { collectionId: string; reason: string }) {
  validateActionArguments("reversePaymentCollectionAction", { input });
  await requireFeatureEnabled("finance");
  const actor = await requirePermission("payments", "edit");
  const result = await reversePaymentCollection(input.collectionId, input.reason, actor.id);
  revalidatePath("/dashboard/retail");
  return result;
}

/** Execute a formal 5-level retail closing (drawer, session, shift, day, period) with immutable snapshot. */
export async function performRetailClosingAction(input: RetailClosingInput) {
  validateActionArguments("performRetailClosingAction", { input });
  await requireFeatureEnabled("finance");
  const actor = await requirePermission("payments", "approve");
  const result = await performRetailClosing(input, actor.id);
  revalidatePath("/dashboard/retail");
  return result;
}
