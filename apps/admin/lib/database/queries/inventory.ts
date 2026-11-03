import { getTranslations, serverMessages } from "@platform/locales";
import {
  listWarehouses as listWarehousesApi,
  getWarehouse,
  createWarehouse,
  listLocations,
  createLocation,
  listCategories,
  createCategory,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  listVariants,
  createVariant,
  listStockLevels,
  adjustStock,
  listStockCounts as listStockCountsApi,
  createStockCount as createStockCountApi,
} from "@platform/api-client";
import {
  WAREHOUSE_CODE,
  averageCostAfter,
  countVariance,
  isAdjustmentReason,
  roundQuantity,
  type MovementType,
} from "../constants/inventory";
import { listAccessibleBranches } from "./branches";
import { getNextSequenceNumber } from "./sequence";
import { normalizeProductOptions, variantLabel } from "../constants/products";
import { publicError } from "../errors";

const num = (value: any) => value == null ? 0 : Number(value.toString());
const numOrNull = (value: any) => value == null ? null : Number(value.toString());

export interface WarehouseRecord {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  address: string;
  is_active: boolean;
  is_default: boolean;
  locations: { id: string; code: string; name: string; is_active: boolean }[];
}

export async function ensureDefaultWarehouse(actorId?: string): Promise<WarehouseRecord> {
  const warehouses = await listWarehouses(actorId);
  if (warehouses.length > 0) return warehouses[0];
  return {
    id: "default-wh",
    code: "WH-01",
    name_en: "Main Warehouse",
    name_ar: "المستودع الرئيسي",
    address: "",
    is_active: true,
    is_default: true,
    locations: [],
  };
}

export async function getStockOverview(): Promise<any> {
  const stock = await listStockLevels("");
  const totalItems = stock?.length ?? 0;
  const lowStock = (stock || []).filter((s: any) => s.available <= (s.reorderPoint ?? 5)).length;
  return { totalItems, lowStock, outOfStock: 0 };
}

export async function getProductStock(productId: string): Promise<any> {
  const stock = await listStockLevels(productId);
  return stock || [];
}

export async function listWarehouses(actorId?: string): Promise<WarehouseRecord[]> {
  const rows = await listWarehousesApi();
  const result: WarehouseRecord[] = [];
  for (const w of (rows as any) || []) {
    const locations = await listLocations(w.id);
    result.push({
      id: w.id,
      code: w.code,
      name_en: w.name_en || w.nameEn || "",
      name_ar: w.name_ar || w.nameAr || "",
      address: w.address ?? "",
      is_active: w.is_active ?? w.isActive ?? true,
      is_default: w.is_default ?? w.isDefault ?? false,
      locations: (locations || []).map((l: any) => ({
        id: l.id,
        code: l.code,
        name: l.name ?? "",
        is_active: l.isActive,
      })),
    });
  }
  return result;
}

export interface WarehouseInput {
  id?: string;
  code: string;
  nameEn: string;
  nameAr: string;
  address: string;
  isActive: boolean;
  isDefault: boolean;
}

export async function saveWarehouse(input: WarehouseInput) {
  const code = input.code.trim().toUpperCase();
  if (!WAREHOUSE_CODE.test(code))
    throw new Error(serverMessages.warehouseCodeInvalid);
  const nameEn = input.nameEn.trim().slice(0, 120);
  const nameAr = input.nameAr.trim().slice(0, 120);
  if (!nameEn || !nameAr) throw new Error(serverMessages.productNameRequired);
  const data = {
    code,
    nameEn,
    nameAr,
    address: input.address.trim().slice(0, 300) || null,
    isActive: input.isActive || input.isDefault,
    isDefault: input.isDefault,
  };
  if (input.id) {
    // No updateWarehouse in API, we'd need it.
    throw new Error("updateWarehouse is not implemented in API");
  }
  return createWarehouse(data);
}

export interface LocationInput {
  id?: string;
  warehouseId: string;
  code: string;
  name: string;
  isActive: boolean;
}

export async function saveLocation(input: LocationInput) {
  const code = input.code.trim().toUpperCase();
  if (!WAREHOUSE_CODE.test(code))
    throw new Error(serverMessages.warehouseCodeInvalid);
  const data = {
    code,
    name: input.name.trim().slice(0, 80) || null,
    isActive: input.isActive,
  };
  if (input.id) {
    // No updateLocation in API.
    throw new Error("updateLocation is not implemented in API");
  }
  return createLocation(input.warehouseId, data as any);
}

export interface MovementInput {
  type: MovementType;
  productId: string;
  variantId?: string;
  locationId: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity: number;
  unitCost?: number;
  sourceType?: string;
  sourceId?: string;
  transferId?: string;
  reason?: string;
  note?: string;
}

