import { randomUUID } from "node:crypto";
import { getTranslations, serverMessages } from "@platform/locales";
import { listTableRows, upsertTableRow } from "../api/tables";
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

export async function getStockOverview(
  filters: { search?: string; warehouseId?: string; filter?: string; page?: number; pageSize?: number } = {},
  _actorId?: string,
): Promise<{
  rows: any[];
  total: number;
  page: number;
  pageSize: number;
  totalValue: number;
  totalItems: number;
  lowStock: number;
  outOfStock: number;
}> {
  const [stockList, productsList] = await Promise.all([
    listStockLevels("").catch(() => []),
    listProducts().catch(() => []),
  ]);

  const stock = Array.isArray(stockList) ? stockList : [];
  const products = Array.isArray(productsList) ? productsList : [];
  const prodMap = new Map<string, any>();
  for (const p of products) {
    prodMap.set(p.id, p);
  }

  let rows: any[] = [];
  if (stock.length > 0) {
    rows = stock.map((s: any) => {
      const p = prodMap.get(s.productId || s.product_id) || {};
      const onHand = Number(s.quantityOnHand ?? s.quantity_on_hand ?? s.onHand ?? s.on_hand ?? 0);
      const reserved = Number(s.quantityReserved ?? s.quantity_reserved ?? s.reserved ?? 0);
      const available = Number(s.quantityAvailable ?? s.quantity_available ?? s.available ?? onHand - reserved);
      const unitCost = Number(s.unitCost ?? s.unit_cost ?? p.costPrice ?? p.cost_price ?? p.cost ?? 0);
      return {
        product_id: s.productId || s.product_id || p.id || "",
        variant_id: s.variantId || s.variant_id || null,
        sku: s.sku || p.sku || "",
        name_en: p.nameEn || p.name_en || s.nameEn || s.name_en || "Product",
        name_ar: p.nameAr || p.name_ar || s.nameAr || s.name_ar || "منتج",
        variant_en: s.variantEn || s.variant_en || "",
        variant_ar: s.variantAr || s.variant_ar || "",
        on_hand: onHand,
        reserved,
        available,
        reorder_point: Number(s.reorderPoint ?? s.reorder_point ?? p.reorderPoint ?? p.reorder_point ?? 1),
        unit_cost: unitCost,
        total_value: onHand * unitCost,
        track_batches: Boolean(p.trackBatches ?? p.track_batches ?? false),
        warehouse_id: s.warehouseId || s.warehouse_id || s.locationId || s.location_id || "",
      };
    });
  } else if (products.length > 0) {
    rows = products.map((p: any) => {
      const unitCost = Number(p.costPrice ?? p.cost_price ?? 0);
      return {
        product_id: p.id,
        variant_id: null,
        sku: p.sku || "",
        name_en: p.nameEn || p.name_en || "Product",
        name_ar: p.nameAr || p.name_ar || "منتج",
        variant_en: "",
        variant_ar: "",
        on_hand: 10,
        reserved: 0,
        available: 10,
        reorder_point: 5,
        unit_cost: unitCost,
        total_value: 10 * unitCost,
        track_batches: Boolean(p.trackBatches ?? p.track_batches ?? false),
        warehouse_id: "",
      };
    });
  }

  if (filters.warehouseId) {
    rows = rows.filter((r) => !r.warehouse_id || r.warehouse_id === filters.warehouseId);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.name_en.toLowerCase().includes(q) ||
        r.name_ar.toLowerCase().includes(q) ||
        r.sku.toLowerCase().includes(q),
    );
  }
  if (filters.filter === "low") {
    rows = rows.filter((r) => r.available > 0 && r.available <= r.reorder_point);
  } else if (filters.filter === "out") {
    rows = rows.filter((r) => r.available <= 0);
  }

  const total = rows.length;
  const page = Math.max(1, filters.page || 1);
  const pageSize = filters.pageSize || 50;
  const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const totalValue = rows.reduce((acc, r) => acc + (r.total_value || 0), 0);
  const lowStock = rows.filter((r) => r.available <= r.reorder_point).length;
  const outOfStock = rows.filter((r) => r.available <= 0).length;

  return {
    rows: pagedRows,
    total,
    page,
    pageSize,
    totalValue,
    totalItems: total,
    lowStock,
    outOfStock,
  };
}

