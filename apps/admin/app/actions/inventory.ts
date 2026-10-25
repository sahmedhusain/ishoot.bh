"use server";
import { revalidatePath } from "next/cache";
import { formatMessage, getTranslations } from "@platform/locales";
import {
  addCountLine,
  approveStockCount,
  changeStock,
  createActivityLog,
  createNotification,
  createStockCount,
  db,
  findByCode,
  hasPermission,
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
import { ROUTES } from "../../constants/routes";
import { requirePermission } from "../../lib/auth";
import { validateActionArguments } from "../../lib/action-input";

function revalidateStock(productId?: string) {
  revalidatePath(ROUTES.inventory.stock);
  revalidatePath(ROUTES.inventory.movements());
  if (productId) revalidatePath(ROUTES.products.detail(productId));
}

/** Tells everyone who can see stock that items fell to their reorder point (once per dip). */
async function notifyLowStock(low: { productId: string; variantKey: string; available: number; reorderPoint: number }[]) {
  if (!low.length) return;
  const users = await db.user.findMany({ where: { isActive: true, archivedAt: null }, select: { id: true, role: true } });
  const roles = Array.from(new Set(users.map((u) => u.role)));
  const allowed = new Set((await Promise.all(roles.map(async (role) => ((await hasPermission(role, "inventory", "read")) ? role : null)))).filter(Boolean));
  const recipients = users.filter((u) => allowed.has(u.role));
  const en = getTranslations("en").admin.inventory.notifications.lowStock;
  for (const item of low) {
    const product = await db.product.findUnique({ where: { id: item.productId }, select: { sku: true, nameEn: true, nameAr: true, variants: { where: { id: item.variantKey || "-" }, select: { sku: true } } } });
    if (!product) continue;
    const params = { nameEn: product.nameEn, nameAr: product.nameAr, sku: product.variants[0]?.sku ?? product.sku, available: String(item.available), point: String(item.reorderPoint) };
    for (const user of recipients)
      await createNotification({
        user_id: user.id,
        title: formatMessage(en.title, { name: product.nameEn }),
        message: formatMessage(en.message, params),
        message_key: "inventory.notifications.lowStock",
        message_params: params,
        type: "warning",
        entity_type: "product",
        entity_id: item.productId,
      });
  }
}

/** Receives, adjusts or writes off stock at a location (the stock page's "Change stock"). */
export async function changeStockAction(input: StockChangeInput) {
  return measureOperation("action:changeStockAction", async () => {
    await requireFeatureEnabled("products");
    const user = await requirePermission("inventory", "edit");
    validateActionArguments("changeStockAction", { input });
    const low = await changeStock(input, user.id);
    await createActivityLog({ user_id: user.id, action: "update", entity_type: "stock", entity_id: input.productId, details: { type: input.type, quantity: input.quantity, locationId: input.locationId } });
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
    const low = await transferStock(input, user.id);
    await createActivityLog({ user_id: user.id, action: "update", entity_type: "stock", entity_id: input.productId, details: { type: "transfer", quantity: input.quantity, from: input.fromLocationId, to: input.toLocationId } });
    await notifyLowStock(low);
    revalidateStock(input.productId);
    return { success: true };
  });
}

/** Saves the reorder levels of a product's items (one per variant, or one for the product). */
export async function saveReorderPointsAction(productId: string, levels: { variantKey: string; reorderPoint: string; reorderQuantity: string }[]) {
  return measureOperation("action:saveReorderPointsAction", async () => {
    await requireFeatureEnabled("products");
    const user = await requirePermission("inventory", "edit");
    validateActionArguments("saveReorderPointsAction", { productId, levels });
    const value = (text: string) => (text.trim() === "" ? null : Number(text));
    for (const level of levels) await setReorderPoint(productId, level.variantKey, value(level.reorderPoint), value(level.reorderQuantity));
    await createActivityLog({ user_id: user.id, action: "update", entity_type: "product", entity_id: productId, details: { reorderLevels: levels.length } });
    revalidateStock(productId);
    return { success: true };
  });
}

export async function saveWarehouseAction(input: WarehouseInput) {
  return measureOperation("action:saveWarehouseAction", async () => {
    await requireFeatureEnabled("products");
    const user = await requirePermission("inventory", input.id ? "edit" : "create");
    validateActionArguments("saveWarehouseAction", { input });
    const warehouse = await saveWarehouse(input);
    await createActivityLog({ user_id: user.id, action: input.id ? "update" : "create", entity_type: "warehouse", entity_id: warehouse.id, details: { code: warehouse.code } });
    revalidatePath(ROUTES.inventory.warehouses);
    return { success: true, id: warehouse.id };
  });
}

export async function saveLocationAction(input: LocationInput) {
  return measureOperation("action:saveLocationAction", async () => {
    await requireFeatureEnabled("products");
    const user = await requirePermission("inventory", input.id ? "edit" : "create");
    validateActionArguments("saveLocationAction", { input });
    const location = await saveLocation(input);
    await createActivityLog({ user_id: user.id, action: input.id ? "update" : "create", entity_type: "stock_location", entity_id: location.id, details: { code: location.code } });
    revalidatePath(ROUTES.inventory.warehouses);
    return { success: true, id: location.id };
  });
}

export async function createStockCountAction(input: StockCountInput) {
  return measureOperation("action:createStockCountAction", async () => {
    await requireFeatureEnabled("products");
    const user = await requirePermission("inventory", "create");
    validateActionArguments("createStockCountAction", { input });
    const count = await createStockCount(input, user.id);
    await createActivityLog({ user_id: user.id, action: "create", entity_type: "stock_count", entity_id: count.id, details: { number: count.number, scope: count.scope } });
    revalidatePath(ROUTES.inventory.counts);
    return { success: true, id: count.id };
  });
}

export async function saveCountedAction(countId: string, entries: { lineId: string; counted: string }[]) {
  return measureOperation("action:saveCountedAction", async () => {
    await requireFeatureEnabled("products");
    await requirePermission("inventory", "edit");
    validateActionArguments("saveCountedAction", { countId, entries });
    await recordCountedQuantities(countId, entries);
    revalidatePath(ROUTES.inventory.count(countId));
    return { success: true };
  });
}

/** Scanning during a count: finds the item by barcode or SKU and adds a line for it when it has none. */
export async function scanCountItemAction(countId: string, code: string, locationId: string) {
  return measureOperation("action:scanCountItemAction", async () => {
    await requireFeatureEnabled("products");
    await requirePermission("inventory", "edit");
    validateActionArguments("scanCountItemAction", { countId, code, locationId });
    const found = await findByCode(code);
    if (!found) return { success: false as const };
    const lines = await db.stockCountLine.findMany({ where: { countId, productId: found.productId, variantKey: found.variantId ?? "" }, select: { id: true } });
    if (lines.length) return { success: true as const, lineIds: lines.map((l) => l.id) };
    const line = await addCountLine(countId, { productId: found.productId, variantId: found.variantId, locationId });
    revalidatePath(ROUTES.inventory.count(countId));
    return { success: true as const, lineIds: [line.id] };
  });
}

/** Moves a count between counting and review, or cancels it. */
export async function setStockCountStatusAction(countId: string, status: "review" | "counting" | "cancelled") {
  return measureOperation("action:setStockCountStatusAction", async () => {
    await requireFeatureEnabled("products");
    const user = await requirePermission("inventory", "edit");
    validateActionArguments("setStockCountStatusAction", { countId, status });
    await setStockCountStatus(countId, status);
    await createActivityLog({ user_id: user.id, action: "update", entity_type: "stock_count", entity_id: countId, details: { status } });
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
    const { low, adjusted } = await approveStockCount(countId, user.id);
    await createActivityLog({ user_id: user.id, action: "approve", entity_type: "stock_count", entity_id: countId, details: { adjusted } });
    await notifyLowStock(low);
    revalidatePath(ROUTES.inventory.counts);
    revalidatePath(ROUTES.inventory.count(countId));
    revalidateStock();
    return { success: true, adjusted };
  });
}
