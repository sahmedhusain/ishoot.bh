import { db, runAtomicMutation } from "../db";
import { requireStockLocationAccess } from "./branches";
import { postMovements } from "./inventory";
import { uniqueSerials } from "../constants/stock-traceability";

export interface FulfillSerializedOrderLine {
  lineId: string;
  serialCodes: string[];
}

/** Fulfill serialized order lines by checking availability, marking units as sold, and posting ledger movements. */
export async function fulfillSerializedOrder(
  orderId: string,
  lines: FulfillSerializedOrderLine[],
  actorId: string,
) {
  return runAtomicMutation(async () => {
    const order = await db.salesOrder.findUnique({
      where: { id: orderId },
      include: { lines: true },
    });
    if (!order) throw new Error("Sales order not found");

    for (const reqLine of lines) {
      const line = order.lines.find((l) => l.id === reqLine.lineId);
      if (!line) throw new Error("Sales order line not found");
      const requiredQty = Number(line.quantity);
      if (!Array.isArray(reqLine.serialCodes) || reqLine.serialCodes.length !== requiredQty) {
        throw new Error("Serial count does not match line quantity");
      }
      const codes = uniqueSerials(reqLine.serialCodes);

      if (!line.locationId) {
        throw new Error("Location is unavailable or has no branch");
      }
      await requireStockLocationAccess(actorId, line.locationId, true);

      const serials = await db.stockSerial.findMany({
        where: {
          code: { in: codes },
          productId: line.productId,
          variantKey: line.variantKey,
          locationId: line.locationId,
          status: "available",
        },
      });
      if (serials.length !== codes.length) {
        throw new Error("Serial not available for sale");
      }

      await db.stockSerial.updateMany({
        where: { code: { in: codes } },
        data: {
          status: "sold",
          locationId: null,
          revision: { increment: 1 },
        },
      });

      await postMovements(
        db,
        [
          {
            type: "sale",
            productId: line.productId,
            variantId: line.variantKey || undefined,
            locationId: line.locationId,
            quantity: -requiredQty,
            sourceType: "order",
            sourceId: orderId,
            note: `Fulfilled order ${order.number}`,
          },
        ],
        actorId,
      );

      await db.stockTraceEvent.create({
        data: {
          entityType: "sales_order",
          entityId: orderId,
          revision: 1,
          action: "serial_fulfilled",
          actorId,
          details: { lineId: line.id, codes },
        },
      });
    }

    return { id: orderId, fulfilled: true };
  });
}

export interface ReturnSerializedOrderLine {
  lineId: string;
  serialCodes: string[];
  locationId: string;
  reason?: string;
}

/** Return previously sold serialized items back to available inventory with traceability. */
export async function returnSerializedOrder(
  orderId: string,
  lines: ReturnSerializedOrderLine[],
  actorId: string,
) {
  return runAtomicMutation(async () => {
    const order = await db.salesOrder.findUnique({
      where: { id: orderId },
      include: { lines: true },
    });
    if (!order) throw new Error("Sales order not found");

    for (const reqLine of lines) {
      const line = order.lines.find((l) => l.id === reqLine.lineId);
      if (!line) throw new Error("Sales order line not found");
      const codes = uniqueSerials(reqLine.serialCodes);
      if (codes.length === 0) {
        throw new Error("Duplicate or invalid serial identifier");
      }

      await requireStockLocationAccess(actorId, reqLine.locationId, true);

      const serials = await db.stockSerial.findMany({
        where: {
          code: { in: codes },
          productId: line.productId,
          variantKey: line.variantKey,
          status: "sold",
        },
      });
      if (serials.length !== codes.length) {
        throw new Error("Serial was not sold on this order");
      }

      await db.stockSerial.updateMany({
        where: { code: { in: codes } },
        data: {
          status: "available",
          locationId: reqLine.locationId,
          revision: { increment: 1 },
        },
      });

      await db.salesOrderLine.update({
        where: { id: line.id },
        data: {
          returnedQuantity: { increment: codes.length },
        },
      });

      await postMovements(
        db,
        [
          {
            type: "return",
            productId: line.productId,
            variantId: line.variantKey || undefined,
            locationId: reqLine.locationId,
            quantity: codes.length,
            sourceType: "order",
            sourceId: orderId,
            reason: reqLine.reason || "found",
            note: `Returned from order ${order.number}`,
          },
        ],
        actorId,
      );

      await db.stockTraceEvent.create({
        data: {
          entityType: "sales_order",
          entityId: orderId,
          revision: 2,
          action: "serial_returned",
          actorId,
          details: { lineId: line.id, codes, returnLocationId: reqLine.locationId },
        },
      });
    }

    return { id: orderId, returned: true };
  });
}

/** Retrieve available serials at a location ready for scanning or sale. */
export async function getAvailableSerials(
  productId: string,
  locationId: string,
  variantKey = "",
  batchKey = "",
) {
  return db.stockSerial.findMany({
    where: {
      productId,
      locationId,
      variantKey,
      batchKey,
      status: "available",
    },
    select: {
      id: true,
      code: true,
      revision: true,
      packageId: true,
      batchKey: true,
      manufacturerSerial: true,
    },
    orderBy: { createdAt: "asc" },
  });
}
