"use server";
import { revalidatePath } from "next/cache";
import { requireFeatureEnabled } from "@platform/database";
import {
  createStockPackage,
  packSerialsIntoPackage,
  sealStockPackage,
  moveStockPackage,
  unpackStockPackage,
  type PackageInput,
} from "@platform/database/queries/packages";
import { requirePermission } from "../../lib/auth";
import { validateActionArguments } from "../../lib/action-input";

export async function createStockPackageAction(input: PackageInput) {
  validateActionArguments("createStockPackageAction", { input });
  await requireFeatureEnabled("inventory");
  const actor = await requirePermission("inventory", "edit");
  const result = await createStockPackage(input, actor.id);
  revalidatePath("/dashboard/inventory/packages");
  return result;
}

export async function packSerialsAction(input: { packageId: string; serialCodes: string[] }) {
  validateActionArguments("packSerialsAction", { input });
  await requireFeatureEnabled("inventory");
  const actor = await requirePermission("inventory", "edit");
  const result = await packSerialsIntoPackage(input.packageId, input.serialCodes, actor.id);
  revalidatePath("/dashboard/inventory/packages");
  return result;
}

export async function sealStockPackageAction(input: { packageId: string; sealNumber: string }) {
  validateActionArguments("sealStockPackageAction", { input });
  await requireFeatureEnabled("inventory");
  const actor = await requirePermission("inventory", "edit");
  const result = await sealStockPackage(input.packageId, input.sealNumber, actor.id);
  revalidatePath("/dashboard/inventory/packages");
  return result;
}

export async function moveStockPackageAction(input: { packageId: string; targetLocationId: string }) {
  validateActionArguments("moveStockPackageAction", { input });
  await requireFeatureEnabled("inventory");
  const actor = await requirePermission("inventory", "edit");
  const result = await moveStockPackage(input.packageId, input.targetLocationId, actor.id);
  revalidatePath("/dashboard/inventory/packages");
  return result;
}

export async function unpackStockPackageAction(input: { packageId: string }) {
  validateActionArguments("unpackStockPackageAction", { input });
  await requireFeatureEnabled("inventory");
  const actor = await requirePermission("inventory", "edit");
  const result = await unpackStockPackage(input.packageId, actor.id);
  revalidatePath("/dashboard/inventory/packages");
  return result;
}
