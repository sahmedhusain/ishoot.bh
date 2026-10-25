import type { PrismaClient } from "@prisma/client";

/** A fresh tracked product with stock at the default warehouse, and nothing left from earlier runs. */
export async function freshStockedProduct(db: PrismaClient, input: { sku: string; nameEn: string; nameAr: string; price: number; onHand: number; catalogueItemId?: string }) {
  const old = await db.product.findMany({ where: { OR: [{ sku: input.sku }, ...(input.catalogueItemId ? [{ catalogueItemId: input.catalogueItemId }] : [])] }, select: { id: true } });
  const ids = old.map((p) => p.id);
  if (ids.length) {
    const orders = await db.salesOrderLine.findMany({ where: { productId: { in: ids } }, select: { orderId: true } });
    await db.salesOrder.deleteMany({ where: { id: { in: orders.map((o) => o.orderId) } } });
    await db.stockMovement.deleteMany({ where: { productId: { in: ids } } });
    await db.stockLevel.deleteMany({ where: { productId: { in: ids } } });
    await db.stockItem.deleteMany({ where: { productId: { in: ids } } });
    await db.product.deleteMany({ where: { id: { in: ids } } });
  }
  const warehouse =
    (await db.warehouse.findFirst({ where: { isDefault: true }, include: { locations: true } })) ??
    (await db.warehouse.create({ data: { code: "MAIN", nameEn: "Main warehouse", nameAr: "المستودع الرئيسي", isDefault: true, locations: { create: { code: "MAIN" } } }, include: { locations: true } }));
  const location = warehouse.locations.find((l) => l.isActive) ?? (await db.stockLocation.create({ data: { warehouseId: warehouse.id, code: "MAIN" } }));
  const product = await db.product.create({ data: { sku: input.sku, nameEn: input.nameEn, nameAr: input.nameAr, price: input.price, cost: 2, catalogueItemId: input.catalogueItemId } });
  await db.stockItem.create({ data: { productId: product.id, averageCost: 2 } });
  await db.stockLevel.create({ data: { productId: product.id, locationId: location.id, onHand: input.onHand } });
  return product;
}

export const stockOf = async (db: PrismaClient, productId: string) => {
  const sum = (await db.stockLevel.aggregate({ where: { productId }, _sum: { onHand: true, reserved: true } }))._sum;
  return { onHand: Number(sum.onHand ?? 0), reserved: Number(sum.reserved ?? 0) };
};

export async function enableStore(db: PrismaClient) {
  for (const [moduleKey, nameEn, nameAr] of [["products", "Products", "المنتجات"], ["store", "Online store", "المتجر الإلكتروني"]]) {
    await db.featureToggle.upsert({ where: { moduleKey }, update: { isEnabled: true }, create: { moduleKey, nameEn, nameAr, isEnabled: true } });
  }
  const settings = { guestCheckout: true, deliveryEnabled: true, deliveryFee: 1, freeDeliveryOver: null, pickupEnabled: true, codEnabled: true, bankTransferEnabled: false, paymentGateway: null };
  await db.storeSettings.upsert({ where: { id: "default" }, update: settings, create: { id: "default", ...settings } });
  // Each spec places several orders from one address; start every spec under the per-address limits.
  await db.abuseWindow.deleteMany({ where: { key: { startsWith: "store-" } } });
}