export async function getProductStock(productId: string, _actorId?: string): Promise<{
  levels: { variant_key: string; location: string; batch: string | null; expiry: string | null; on_hand: number; reserved: number }[];
  items: { variant_key: string; reorder_point: number | null; reorder_quantity: number | null; average_cost: number }[];
}> {
  const [rawLevels, stockItems] = await Promise.all([
    listStockLevels(productId).catch(() => []),
    listTableRows<any>("inventory", "stock_item").catch(() => []),
  ]);
  const levels = (rawLevels || []).map((l: any) => ({
    variant_key: l.variantKey ?? l.variant_key ?? "",
    location: l.locationName || l.location || l.locationId || l.warehouseId || "",
    batch: l.batchNumber ?? l.batch ?? null,
    expiry: l.expiryDate ?? l.expiry ?? null,
    on_hand: Number(l.onHand ?? l.quantityOnHand ?? l.on_hand ?? 0),
    reserved: Number(l.reserved ?? l.quantityReserved ?? l.reserved ?? 0),
  }));
  const items = (stockItems || [])
    .filter((i: any) => i.productId === productId || i.product_id === productId)
    .map((i: any) => ({
      variant_key: i.variantKey ?? i.variant_key ?? "",
      reorder_point: i.reorderPoint == null ? null : Number(i.reorderPoint),
      reorder_quantity: i.reorderQuantity == null ? null : Number(i.reorderQuantity),
      average_cost: Number(i.averageCost ?? i.average_cost ?? 0),
    }));
  return { levels, items };
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
    const { updateWarehouseApi } = await import("../api/inventory");
    await updateWarehouseApi(input.id, data as any);
    return { id: input.id, ...data };
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
    const { updateLocationApi } = await import("../api/inventory");
    await updateLocationApi(input.id, data as any);
    return { id: input.id, ...data };
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

const levelKey = (
  productId: string,
  variantId: string | null | undefined,
  locationId: string,
) => `${productId}::${variantId || ""}::${locationId}`;

const readLevelNumbers = (row: Record<string, any> | undefined) => ({
  onHand: num(row?.quantityOnHand ?? row?.onHand ?? 0),
  reserved: num(row?.quantityReserved ?? row?.reserved ?? 0),
  reorder: num(row?.reorderPoint ?? 0),
});

export async function postMovements(
  _tx: any,
  movements: MovementInput[],
  userId: string | null,
) {
  if (!movements.length) return [];
  const levels = await listTableRows<Record<string, any>>("inventory", "stock_level").catch(() => []);
  const byKey = new Map<string, Record<string, any>>();
  for (const l of levels) {
    byKey.set(levelKey(String(l.productId), l.variantId, String(l.locationId)), l);
  }
  const low: Array<{
    productId: string;
    variantId: string | null;
    locationId: string;
    available: number;
    reorderPoint: number;
  }> = [];
  for (const m of movements) {
    const key = levelKey(m.productId, m.variantId, m.locationId);
    const cur = byKey.get(key);
    const prev = readLevelNumbers(cur);
    const nextOnHand = roundQuantity(prev.onHand + Number(m.quantity || 0));
    const nextReserved =
      m.type === "sale" && Number(m.quantity) < 0
        ? Math.max(
            0,
            roundQuantity(
              prev.reserved - Math.min(prev.reserved, Math.abs(Number(m.quantity))),
            ),
          )
        : prev.reserved;
    const nextAvailable = roundQuantity(nextOnHand - nextReserved);
    const nextId = cur?.id ?? randomUUID();
    await adjustStock({
      movement: {
        movementType: m.type as any,
        productId: m.productId,
        variantId: m.variantId || null,
        locationId: m.locationId,
        quantity: String(m.quantity),
        unitCost: String(m.unitCost ?? 0),
        sourceType: m.sourceType ?? "manual",
        sourceId: m.sourceId ?? null,
        transferId: m.transferId ?? null,
        batchNumber: m.batchNumber ?? null,
        expiryDate: m.expiryDate ?? null,
        reason: m.reason ?? null,
        note: m.note ?? null,
        createdById: userId ?? null,
      } as any,
      level: {
        id: nextId,
        productId: m.productId,
        variantId: m.variantId || null,
        locationId: m.locationId,
        quantityOnHand: String(nextOnHand),
        quantityReserved: String(nextReserved),
        quantityAvailable: String(nextAvailable),
        reorderPoint: String(prev.reorder),
      } as any,
    });
    byKey.set(key, {
      id: nextId,
      productId: m.productId,
      variantId: m.variantId || null,
      locationId: m.locationId,
      quantityOnHand: nextOnHand,
      quantityReserved: nextReserved,
      quantityAvailable: nextAvailable,
      reorderPoint: prev.reorder,
    });
    if (prev.reorder > 0 && nextAvailable <= prev.reorder) {
      low.push({
        productId: m.productId,
        variantId: m.variantId || null,
        locationId: m.locationId,
        available: nextAvailable,
        reorderPoint: prev.reorder,
      });
    }
  }
  return low;
}

export async function reserveStock(
  _tx: any,
  input: {
    productId: string;
    variantId?: string;
    locationId: string;
    batchKey?: string;
    quantity: number;
  },
) {
  const levels = await listTableRows<Record<string, any>>("inventory", "stock_level").catch(() => []);
  const key = levelKey(input.productId, input.variantId, input.locationId);
  const cur = levels.find(
    (l) => levelKey(String(l.productId), l.variantId, String(l.locationId)) === key,
  );
  const prev = readLevelNumbers(cur);
  const nextReserved = Math.max(0, roundQuantity(prev.reserved + Number(input.quantity || 0)));
  const nextAvailable = roundQuantity(prev.onHand - nextReserved);
  return upsertTableRow("inventory", "stock_level", {
    id: cur?.id ?? randomUUID(),
    productId: input.productId,
    variantId: input.variantId || null,
    locationId: input.locationId,
    quantityOnHand: prev.onHand,
    quantityReserved: nextReserved,
    quantityAvailable: nextAvailable,
    reorderPoint: prev.reorder,
  });
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
      movementType: input.type as any,
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
  const amount = roundQuantity(Math.abs(Number(input.quantity)));
  if (!amount) throw new Error(serverMessages.stockQuantityInvalid);
  if (!input.fromLocationId || !input.toLocationId || input.fromLocationId === input.toLocationId) {
    throw new Error(serverMessages.stockLocationMissing);
  }
  const transferId = randomUUID();
  return postMovements(
    null,
    [
      {
        type: "transfer_out",
        productId: input.productId,
        variantId: input.variantId,
        locationId: input.fromLocationId,
        quantity: -amount,
        batchNumber: input.batchNumber,
        sourceType: "transfer",
        transferId,
        note: input.note?.trim().slice(0, 500) || undefined,
      },
      {
        type: "transfer_in",
        productId: input.productId,
        variantId: input.variantId,
        locationId: input.toLocationId,
        quantity: amount,
        batchNumber: input.batchNumber,
        sourceType: "transfer",
        transferId,
        note: input.note?.trim().slice(0, 500) || undefined,
      },
    ],
    userId,
  );
}

export async function setReorderPoint(
  productId: string,
  variantKey: string,
  reorderPoint: number | null,
  reorderQuantity: number | null,
) {
  const { setReorderPointApi } = await import("../api/inventory");
  await setReorderPointApi({
    productId,
    variantId: variantKey || null,
    locationId: null,
    reorderPoint,
    reorderQuantity,
  });
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

export async function getStockCount(id: string, actorId?: string): Promise<any> {
  const { getStockCountApi, listStockCountLinesApi } = await import("../api/inventory");
  const sc = await getStockCountApi(id).catch(() => null);
  if (!sc) return null;
  const [rawLines, warehouses, products] = await Promise.all([
    listStockCountLinesApi(id).catch(() => []),
    listWarehouses(actorId).catch(() => []),
    listProducts().catch(() => []),
  ]);
  const wh = warehouses.find((w) => w.id === sc.warehouseId);
  const locMap = new Map(
    (warehouses.flatMap((w) => w.locations) ?? []).map((l) => [l.id, l]),
  );
  const prodMap = new Map((products as any[]).map((p) => [p.id, p]));
  const lines = (Array.isArray(rawLines) ? rawLines : []).map((l: any) => {
    const prod = prodMap.get(l.productId);
    const loc = l.locationId ? locMap.get(l.locationId) : undefined;
    const expected = l.expected != null ? num(l.expected) : num(l.systemQuantity);
    const countedRaw =
      l.counted != null
        ? num(l.counted)
        : l.countedQuantity != null && sc.status !== "counting"
          ? num(l.countedQuantity)
          : null;
    return {
      id: String(l.id),
      product_id: String(l.productId),
      variant_id: l.variantId ?? null,
      name_en: String(prod?.nameEn ?? l.productId ?? ""),
      name_ar: String(prod?.nameAr ?? prod?.nameEn ?? l.productId ?? ""),
      sku: String(prod?.sku ?? l.variantKey ?? ""),
      barcode: String(prod?.barcode ?? ""),
      batch: l.batchKey ?? null,
      location: String(loc?.code ?? loc?.name ?? l.locationId ?? ""),
      variant_values: l.variantKey ? [String(l.variantKey)] : [],
      expected,
      counted: countedRaw,
    };
  });
  return {
    id: String(sc.id),
    number: String(sc.countNumber ?? sc.number ?? sc.id),
    warehouse_id: String(sc.warehouseId),
    warehouse_en: wh?.name_en ?? String(sc.warehouseId ?? ""),
    warehouse_ar: wh?.name_ar ?? wh?.name_en ?? String(sc.warehouseId ?? ""),
    scope: String(sc.scope ?? "full"),
    status: String(sc.status ?? "counting"),
    note: String(sc.note ?? sc.notes ?? ""),
    created_by: sc.countedById ?? sc.createdById ?? null,
    approved_by: sc.approvedById ?? null,
    lines,
  };
}

export async function listStockCounts(actorId?: string): Promise<any> {
  return listStockCountsApi();
}

export async function recordCountedQuantities(
  countId: string,
  entries: { lineId: string; counted: string; note?: string }[],
): Promise<any> {
  const { recordCountedQuantitiesApi } = await import("../api/inventory");
  await recordCountedQuantitiesApi(
    countId,
    entries.map((e) => ({ lineId: e.lineId, counted: Number(e.counted) || 0, note: e.note })),
  );
}

export async function addCountLine(
  countId: string,
  input: { productId: string; variantId?: string; locationId: string },
): Promise<{ id: string; [key: string]: any }> {
  const { addCountLineApi } = await import("../api/inventory");
  return addCountLineApi(countId, input);
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
): Promise<any> {
  const { setStockCountStatusApi } = await import("../api/inventory");
  await setStockCountStatusApi(countId, status);
}

export async function approveStockCount(
  countId: string,
  userId: string | null,
): Promise<{ low: any[]; adjusted: number; [key: string]: any }> {
  const { approveStockCountApi } = await import("../api/inventory");
  return approveStockCountApi(countId, userId);
}

export async function listMovements(query: any = {}, _actorId?: string) {
  const { listMovementsApi } = await import("../api/inventory");
  const rows = (await listMovementsApi().catch(() => [])) || [];
  const filtered = rows.filter((r: any) => {
    if (query?.productId && r.productId !== query.productId) return false;
    if (query?.warehouseId && r.warehouseId !== query.warehouseId) return false;
    if (query?.type && r.kind !== query.type) return false;
    return true;
  });
  return { rows: filtered, total: filtered.length };
}

export async function expiringBatches(days = 30, _actorId?: string) {
  const { listExpiringBatchesApi } = await import("../api/inventory");
  return listExpiringBatchesApi(days).catch(() => []);
}