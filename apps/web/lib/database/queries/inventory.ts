import { randomUUID } from "node:crypto";
import { Prisma, type StockCount } from "@prisma/client";
import { getTranslations, serverMessages } from "@platform/locales";
import { db } from "../db";
import {
  WAREHOUSE_CODE,
  averageCostAfter,
  countVariance,
  isAdjustmentReason,
  roundQuantity,
  type MovementType,
} from "../constants/inventory";
import { listAccessibleBranches, requireStockCountAccess } from "./branches";
import { getNextSequenceNumber } from "./sequence";
import { normalizeProductOptions, variantLabel } from "../constants/products";
import { publicError } from "../errors";

type Tx = Prisma.TransactionClient;
const num = (value: { toString(): string } | null | undefined) =>
  value == null ? 0 : Number(value.toString());
const numOrNull = (value: { toString(): string } | null | undefined) =>
  value == null ? null : Number(value.toString());

async function scopedLocations(actorId?:string, warehouseId?:string):Promise<Prisma.StockLocationWhereInput>{
 if(!actorId)return warehouseId?{warehouseId}:{};
 const branches=await listAccessibleBranches(actorId);
 const branchIds=branches.map(b=>b.id);
 const branchCondition: Prisma.WarehouseWhereInput = { OR: [{ branchId: { in: branchIds } }, { branchId: null }] };
 if(warehouseId&&!await db.warehouse.count({where:{id:warehouseId, ...branchCondition}}))throw new Error("Branch access denied");
 return {warehouse:{...branchCondition},...(warehouseId?{warehouseId}:{})};
}
// ─── Warehouses and locations ────────────────────────────────────────────────────────────────────────────────────

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

/** A company with stock always has a warehouse to put it in: the first one is created on demand. */
export async function ensureDefaultWarehouse(client: Tx | typeof db = db) {
  const existing = await client.warehouse.findFirst({
    where: { isDefault: true },
    include: { locations: { orderBy: { createdAt: "asc" } } },
  });
  if (existing) {
    if (!existing.branchId) {
      return client.warehouse.update({
        where: { id: existing.id },
        data: { branchId: "legacy-main" },
        include: { locations: { orderBy: { createdAt: "asc" } } },
      });
    }
    return existing;
  }
  const any = await client.warehouse.findFirst({
    orderBy: { createdAt: "asc" },
    include: { locations: { orderBy: { createdAt: "asc" } } },
  });
  if (any)
    return client.warehouse.update({
      where: { id: any.id },
      data: { isDefault: true, branchId: any.branchId ?? "legacy-main" },
      include: { locations: { orderBy: { createdAt: "asc" } } },
    });
  return client.warehouse.create({
    data: {
      code: "MAIN",
      branchId: "legacy-main",
      nameEn: "Main Warehouse",
      nameAr: "المستودع الرئيسي",
      isDefault: true,
      locations: { create: { code: "MAIN" } },
    },
    include: { locations: { orderBy: { createdAt: "asc" } } },
  });
}

export async function listWarehouses(actorId?: string): Promise<WarehouseRecord[]> {
  await ensureDefaultWarehouse();
  const branchIds = actorId ? (await listAccessibleBranches(actorId)).map(b=>b.id) : null;
  const rows = await db.warehouse.findMany({
    where: branchIds ? { OR: [{ branchId: { in: branchIds } }, { branchId: null }] } : {},
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { locations: { orderBy: { createdAt: "asc" } } },
  });
  return rows.map((w) => ({
    id: w.id,
    code: w.code,
    name_en: w.nameEn,
    name_ar: w.nameAr,
    address: w.address ?? "",
    is_active: w.isActive,
    is_default: w.isDefault,
    locations: w.locations.map((l) => ({
      id: l.id,
      code: l.code,
      name: l.name ?? "",
      is_active: l.isActive,
    })),
  }));
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
  if (
    await db.warehouse.findFirst({
      where: { code, id: { not: input.id ?? "" } },
      select: { id: true },
    })
  )
    throw new Error(serverMessages.warehouseCodeTaken);
  if (
    input.id &&
    !input.isActive &&
    (await stockInLocations({ location: { warehouseId: input.id } }))
  )
    throw new Error(serverMessages.warehouseHasStock);
  const data = {
    code,
    nameEn,
    nameAr,
    address: input.address.trim().slice(0, 300) || null,
    isActive: input.isActive || input.isDefault,
  };
  return db.$transaction(async (tx) => {
    const warehouse = input.id
      ? await tx.warehouse.update({ where: { id: input.id }, data })
      : await tx.warehouse.create({
          data: {
            ...data,
            branchId: "legacy-main",
            sortOrder: await tx.warehouse.count(),
            locations: { create: { code: "MAIN" } },
          },
        });
    if (input.isDefault) {
      await tx.warehouse.updateMany({
        where: { id: { not: warehouse.id } },
        data: { isDefault: false },
      });
      await tx.warehouse.update({
        where: { id: warehouse.id },
        data: { isDefault: true },
      });
    }
    return warehouse;
  });
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
  if (
    await db.stockLocation.findFirst({
      where: {
        warehouseId: input.warehouseId,
        code,
        id: { not: input.id ?? "" },
      },
      select: { id: true },
    })
  )
    throw new Error(serverMessages.warehouseCodeTaken);
  if (
    input.id &&
    !input.isActive &&
    (await stockInLocations({ locationId: input.id }))
  )
    throw new Error(serverMessages.warehouseHasStock);
  const data = {
    code,
    name: input.name.trim().slice(0, 80) || null,
    isActive: input.isActive,
  };
  return input.id
    ? db.stockLocation.update({ where: { id: input.id }, data })
    : db.stockLocation.create({
        data: { ...data, warehouseId: input.warehouseId },
      });
}

