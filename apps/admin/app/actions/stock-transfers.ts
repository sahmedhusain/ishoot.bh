"use server";
import { revalidatePath } from "next/cache";
import { requireFeatureEnabled } from "@platform/database";
import {
  closeSerialTransfer,
  reportMissingTransferUnits,
  requestSerialTransfer,
  approveSerialTransfer,
  dispatchSerialTransfer,
  receiveSerialTransfer,
} from "@platform/database/queries/stock-transfers";
import {
  previewStockHandover,
  acknowledgeStockHandover,
} from "@platform/database/queries/stock-handover";
import { requirePermission } from "../../lib/auth";
import { validateActionArguments } from "../../lib/action-input";

export async function requestSerialTransferAction(input: {
  sourceLocationId: string;
  transitLocationId: string;
  destinationLocationId: string;
  codes: string[];
  idempotencyKey: string;
}) {
  validateActionArguments("requestSerialTransferAction", { input });
  await requireFeatureEnabled("products");
  const actor = await requirePermission("inventory", "edit");
  const result = await requestSerialTransfer(input, actor.id);
  revalidatePath("/dashboard/inventory/transfers");
  return result;
}
export async function processSerialTransferAction(input: {
  allocationId: string;
  revision: number;
  idempotencyKey: string;
  operation: "approve" | "dispatch" | "receive" | "close";
  codes: string[];
}) {
  validateActionArguments("processSerialTransferAction", { input });
  await requireFeatureEnabled("products");
  const actor = await requirePermission(
    "inventory",
    ["approve", "close"].includes(input.operation) ? "approve" : "edit",
  );
  const result = await (input.operation === "close"
    ? closeSerialTransfer(input, actor.id)
    : input.operation === "approve"
      ? approveSerialTransfer(input, actor.id)
      : input.operation === "dispatch"
        ? dispatchSerialTransfer(input, actor.id)
        : receiveSerialTransfer(input, actor.id));
  revalidatePath("/dashboard/inventory/transfers");
  revalidatePath("/dashboard/inventory");
  return result;
}
export async function previewStockHandoverAction(input: {
  allocationId: string;
  revision: number;
  stage: "collection" | "receipt";
}) {
  validateActionArguments("previewStockHandoverAction", { input });
  await requireFeatureEnabled("products");
  const actor = await requirePermission("inventory", "edit");
  return previewStockHandover(input, actor.id);
}
export async function acknowledgeStockHandoverAction(input: {
  allocationId: string;
  revision: number;
  stage: "collection" | "receipt";
  manifestHash: string;
  signature: string;
}) {
  validateActionArguments("acknowledgeStockHandoverAction", { input });
  await requireFeatureEnabled("products");
  const actor = await requirePermission("inventory", "edit");
  const result = await acknowledgeStockHandover(input, actor.id);
  revalidatePath("/dashboard/inventory/transfers");
  return result;
}

export async function reportMissingTransferUnitsAction(input: {
  allocationId: string;
  revision: number;
  idempotencyKey: string;
  codes: string[];
  reason: string;
}) {
  validateActionArguments("reportMissingTransferUnitsAction", { input });
  await requireFeatureEnabled("products");
  const actor = await requirePermission("inventory", "edit");
  const result = await reportMissingTransferUnits(input, actor.id);
  revalidatePath("/dashboard/inventory/transfers");
  return result;
}
