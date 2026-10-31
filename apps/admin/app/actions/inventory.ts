"use server";
import { revalidatePath } from "next/cache";
import {
  addCountLine,
  approveStockCount,
  changeStock,
  createActivityLog,
  createStockCount,
  db,
  findByCode,
  measureOperation,
  recordCountedQuantities,
  requireFeatureEnabled,
  saveLocation,
  saveWarehouse,
  setReorderPoint,
  setStockCountStatus,
  transferStock,
  type LocationInput,
  type StockChangeInput,
  type StockCountInput,
  type TransferInput,
  type WarehouseInput,
} from "@platform/database";
import { requireStockLocationAccess, requireWarehouseAccess, requireStockCountAccess, requireBranchAccess } from "@platform/database/queries/branches";
import { ROUTES } from "../../constants/routes";
import { requirePermission } from "../../lib/auth";
import { validateActionArguments } from "../../lib/action-input";
import { notifyLowStock } from "../../lib/low-stock";

function revalidateStock(productId?: string) {
  revalidatePath(ROUTES.inventory.stock);
  revalidatePath(ROUTES.inventory.movements());
  if (productId) revalidatePath(ROUTES.products.detail(productId));
}

/** Receives, adjusts or writes off stock at a location (the stock page's "Change stock"). */
export async function changeStockAction(input: StockChangeInput) {
  return measureOperation("action:changeStockAction", async () => {
    await requireFeatureEnabled("products");
    const user = await requirePermission("inventory", "edit");
    validateActionArguments("changeStockAction", { input });
    await requireStockLocationAccess(user.id, input.locationId, true);
    const low = await changeStock(input, user.id);
    await createActivityLog({
      user_id: user.id,
      action: "update",
      entity_type: "stock",
      entity_id: input.productId,
      details: {
        type: input.type,
        quantity: input.quantity,
        locationId: input.locationId,
      },
    });
    await notifyLowStock(low);
    revalidateStock(input.productId);
    return { success: true };
  });
}

export async function transferStockAction(input: TransferInput) {
  return measureOperation("action:transferStockAction", async () => {
    await requireFeatureEnabled("products");
    const user = await requirePermission("inventory", "edit");
    validateActionArguments("transferStockAction", { input });
    await requireStockLocationAccess(user.id, input.fromLocationId, true);
    await requireStockLocationAccess(user.id, input.toLocationId, true);
    const low = await transferStock(input, user.id);
    await createActivityLog({
      user_id: user.id,
      action: "update",
      entity_type: "stock",
      entity_id: input.productId,
      details: {
        type: "transfer",
        quantity: input.quantity,
        from: input.fromLocationId,
        to: input.toLocationId,
      },
    });
    await notifyLowStock(low);
    revalidateStock(input.productId);
    return { success: true };
  });
}

/** Saves the reorder levels of a product's items (one per variant, or one for the product). */
export async function saveReorderPointsAction(
  productId: string,
  levels: {
    variantKey: string;
    reorderPoint: string;
    reorderQuantity: string;
  }[],
) {
  return measureOperation("action:saveReorderPointsAction", async () => {
    await requireFeatureEnabled("products");
    const user = await requirePermission("inventory", "edit");
    validateActionArguments("saveReorderPointsAction", { productId, levels });
    const value = (text: string) => (text.trim() === "" ? null : Number(text));
    for (const level of levels)
      await setReorderPoint(
        productId,
        level.variantKey,
        value(level.reorderPoint),
        value(level.reorderQuantity),
      );
    await createActivityLog({
      user_id: user.id,
      action: "update",
      entity_type: "product",
      entity_id: productId,
      details: { reorderLevels: levels.length },
    });
    revalidateStock(productId);
    return { success: true };
  });
}

export async function saveWarehouseAction(input: WarehouseInput) {
  return measureOperation("action:saveWarehouseAction", async () => {
    await requireFeatureEnabled("products");
    const user = await requirePermission(
      "inventory",
      input.id ? "edit" : "create",
    );
    validateActionArguments("saveWarehouseAction", { input });
    const existing = input.id ? await requireWarehouseAccess(user.id, input.id, "edit") : null;
    await requireBranchAccess(user.id, existing?.branchId ?? "legacy-main", true);
    const warehouse = await saveWarehouse(input);
    await createActivityLog({
      user_id: user.id,
      action: input.id ? "update" : "create",
      entity_type: "warehouse",
      entity_id: warehouse.id,
      details: { code: warehouse.code },
    });
    revalidatePath(ROUTES.inventory.warehouses);
    return { success: true, id: warehouse.id };
  });
}