const stockInLocations = async (where: Prisma.StockLevelWhereInput) =>
  !!(await db.stockLevel.findFirst({
    where: { ...where, OR: [{ onHand: { not: 0 } }, { reserved: { not: 0 } }] },
    select: { id: true },
  }));

// ─── The ledger ──────────────────────────────────────────────────────────────────────────────────────────────────

export interface MovementInput {
  type: MovementType;
  productId: string;
  /** The variant's id; required for a product with variants. */
  variantId?: string;
  locationId: string;
  /** Batch number (created when new) for a batch-tracked product; required when stock comes in. */
  batchNumber?: string;
  expiryDate?: string;
  /** Signed: positive into the location, negative out. */
  quantity: number;
  /** For receipts: what one unit cost. Other movements use the average cost. */
  unitCost?: number;
  sourceType?: string;
  sourceId?: string;
  transferId?: string;
  reason?: string;
  note?: string;
}

/** The item a movement is about, checked: the product keeps stock, the variant is its own, the location is in use. */
async function resolveItem(tx: Tx, input: MovementInput) {
  const product = await tx.product.findUnique({
    where: { id: input.productId },
    select: {
      id: true,
      trackStock: true,
      trackBatches: true,
      nameEn: true,
      nameAr: true,
      sku: true,
      variants: { select: { id: true, sku: true } },
    },
  });
  if (!product) throw new Error(serverMessages.productMissing);
  if (!product.trackStock) throw new Error(serverMessages.stockNotTracked);
  if (
    product.variants.length > 0 &&
    !product.variants.some((v) => v.id === input.variantId)
  )
    throw new Error(serverMessages.stockVariantRequired);
  if (product.variants.length === 0 && input.variantId)
    throw new Error(serverMessages.stockVariantRequired);
  const location = await tx.stockLocation.findUnique({
    where: { id: input.locationId },
    include: { warehouse: { select: { isActive: true } } },
  });
  if (!location || !location.isActive || !location.warehouse.isActive)
    throw new Error(serverMessages.stockLocationMissing);
  return {
    product,
    variantKey: input.variantId ?? "",
    sku:
      product.variants.find((v) => v.id === input.variantId)?.sku ??
      product.sku,
  };
}

async function resolveBatch(
  tx: Tx,
  productId: string,
  variantKey: string,
  trackBatches: boolean,
  input: MovementInput,
) {
  if (!trackBatches) return "";
  const batchNumber = input.batchNumber?.trim().slice(0, 60);
  if (!batchNumber) throw new Error(serverMessages.stockBatchRequired);
  const existing = await tx.stockBatch.findUnique({
    where: {
      productId_variantKey_batchNumber: { productId, variantKey, batchNumber },
    },
  });
  if (existing) return existing.id;
  if (input.quantity < 0) throw publicError("stockInsufficient");
  const expiry = input.expiryDate ? new Date(input.expiryDate) : null;
  if (expiry && !Number.isFinite(expiry.getTime()))
    throw new Error(serverMessages.stockBatchRequired);
  const batch = await tx.stockBatch.create({
    data: { productId, variantKey, batchNumber, expiryDate: expiry },
  });
  return batch.id;
}

/**
 * Posts movements to the ledger and updates stock levels and average cost with them, all in the transaction
 * given. Stock never goes below what is reserved (or below zero); receipts move the weighted average cost.
 * Returns the items whose available stock fell to their reorder point, for low-stock alerts.
 */