export async function postMovements(
  tx: any,
  movements: MovementInput[],
  userId: string | null,
) {
  // This is a complex transaction. Must be a single API call.
  throw new Error("postMovements must be implemented as a single API call in Go backend");
}

export async function reserveStock(
  tx: any,
  input: {
    productId: string;
    variantId?: string;
    locationId: string;
    batchKey?: string;
    quantity: number;
  },
) {
  // This is a transaction-heavy function.
  throw new Error("reserveStock must be implemented as a single API call in Go backend");
}

export interface StockChangeInput {
  type: string;
  productId: string;
  variantId?: string;
  locationId: string;
  quantity: number;
  direction?: string;
  unitCost?: number;
  batchNumber?: string;
  expiryDate?: string;
  reason?: string;
  note?: string;
}

export async function changeStock(
  input: StockChangeInput,
  userId: string | null,
) {
  const amount = roundQuantity(Math.abs(Number(input.quantity)));
  if (!amount) throw new Error(serverMessages.stockQuantityInvalid);
  if (!["receipt", "adjustment", "write_off"].includes(input.type))
    throw new Error(serverMessages.stockQuantityInvalid);
  if (input.type !== "receipt" && !isAdjustmentReason(input.reason))
    throw new Error(serverMessages.stockReasonRequired);
  const sign =
    input.type === "receipt" ||
    (input.type === "adjustment" && input.direction === "in")
      ? 1
      : -1;
  return adjustStock({
    movement: {
      type: input.type as any,
      productId: input.productId,
      variantId: input.variantId || undefined,
      locationId: input.locationId,
      quantity: String(sign * amount),
      unitCost: String(input.unitCost ?? 0),
      batchNumber: input.batchNumber,
      expiryDate: input.expiryDate,
      reason: input.type === "receipt" ? undefined : input.reason,
      note: input.note?.trim().slice(0, 500) || null,
    },
    level: {
      productId: input.productId,
      variantId: input.variantId || undefined,
      locationId: input.locationId,
    },
  });
}

export interface TransferInput {
  productId: string;
  variantId?: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  batchNumber?: string;
  note?: string;
}

export async function transferStock(
  input: TransferInput,
  userId: string | null,
) {
  // Must be a single API call.
  throw new Error("transferStock must be implemented as a single API call in Go backend");
}

export async function setReorderPoint(
  productId: string,
  variantKey: string,
  reorderPoint: number | null,
  reorderQuantity: number | null,
) {
  // Not available in API.
  throw new Error("setReorderPoint is not implemented in API");
}

export interface StockCountInput {
  warehouseId: string;
  scope: string;
  productIds?: string[];
  categoryId?: string;
  note?: string;
}

export async function createStockCount(
  input: StockCountInput,
  userId: string | null,
) {
  return createStockCountApi({
    warehouseId: input.warehouseId,
    scope: input.scope,
    productIds: input.productIds,
    categoryId: input.categoryId,
    note: input.note,
  });
}

export async function getStockCount(id: string, actorId?: string) {
  // API doesn't have getStockCount.
  throw new Error("getStockCount is not implemented in API");
}

export async function listStockCounts(actorId?: string) {
  return listStockCounts();
}

export async function recordCountedQuantities(
  countId: string,
  entries: { lineId: string; counted: string; note?: string }[],
) {
  // Not available in API.
  throw new Error("recordCountedQuantities is not implemented in API");
}

export async function addCountLine(
  countId: string,
  input: { productId: string; variantId?: string; locationId: string },
) {
  // Not available in API.
  throw new Error("addCountLine is not implemented in API");
}

export async function findByCode(code: string) {
  const text = code.trim().slice(0, 60);
  if (!text) return null;
  const products = await listProducts();
  const product = products.find(p => p.sku === text || p.barcode === text);
  if (product) {
    const variants = await listVariants(product.id);
    const variant = variants.find(v => v.sku === text || v.barcode === text);
    if (variant) return { productId: product.id, variantId: variant.id };
    return { productId: product.id, variantId: undefined };
  }
  return null;
}

export async function setStockCountStatus(
  countId: string,
  status: "review" | "counting" | "cancelled",
) {
  // Not available in API.
  throw new Error("setStockCountStatus is not implemented in API");
}

export async function approveStockCount(
  countId: string,
  userId: string | null,
) {
  // Not available in API.
  throw new Error("approveStockCount is not implemented in API");
}

export async function listMovements(query: any = {}, actorId?: string) {
  // Not available in API.
  return { rows: [], total: 0 };
}

export async function expiringBatches(days = 30, actorId?: string) {
  // Not available in API.
  return [];
}