export async function saveLocationAction(input: LocationInput) {
  return measureOperation("action:saveLocationAction", async () => {
    await requireFeatureEnabled("products");
    const user = await requirePermission(
      "inventory",
      input.id ? "edit" : "create",
    );
    validateActionArguments("saveLocationAction", { input });
    await requireWarehouseAccess(user.id, input.warehouseId, input.id ? "edit" : "create");
    if (input.id) await requireStockLocationAccess(user.id, input.id, true);
    const location = await saveLocation(input);
    await createActivityLog({
      user_id: user.id,
      action: input.id ? "update" : "create",
      entity_type: "stock_location",
      entity_id: location.id,
      details: { code: location.code },
    });
    revalidatePath(ROUTES.inventory.warehouses);
    return { success: true, id: location.id };
  });
}

export async function createStockCountAction(input: StockCountInput) {
  return measureOperation("action:createStockCountAction", async () => {
    await requireFeatureEnabled("products");
    const user = await requirePermission("inventory", "create");
    validateActionArguments("createStockCountAction", { input });
    await requireWarehouseAccess(user.id, input.warehouseId, "create");
    const count = await createStockCount(input, user.id);
    await createActivityLog({
      user_id: user.id,
      action: "create",
      entity_type: "stock_count",
      entity_id: count.id,
      details: { number: count.number, scope: count.scope },
    });
    revalidatePath(ROUTES.inventory.counts);
    return { success: true, id: count.id };
  });
}

export async function saveCountedAction(
  countId: string,
  entries: { lineId: string; counted: string }[],
) {
  return measureOperation("action:saveCountedAction", async () => {
    await requireFeatureEnabled("products");
    const user = await requirePermission("inventory", "edit");
    validateActionArguments("saveCountedAction", { countId, entries });
    await requireStockCountAccess(user.id, countId, "edit");
    await recordCountedQuantities(countId, entries);
    revalidatePath(ROUTES.inventory.count(countId));
    return { success: true };
  });
}

/** Scanning during a count: finds the item by barcode or SKU and adds a line for it when it has none. */
export async function scanCountItemAction(
  countId: string,
  code: string,
  locationId: string,
) {
  return measureOperation("action:scanCountItemAction", async () => {
    await requireFeatureEnabled("products");
    const user = await requirePermission("inventory", "edit");
    validateActionArguments("scanCountItemAction", {
      countId,
      code,
      locationId,
    });
    const count = await requireStockCountAccess(user.id, countId, "edit");
    const location = await requireStockLocationAccess(user.id, locationId, true);
    if (location.warehouseId !== count.warehouseId) throw new Error("Inventory access denied");
    const found = await findByCode(code);
    if (!found) return { success: false as const };
    const lines = await db.stockCountLine.findMany({
      where: {
        countId,
        productId: found.productId,
        variantKey: found.variantId ?? "",
      },
      select: { id: true },
    });
    if (lines.length)
      return { success: true as const, lineIds: lines.map((l) => l.id) };
    const line = await addCountLine(countId, {
      productId: found.productId,
      variantId: found.variantId,
      locationId,
    });
    revalidatePath(ROUTES.inventory.count(countId));
    return { success: true as const, lineIds: [line.id] };
  });
}

/** Moves a count between counting and review, or cancels it. */
export async function setStockCountStatusAction(
  countId: string,
  status: "review" | "counting" | "cancelled",
) {
  return measureOperation("action:setStockCountStatusAction", async () => {
    await requireFeatureEnabled("products");
    const user = await requirePermission("inventory", "edit");
    validateActionArguments("setStockCountStatusAction", { countId, status });
    await requireStockCountAccess(user.id, countId, "edit");
    await setStockCountStatus(countId, status);
    await createActivityLog({
      user_id: user.id,
      action: "update",
      entity_type: "stock_count",
      entity_id: countId,
      details: { status },
    });
    revalidatePath(ROUTES.inventory.counts);
    revalidatePath(ROUTES.inventory.count(countId));
    return { success: true };
  });
}

export async function approveStockCountAction(countId: string) {
  return measureOperation("action:approveStockCountAction", async () => {
    await requireFeatureEnabled("products");
    const user = await requirePermission("inventory", "approve");
    validateActionArguments("approveStockCountAction", { countId });
    await requireStockCountAccess(user.id, countId, "approve");
    const { low, adjusted } = await approveStockCount(countId, user.id);
    await createActivityLog({
      user_id: user.id,
      action: "approve",
      entity_type: "stock_count",
      entity_id: countId,
      details: { adjusted },
    });
    await notifyLowStock(low);
    revalidatePath(ROUTES.inventory.counts);
    revalidatePath(ROUTES.inventory.count(countId));
    revalidateStock();
    return { success: true, adjusted };
  });
}
