"use server";
import { revalidatePath } from "next/cache";
import { requireFeatureEnabled } from "@platform/database";
import {
  generateSerialLabels,
  confirmSerialLabelPrinting,
  type SerialLabelInput,
} from "@platform/database/queries/stock-labels";
import {
  verifyGeneratedSerials,
  moveSerialsBetweenBins,
  type SerialBinMove,
} from "@platform/database/queries/serialized-stock";
import {
  fulfillSerializedOrder,
  returnSerializedOrder,
  type FulfillSerializedOrderLine,
  type ReturnSerializedOrderLine,
} from "@platform/database/queries/serialized-sales";
import { requirePermission } from "../../lib/auth";
import { validateActionArguments } from "../../lib/action-input";

/** Generate serial labels against real stock without creating phantom quantities. */
export async function generateSerialLabelsAction(input: SerialLabelInput) {
  validateActionArguments("generateSerialLabelsAction", { input });
  await requireFeatureEnabled("inventory");
  const actor = await requirePermission("inventory", "edit");
  const result = await generateSerialLabels(input, actor.id);
  revalidatePath("/dashboard/inventory");
  return result;
}

/** Record human operator confirmation of label physical print out. */
export async function confirmSerialLabelPrintingAction(input: { jobId: string }) {
  validateActionArguments("confirmSerialLabelPrintingAction", { input });
  await requireFeatureEnabled("inventory");
  const actor = await requirePermission("inventory", "edit");
  const result = await confirmSerialLabelPrinting(input.jobId, actor.id);
  revalidatePath("/dashboard/inventory");
  return result;
}

/** Verify printed serials via physical scanning before activating them for operations. */
export async function verifyGeneratedSerialsAction(input: { generationId: string; scannedCodes: string[] }) {
  validateActionArguments("verifyGeneratedSerialsAction", { input });
  await requireFeatureEnabled("inventory");
  const actor = await requirePermission("inventory", "edit");
  const result = await verifyGeneratedSerials(input.generationId, input.scannedCodes, actor.id);
  revalidatePath("/dashboard/inventory");
  return result;
}

/** Relocate individual serialized units between bins in the same warehouse. */
export async function moveSerialsBetweenBinsAction(input: SerialBinMove) {
  validateActionArguments("moveSerialsBetweenBinsAction", { input });
  await requireFeatureEnabled("inventory");
  const actor = await requirePermission("inventory", "edit");
  const result = await moveSerialsBetweenBins(input, actor.id);
  revalidatePath("/dashboard/inventory");
  return result;
}

/** Fulfill a sales order by assigning and consuming exact serial identities. */
export async function fulfillSerializedOrderAction(input: { orderId: string; lines: FulfillSerializedOrderLine[] }) {
  validateActionArguments("fulfillSerializedOrderAction", { input });
  await requireFeatureEnabled("orders");
  const actor = await requirePermission("orders", "edit");
  const result = await fulfillSerializedOrder(input.orderId, input.lines, actor.id);
  revalidatePath("/dashboard/orders");
  return result;
}

/** Return previously sold serialized items back to inventory with full traceability. */
export async function returnSerializedOrderAction(input: { orderId: string; lines: ReturnSerializedOrderLine[] }) {
  validateActionArguments("returnSerializedOrderAction", { input });
  await requireFeatureEnabled("orders");
  const actor = await requirePermission("orders", "edit");
  const result = await returnSerializedOrder(input.orderId, input.lines, actor.id);
  revalidatePath("/dashboard/orders");
  return result;
}