export async function postMovements(
  tx: Tx,
  movements: MovementInput[],
  userId: string | null,
) {
  const touched = new Map<string, { productId: string; variantKey: string }>();
  for (const input of movements) {
    const quantity = roundQuantity(Number(input.quantity));
    if (
      !Number.isFinite(quantity) ||
      quantity === 0 ||
      Math.abs(quantity) > 10_000_000
    )
      throw new Error(serverMessages.stockQuantityInvalid);
    if (input.reason && !isAdjustmentReason(input.reason))
      throw new Error(serverMessages.stockQuantityInvalid);
    const { product, variantKey } = await resolveItem(tx, input);
    const batchKey = await resolveBatch(
      tx,
      product.id,
      variantKey,
      product.trackBatches,
      { ...input, quantity },
    );
    const key = {
      productId: product.id,
      variantKey,
      locationId: input.locationId,
      batchKey,
    };

    // One row per item for the average cost; locked for the rest of the transaction.
    await tx.stockItem.upsert({
      where: { productId_variantKey: { productId: product.id, variantKey } },
      update: {},
      create: { productId: product.id, variantKey },
    });
    const [item] = await tx.$queryRaw<
      { averageCost: Prisma.Decimal }[]
    >`SELECT "averageCost" FROM "StockItem" WHERE "productId" = ${product.id} AND "variantKey" = ${variantKey} FOR UPDATE`;
    let unitCost = num(item?.averageCost);
    if (quantity > 0 && input.type === "receipt") {
      const cost = Number(input.unitCost ?? 0);
      if (!Number.isFinite(cost) || cost < 0 || cost > 99_999_999)
        throw new Error(serverMessages.productAmountInvalid);
      const totals = await tx.stockLevel.aggregate({
        where: { productId: product.id, variantKey },
        _sum: { onHand: true },
      });
      const averageCost = averageCostAfter(
        num(totals._sum.onHand),
        unitCost,
        quantity,
        cost,
      );
      await tx.stockItem.update({
        where: { productId_variantKey: { productId: product.id, variantKey } },
        data: { averageCost },
      });
      unitCost = cost;
    }

    if (quantity > 0) {
      await tx.stockLevel.upsert({
        where: { productId_variantKey_locationId_batchKey: key },
        update: { onHand: { increment: quantity } },
        create: { ...key, onHand: quantity },
      });
    } else {
      // Only what is not reserved can leave, and never more than there is.
      const changed =
        await tx.$executeRaw`UPDATE "StockLevel" SET "onHand" = "onHand" + ${quantity}, "updatedAt" = now()
        WHERE "productId" = ${product.id} AND "variantKey" = ${variantKey} AND "locationId" = ${input.locationId} AND "batchKey" = ${batchKey}
          AND "onHand" - "reserved" + ${quantity} >= 0`;
      if (changed === 0) throw publicError("stockInsufficient");
    }
    await tx.stockMovement.create({
      data: {
        type: input.type,
        ...key,
        quantity,
        unitCost,
        sourceType: input.sourceType ?? "manual",
        sourceId: input.sourceId ?? null,
        transferId: input.transferId ?? null,
        reason: input.reason ?? null,
        note: input.note?.trim().slice(0, 500) || null,
        createdById: userId,
      },
    });
    touched.set(`${product.id}|${variantKey}`, {
      productId: product.id,
      variantKey,
    });
  }
  // Surface deferred integrity failures before Prisma commits the interactive transaction.
  await tx.$executeRaw`SET CONSTRAINTS "stock_serial_conservation", "serial_stock_conservation" IMMEDIATE`;
  await tx.$executeRaw`SET CONSTRAINTS "stock_serial_conservation", "serial_stock_conservation" DEFERRED`;
  return lowStockAfter(tx, Array.from(touched.values()));
}

/** Of the items given, those now at or below their reorder point that have not been alerted yet (marked alerted). */
async function lowStockAfter(
  tx: Tx,
  items: { productId: string; variantKey: string }[],
) {
  const low: {
    productId: string;
    variantKey: string;
    available: number;
    reorderPoint: number;
  }[] = [];
  for (const { productId, variantKey } of items) {
    const item = await tx.stockItem.findUnique({
      where: { productId_variantKey: { productId, variantKey } },
    });
    if (!item || item.reorderPoint == null) continue;
    const totals = await tx.stockLevel.aggregate({
      where: { productId, variantKey },
      _sum: { onHand: true, reserved: true },
    });
    const available = num(totals._sum.onHand) - num(totals._sum.reserved);
    const point = num(item.reorderPoint);
    if (available <= point && !item.lowAlertedAt) {
      await tx.stockItem.update({
        where: { id: item.id },
        data: { lowAlertedAt: new Date() },
      });
      low.push({ productId, variantKey, available, reorderPoint: point });
    } else if (available > point && item.lowAlertedAt) {
      // Back above the point: the next dip alerts again.
      await tx.stockItem.update({
        where: { id: item.id },
        data: { lowAlertedAt: null },
      });
    }
  }
  return low;
}

/** Holds stock for an order (or releases it with a negative quantity); reserved stock cannot be sold or moved. */
export async function reserveStock(
  tx: Tx,
  input: {
    productId: string;
    variantId?: string;
    locationId: string;
    batchKey?: string;
    quantity: number;
  },
) {
  const quantity = roundQuantity(input.quantity);
  const variantKey = input.variantId ?? "";
  const batchKey = input.batchKey ?? "";
  const changed =
    await tx.$executeRaw`UPDATE "StockLevel" SET "reserved" = "reserved" + ${quantity}, "updatedAt" = now()
    WHERE "productId" = ${input.productId} AND "variantKey" = ${variantKey} AND "locationId" = ${input.locationId} AND "batchKey" = ${batchKey}
      AND "reserved" + ${quantity} >= 0 AND "onHand" - "reserved" - ${quantity} >= 0`;
  if (changed === 0) throw publicError("stockInsufficient");
}

// ─── What people do on the stock screen ──────────────────────────────────────────────────────────────────────────

export interface StockChangeInput {
  /** receipt | adjustment | write_off */
  type: string;
  productId: string;
  variantId?: string;
  locationId: string;
  /** Always positive here; adjustments say which way with `direction`. */
  quantity: number;
  /** For adjustments: "in" (found more) or "out" (found less). */
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
  return db.$transaction((tx) =>
    postMovements(
      tx,
      [
        {
          type: input.type as MovementType,
          productId: input.productId,
          variantId: input.variantId || undefined,
          locationId: input.locationId,
          quantity: sign * amount,
          unitCost: input.unitCost,
          batchNumber: input.batchNumber,
          expiryDate: input.expiryDate,
          reason: input.type === "receipt" ? undefined : input.reason,
          note: input.note,
        },
      ],
      userId,
    ),
  );
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

/** Moves stock between locations or warehouses: two ledger rows sharing one transfer id. */
export async function transferStock(
  input: TransferInput,
  userId: string | null,
) {
  const amount = roundQuantity(Math.abs(Number(input.quantity)));
  if (!amount) throw new Error(serverMessages.stockQuantityInvalid);
  if (input.fromLocationId === input.toLocationId)
    throw new Error(serverMessages.stockTransferSame);
  const transferId = randomUUID();
  const base = {
    productId: input.productId,
    variantId: input.variantId || undefined,
    batchNumber: input.batchNumber,
    sourceType: "transfer",
    transferId,
    note: input.note,
  };
  return db.$transaction((tx) =>
    postMovements(
      tx,
      [
        {
          ...base,
          type: "transfer_out",
          locationId: input.fromLocationId,
          quantity: -amount,
        },
        {
          ...base,
          type: "transfer_in",
          locationId: input.toLocationId,
          quantity: amount,
        },
      ],
      userId,
    ),
  );
}

export async function setReorderPoint(
  productId: string,
  variantKey: string,
  reorderPoint: number | null,
  reorderQuantity: number | null,
) {
  for (const value of [reorderPoint, reorderQuantity])
    if (
      value != null &&
      (!Number.isFinite(value) || value < 0 || value > 10_000_000)
    )
      throw new Error(serverMessages.stockQuantityInvalid);
  await db.stockItem.upsert({
    where: { productId_variantKey: { productId, variantKey } },
    update: { reorderPoint, reorderQuantity, lowAlertedAt: null },
    create: { productId, variantKey, reorderPoint, reorderQuantity },
  });
}

// ─── Reading stock ───────────────────────────────────────────────────────────────────────────────────────────────

/** One stock item (a product, or one variant of it) with its totals. */
export interface StockRow {
  product_id: string;
  variant_id: string | null;
  sku: string;
  name_en: string;
  name_ar: string;
  variant_values: string[];
  /** "M / Red" in each language; empty for a product without variants. */
  variant_en: string;
  variant_ar: string;
  unit: string;
  track_batches: boolean;
  on_hand: number;
  reserved: number;
  available: number;
  reorder_point: number | null;
  average_cost: number;
  value: number;
  low: boolean;
}

export interface StockQuery {
  search?: string;
  warehouseId?: string;
  /** "low" for items at or below their reorder point, "out" for none available. */
  filter?: string;
  page?: number;
  pageSize?: number;
}

/** Stock by item (variants listed separately), optionally for one warehouse; newest products first. */
export async function getStockOverview(query: StockQuery = {}, actorId?: string) {
  const locationScope = await scopedLocations(actorId, query.warehouseId);
  const pageSize = Math.min(Math.max(query.pageSize ?? 25, 1), 100);
  const page = Math.max(query.page ?? 1, 1);
  const search = query.search?.trim().slice(0, 80);
  const products = await db.product.findMany({
    where: {
      trackStock: true,
      ...(search
        ? {
            OR: [
              { nameEn: { contains: search, mode: "insensitive" } },
              { nameAr: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
              { barcode: search },
              {
                variants: {
                  some: {
                    OR: [
                      { sku: { contains: search, mode: "insensitive" } },
                      { barcode: search },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: {
      id: true,
      sku: true,
      nameEn: true,
      nameAr: true,
      unit: true,
      trackBatches: true,
      options: true,
      variants: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, sku: true, optionValues: true },
      },
    },
    take: 5000,
  });
  const ids = products.map((p) => p.id);
  const [levels, items] = await Promise.all([
    db.stockLevel.groupBy({
      by: ["productId", "variantKey"],
      where: {
        productId: { in: ids },
        location: locationScope,
      },
      _sum: { onHand: true, reserved: true },
    }),
    db.stockItem.findMany({ where: { productId: { in: ids } } }),
  ]);
  const level = new Map(
    levels.map((l) => [`${l.productId}|${l.variantKey}`, l._sum]),
  );
  const item = new Map(items.map((i) => [`${i.productId}|${i.variantKey}`, i]));
  let rows: StockRow[] = products.flatMap((p) => {
    const options = normalizeProductOptions(p.options) ?? [];
    return (
      p.variants.length
        ? p.variants.map((v) => ({ variant: v as typeof v | null }))
        : [{ variant: null }]
    ).map(({ variant }) => {
      const key = `${p.id}|${variant?.id ?? ""}`;
      const onHand = num(level.get(key)?.onHand);
      const reserved = num(level.get(key)?.reserved);
      const stock = item.get(key);
      const reorderPoint = numOrNull(stock?.reorderPoint);
      const averageCost = num(stock?.averageCost);
      return {
        product_id: p.id,
        variant_id: variant?.id ?? null,
        sku: variant?.sku ?? p.sku,
        name_en: p.nameEn,
        name_ar: p.nameAr,
        variant_values: variant?.optionValues ?? [],
        variant_en: variant
          ? variantLabel(options, variant.optionValues, "en")
          : "",
        variant_ar: variant
          ? variantLabel(options, variant.optionValues, "ar")
          : "",
        unit: p.unit,
        track_batches: p.trackBatches,
        on_hand: onHand,
        reserved,
        available: roundQuantity(onHand - reserved),
        reorder_point: reorderPoint,
        average_cost: averageCost,
        value: Math.round(onHand * averageCost * 1000) / 1000,
        low: reorderPoint != null && onHand - reserved <= reorderPoint,
      };
    });
  });
  if (query.filter === "low") rows = rows.filter((r) => r.low);
  if (query.filter === "out") rows = rows.filter((r) => r.available <= 0);
  const totalValue =
    Math.round(rows.reduce((sum, r) => sum + r.value, 0) * 1000) / 1000;
  return {
    rows: rows.slice((page - 1) * pageSize, page * pageSize),
    total: rows.length,
    page,
    pageSize,
    totalValue,
  };
}

/** One product's stock by variant, location and batch, its reorder points and recent movements. */
export async function getProductStock(productId: string, actorId?: string) {
  const locationScope = await scopedLocations(actorId);
  const [levels, items, movements, batches] = await Promise.all([
    db.stockLevel.findMany({
      where: { productId, location: locationScope },
      include: { location: { include: { warehouse: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    db.stockItem.findMany({ where: { productId } }),
    db.stockMovement.findMany({
      where: { productId, location: locationScope },
      include: { location: { include: { warehouse: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.stockBatch.findMany({ where: { productId } }),
  ]);
  const batch = new Map(batches.map((b) => [b.id, b]));
  return {
    levels: levels
      .filter((l) => num(l.onHand) !== 0 || num(l.reserved) !== 0)
      .map((l) => ({
        variant_key: l.variantKey,
        location_id: l.locationId,
        location: `${l.location.warehouse.code} · ${l.location.code}`,
        batch: batch.get(l.batchKey)?.batchNumber ?? null,
        expiry:
          batch.get(l.batchKey)?.expiryDate?.toISOString().slice(0, 10) ?? null,
        on_hand: num(l.onHand),
        reserved: num(l.reserved),
      })),
    items: items.map((i) => ({
      variant_key: i.variantKey,
      reorder_point: numOrNull(i.reorderPoint),
      reorder_quantity: numOrNull(i.reorderQuantity),
      average_cost: num(i.averageCost),
    })),
    movements: movements.map(movementRecord(batch)),
  };
}

export interface MovementRecord {
  id: string;
  type: string;
  product_id: string;
  variant_key: string;
  location_id: string;
  location: string;
  batch: string | null;
  quantity: number;
  unit_cost: number;
  source_type: string;
  source_id: string | null;
  reason: string | null;
  note: string | null;
  created_at: string;
}

const movementRecord =
  (batch: Map<string, { batchNumber: string }>) =>
  (
    m: Prisma.StockMovementGetPayload<{
      include: { location: { include: { warehouse: true } } };
    }>,
  ): MovementRecord => ({
    id: m.id,
    type: m.type,
    product_id: m.productId,
    variant_key: m.variantKey,
    location_id: m.locationId,
    location: `${m.location.warehouse.code} · ${m.location.code}`,
    batch: batch.get(m.batchKey)?.batchNumber ?? null,
    quantity: num(m.quantity),
    unit_cost: num(m.unitCost),
    source_type: m.sourceType,
    source_id: m.sourceId,
    reason: m.reason,
    note: m.note,
    created_at: m.createdAt.toISOString(),
  });

export interface MovementQuery {
  productId?: string;
  warehouseId?: string;
  type?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

/** The ledger, newest first, with the product names for display. */
export async function listMovements(query: MovementQuery = {}, actorId?: string) {
  const locationScope = await scopedLocations(actorId, query.warehouseId);
  const pageSize = Math.min(Math.max(query.pageSize ?? 50, 1), 200);
  const page = Math.max(query.page ?? 1, 1);
  const date = (value: string | undefined, end = false) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
    return new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}Z`);
  };
  const where: Prisma.StockMovementWhereInput = {
    ...(query.productId ? { productId: query.productId } : {}),
    location: locationScope,
    ...(query.type ? { type: query.type } : {}),
    ...(date(query.from) || date(query.to, true)
      ? { createdAt: { gte: date(query.from), lte: date(query.to, true) } }
      : {}),
  };
  const [rows, total] = await Promise.all([
    db.stockMovement.findMany({
      where,
      include: { location: { include: { warehouse: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.stockMovement.count({ where }),
  ]);
  const [products, variants, batches, people] = await Promise.all([
    db.product.findMany({
      where: { id: { in: Array.from(new Set(rows.map((r) => r.productId))) } },
      select: { id: true, sku: true, nameEn: true, nameAr: true },
    }),
    db.productVariant.findMany({
      where: {
        id: {
          in: Array.from(
            new Set(rows.map((r) => r.variantKey).filter(Boolean)),
          ),
        },
      },
      select: { id: true, sku: true },
    }),
    db.stockBatch.findMany({
      where: {
        id: {
          in: Array.from(new Set(rows.map((r) => r.batchKey).filter(Boolean))),
        },
      },
    }),
    db.user.findMany({
      where: {
        id: {
          in: Array.from(
            new Set(
              rows.map((r) => r.createdById).filter((id): id is string => !!id),
            ),
          ),
        },
      },
      select: { id: true, fullName: true },
    }),
  ]);
  const batch = new Map(batches.map((b) => [b.id, b]));
  return {
    rows: rows.map((m) => {
      const product = products.find((p) => p.id === m.productId);
      return {
        ...movementRecord(batch)(m),
        sku:
          variants.find((v) => v.id === m.variantKey)?.sku ??
          product?.sku ??
          "",
        name_en: product?.nameEn ?? "",
        name_ar: product?.nameAr ?? "",
        by: people.find((u) => u.id === m.createdById)?.fullName ?? null,
      };
    }),
    total,
    page,
    pageSize,
  };
}

/** Batches that expire within the days given (or have expired) and still have stock. */
export async function expiringBatches(days = 30, actorId?: string) {
  const locationScope = await scopedLocations(actorId);
  const limit = new Date(Date.now() + days * 86_400_000);
  const batches = await db.stockBatch.findMany({
    where: { expiryDate: { lte: limit } },
    orderBy: { expiryDate: "asc" },
    take: 200,
  });
  if (!batches.length) return [];
  const levels = await db.stockLevel.groupBy({
    by: ["batchKey"],
    where: { batchKey: { in: batches.map((b) => b.id) }, location: locationScope },
    _sum: { onHand: true },
  });
  const products = await db.product.findMany({
    where: { id: { in: Array.from(new Set(batches.map((b) => b.productId))) } },
    select: { id: true, sku: true, nameEn: true, nameAr: true },
  });
  return batches
    .map((b) => ({
      batch: b,
      onHand: num(levels.find((l) => l.batchKey === b.id)?._sum.onHand),
    }))
    .filter(({ onHand }) => onHand > 0)
    .map(({ batch: b, onHand }) => {
      const product = products.find((p) => p.id === b.productId);
      return {
        product_id: b.productId,
        sku: product?.sku ?? "",
        name_en: product?.nameEn ?? "",
        name_ar: product?.nameAr ?? "",
        batch: b.batchNumber,
        expiry: b.expiryDate!.toISOString().slice(0, 10),
        on_hand: onHand,
      };
    });
}

// ─── Stock counts ────────────────────────────────────────────────────────────────────────────────────────────────

export interface StockCountInput {
  warehouseId: string;
  /** full | cycle */
  scope: string;
  /** For a cycle count: the products to count, or a category. */
  productIds?: string[];
  categoryId?: string;
  note?: string;
}

/** Starts a count: every stock line in the warehouse (or the chosen products) with what is expected now. */
export async function createStockCount(
  input: StockCountInput,
  userId: string | null,
) {
  const warehouse = await db.warehouse.findUnique({
    where: { id: input.warehouseId },
    include: { locations: { where: { isActive: true } } },
  });
  if (!warehouse || !warehouse.isActive)
    throw new Error(serverMessages.stockLocationMissing);
  if (input.scope !== "full" && input.scope !== "cycle")
    throw new Error(serverMessages.stockCountScopeInvalid);
  let productFilter: string[] | undefined;
  if (input.scope === "cycle") {
    const chosen = input.categoryId
      ? (
          await db.product.findMany({
            where: { categoryId: input.categoryId, trackStock: true },
            select: { id: true },
          })
        ).map((p) => p.id)
      : (input.productIds ?? []).slice(0, 500);
    if (!chosen.length) throw new Error(serverMessages.stockCountScopeInvalid);
    productFilter = chosen;
  }
  const levels = await db.stockLevel.findMany({
    where: {
      locationId: { in: warehouse.locations.map((l) => l.id) },
      ...(productFilter ? { productId: { in: productFilter } } : {}),
    },
  });
  // Products chosen for a cycle count that have no stock line yet are counted at the warehouse's first location.
  const missing = productFilter
    ? await db.product.findMany({
        where: {
          id: {
            in: productFilter.filter(
              (id) => !levels.some((l) => l.productId === id),
            ),
          },
          trackStock: true,
        },
        select: { id: true, variants: { select: { id: true } } },
      })
    : [];
  const first = warehouse.locations[0];
  return db.$transaction(async (tx) => {
    const number = await getNextSequenceNumber("CNT", undefined, tx);
    return tx.stockCount.create({
      data: {
        number,
        warehouseId: warehouse.id,
        scope: input.scope,
        note: input.note?.trim().slice(0, 500) || null,
        createdById: userId,
        lines: {
          create: [
            ...levels.map((l) => ({
              productId: l.productId,
              variantKey: l.variantKey,
              locationId: l.locationId,
              batchKey: l.batchKey,
              expected: l.onHand,
            })),
            ...(first
              ? missing.flatMap((p) =>
                  (p.variants.length ? p.variants.map((v) => v.id) : [""]).map(
                    (variantKey) => ({
                      productId: p.id,
                      variantKey,
                      locationId: first.id,
                      batchKey: "",
                      expected: 0,
                    }),
                  ),
                )
              : []),
          ],
        },
      },
    });
  });
}

export interface StockCountLineRecord {
  id: string;
  product_id: string;
  variant_key: string;
  sku: string;
  barcode: string | null;
  name_en: string;
  name_ar: string;
  variant_values: string[];
  location: string;
  batch: string | null;
  expected: number;
  counted: number | null;
  variance: number;
  note: string;
}

export async function getStockCount(id: string, actorId?: string) {
  if(actorId)await requireStockCountAccess(actorId,id,"read");
  const count = await db.stockCount.findUnique({
    where: { id },
    include: { warehouse: true, lines: true },
  });
  if (!count) return null;
  const [products, variants, locations, batches, people] = await Promise.all([
    db.product.findMany({
      where: {
        id: { in: Array.from(new Set(count.lines.map((l) => l.productId))) },
      },
      select: {
        id: true,
        sku: true,
        barcode: true,
        nameEn: true,
        nameAr: true,
      },
    }),
    db.productVariant.findMany({
      where: {
        id: { in: count.lines.map((l) => l.variantKey).filter(Boolean) },
      },
      select: { id: true, sku: true, barcode: true, optionValues: true },
    }),
    db.stockLocation.findMany({ where: { warehouseId: count.warehouseId } }),
    db.stockBatch.findMany({
      where: { id: { in: count.lines.map((l) => l.batchKey).filter(Boolean) } },
    }),
    db.user.findMany({
      where: {
        id: {
          in: [count.createdById, count.approvedById].filter(
            (v): v is string => !!v,
          ),
        },
      },
      select: { id: true, fullName: true },
    }),
  ]);
  const lines: StockCountLineRecord[] = count.lines
    .map((l) => {
      const product = products.find((p) => p.id === l.productId);
      const variant = variants.find((v) => v.id === l.variantKey);
      const expected = num(l.expected);
      const counted = numOrNull(l.counted);
      return {
        id: l.id,
        product_id: l.productId,
        variant_key: l.variantKey,
        sku: variant?.sku ?? product?.sku ?? "",
        barcode: variant?.barcode ?? product?.barcode ?? null,
        name_en: product?.nameEn ?? "",
        name_ar: product?.nameAr ?? "",
        variant_values: variant?.optionValues ?? [],
        location: locations.find((loc) => loc.id === l.locationId)?.code ?? "",
        batch: batches.find((b) => b.id === l.batchKey)?.batchNumber ?? null,
        expected,
        counted,
        variance: countVariance(expected, counted),
        note: l.note ?? "",
      };
    })
    .sort(
      (a, b) =>
        a.location.localeCompare(b.location) || a.sku.localeCompare(b.sku),
    );
  const name = (userId: string | null) =>
    people.find((u) => u.id === userId)?.fullName ?? null;
  return {
    id: count.id,
    number: count.number,
    warehouse_id: count.warehouseId,
    warehouse: `${count.warehouse.code} · ${count.warehouse.nameEn}`,
    warehouse_en: count.warehouse.nameEn,
    warehouse_ar: count.warehouse.nameAr,
    scope: count.scope,
    status: count.status,
    note: count.note ?? "",
    created_by: name(count.createdById),
    approved_by: name(count.approvedById),
    created_at: count.createdAt.toISOString(),
    approved_at: count.approvedAt?.toISOString() ?? null,
    lines,
  };
}

export async function listStockCounts(actorId?: string) {
  const branchIds = actorId ? (await listAccessibleBranches(actorId)).map(b=>b.id) : null;
  const counts = await db.stockCount.findMany({
    where: branchIds ? {warehouse:{branchId:{in:branchIds}}} : {},
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      warehouse: true,
      _count: { select: { lines: true } },
      lines: { select: { counted: true } },
    },
  });
  return counts.map((c) => ({
    id: c.id,
    number: c.number,
    warehouse_en: c.warehouse.nameEn,
    warehouse_ar: c.warehouse.nameAr,
    scope: c.scope,
    status: c.status,
    lines: c._count.lines,
    counted: c.lines.filter((l) => l.counted != null).length,
    created_at: c.createdAt.toISOString(),
  }));
}

// All count writers lock this row so status checks and ledger posting see one current state.
async function lockStockCount(tx: Tx, countId: string) {
  const [count] = await tx.$queryRaw<
    StockCount[]
  >`SELECT * FROM "StockCount" WHERE "id" = ${countId} FOR UPDATE`;
  if (!count) throw new Error(serverMessages.stockCountMissing);
  return count;
}

/** Saves counted quantities (empty to clear) while the count is open. */
export async function recordCountedQuantities(
  countId: string,
  entries: { lineId: string; counted: string; note?: string }[],
) {
  if (
    entries.length > 200 ||
    new Set(entries.map((entry) => entry.lineId)).size !== entries.length
  )
    throw new Error(serverMessages.stockCountLinesInvalid);
  await db.$transaction(async (tx) => {
    const count = await lockStockCount(tx, countId);
    if (count.status !== "counting")
      throw new Error(serverMessages.stockCountClosed);
    for (const entry of entries) {
      const text = entry.counted.trim();
      const counted = text === "" ? null : roundQuantity(Number(text));
      if (
        counted != null &&
        (!Number.isFinite(counted) || counted < 0 || counted > 10_000_000)
      )
        throw new Error(serverMessages.stockQuantityInvalid);
      const result = await tx.stockCountLine.updateMany({
        where: { id: entry.lineId, countId },
        data: {
          counted,
          note:
            entry.note === undefined
              ? undefined
              : entry.note.trim().slice(0, 200) || null,
        },
      });
      if (result.count !== 1)
        throw new Error(serverMessages.stockCountLinesInvalid);
    }
  });
}

/** Adds an item found during the count that had no line (a product or variant at a location of the warehouse). */
export async function addCountLine(
  countId: string,
  input: { productId: string; variantId?: string; locationId: string },
) {
  return db.$transaction(async (tx) => {
    const count = await lockStockCount(tx, countId);
    if (count.status !== "counting")
      throw new Error(serverMessages.stockCountClosed);
    const location = await tx.stockLocation.findFirst({
      where: { id: input.locationId, warehouseId: count.warehouseId },
    });
    if (!location) throw new Error(serverMessages.stockLocationMissing);
    const product = await tx.product.findUnique({
      where: { id: input.productId },
      select: {
        trackStock: true,
        trackBatches: true,
        variants: { select: { id: true } },
      },
    });
    if (!product?.trackStock) throw new Error(serverMessages.stockNotTracked);
    if (product.trackBatches)
      throw new Error(serverMessages.stockBatchRequired);
    const variantKey = input.variantId ?? "";
    if (
      product.variants.length
        ? !product.variants.some((v) => v.id === variantKey)
        : variantKey
    )
      throw new Error(serverMessages.stockVariantRequired);
    const level = await tx.stockLevel.findUnique({
      where: {
        productId_variantKey_locationId_batchKey: {
          productId: input.productId,
          variantKey,
          locationId: location.id,
          batchKey: "",
        },
      },
    });
    return tx.stockCountLine.upsert({
      where: {
        countId_productId_variantKey_locationId_batchKey: {
          countId,
          productId: input.productId,
          variantKey,
          locationId: location.id,
          batchKey: "",
        },
      },
      update: {},
      create: {
        countId,
        productId: input.productId,
        variantKey,
        locationId: location.id,
        batchKey: "",
        expected: level?.onHand ?? 0,
      },
    });
  });
}

/** Finds the product or variant with this barcode or SKU, for scanning during a count. */
export async function findByCode(code: string) {
  const text = code.trim().slice(0, 60);
  if (!text) return null;
  const variant = await db.productVariant.findFirst({
    where: {
      OR: [{ barcode: text }, { sku: { equals: text, mode: "insensitive" } }],
    },
    select: { id: true, productId: true },
  });
  if (variant) return { productId: variant.productId, variantId: variant.id };
  const product = await db.product.findFirst({
    where: {
      OR: [{ barcode: text }, { sku: { equals: text, mode: "insensitive" } }],
    },
    select: { id: true },
  });
  return product ? { productId: product.id, variantId: undefined } : null;
}

export async function setStockCountStatus(
  countId: string,
  status: "review" | "counting" | "cancelled",
) {
  await db.$transaction(async (tx) => {
    const count = await lockStockCount(tx, countId);
    const allowed: Record<string, string[]> = {
      review: ["counting"],
      counting: ["review"],
      cancelled: ["counting", "review"],
    };
    if (!allowed[status].includes(count.status))
      throw new Error(serverMessages.stockCountClosed);
    await tx.stockCount.update({
      where: { id: countId },
      data: {
        status,
        submittedAt: status === "review" ? new Date() : undefined,
      },
    });
  });
}

/**
 * Approves a reviewed count: each counted line whose count differs from what was expected becomes a "count"
 * movement for the difference (lines left uncounted change nothing). Returns low-stock items for alerts.
 */
export async function approveStockCount(
  countId: string,
  userId: string | null,
) {
  return db.$transaction(async (tx) => {
    const count = await lockStockCount(tx, countId);
    if (count.status !== "review")
      throw new Error(serverMessages.stockCountClosed);
    const lines = await tx.stockCountLine.findMany({ where: { countId } });
    const batches = await tx.stockBatch.findMany({
      where: { id: { in: lines.map((l) => l.batchKey).filter(Boolean) } },
    });
    const movements: MovementInput[] = lines
      .map((l) => ({
        line: l,
        variance: countVariance(num(l.expected), numOrNull(l.counted)),
      }))
      .filter(({ variance }) => variance !== 0)
      .map(({ line, variance }) => ({
        type: "count" as const,
        productId: line.productId,
        variantId: line.variantKey || undefined,
        locationId: line.locationId,
        batchNumber: batches.find((b) => b.id === line.batchKey)?.batchNumber,
        quantity: variance,
        sourceType: "stock_count",
        sourceId: count.id,
        note: count.number,
      }));
    // Counted stock replaces what the books said, so a count may take reserved stock below its reservation.
    for (const m of movements.filter((m) => m.quantity < 0)) {
      const variantKey = m.variantId ?? "";
      const batchKey =
        lines.find(
          (l) =>
            l.productId === m.productId &&
            l.variantKey === variantKey &&
            l.locationId === m.locationId,
        )?.batchKey ?? "";
      await tx.$executeRaw`UPDATE "StockLevel" SET "reserved" = LEAST("reserved", GREATEST("onHand" + ${m.quantity}, 0)) WHERE "productId" = ${m.productId} AND "variantKey" = ${variantKey} AND "locationId" = ${m.locationId} AND "batchKey" = ${batchKey}`;
    }
    const low = await postMovements(tx, movements, userId);
    await tx.stockCount.update({
      where: { id: countId },
      data: {
        status: "approved",
        approvedById: userId,
        approvedAt: new Date(),
      },
    });
    return { low, adjusted: movements.length };
  });
}
