import { runAtomicMutation } from "../api/atomic";
import { listTableRows, upsertTableRow } from "../api/tables";
import { requireStockLocationAccess } from "./branches";
import { postMovements } from "./inventory";
import { uniqueSerials } from "../constants/stock-traceability";

export interface FulfillSerializedOrderLine {
  lineId: string;
  serialCodes: string[];
}

export async function fulfillSerializedOrder(
  orderId: string,
  lines: FulfillSerializedOrderLine[],
  actorId: string,
) {
  return runAtomicMutation(async () => {
    const [orders, orderLines, allSerials] = await Promise.all([
      listTableRows<Record<string, any>>("commerce", "sales_order"),
      listTableRows<Record<string, any>>("commerce", "sales_order_line"),
      listTableRows<Record<string, any>>("inventory", "stock_serial"),
    ]);
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error("Sales order not found");
    const linesForOrder = orderLines.filter((l) => l.orderId === orderId);

    for (const reqLine of lines) {
      const line = linesForOrder.find((l) => l.id === reqLine.lineId);
      if (!line) throw new Error("Sales order line not found");
      const requiredQty = Number(line.quantity);
      if (!Array.isArray(reqLine.serialCodes) || reqLine.serialCodes.length !== requiredQty) {
        throw new Error("Serial count does not match line quantity");
      }
      const codes = uniqueSerials(reqLine.serialCodes);
      const codeSet = new Set(codes);

      if (!line.locationId) {
        throw new Error("Location is unavailable or has no branch");
      }
      await requireStockLocationAccess(actorId, String(line.locationId), true);

      const serials = allSerials.filter(
        (s) =>
          codeSet.has(String(s.code)) &&
          s.productId === line.productId &&
          (s.variantKey ?? "") === (line.variantKey ?? "") &&
          s.locationId === line.locationId &&
          s.status === "available",
      );
      if (serials.length !== codes.length) {
        throw new Error("Serial not available for sale");
      }

      for (const s of serials) {
        await upsertTableRow("inventory", "stock_serial", {
          id: s.id,
          status: "sold",
          locationId: null,
          revision: Number(s.revision ?? 0) + 1,
        });
      }

      await postMovements(
        null,
        [
          {
            type: "sale",
            productId: String(line.productId),
            variantId: line.variantKey || undefined,
            locationId: String(line.locationId),
            quantity: -requiredQty,
            sourceType: "order",
            sourceId: orderId,
            note: `Fulfilled order ${order.number}`,
          },
        ],
        actorId,
      );

      await upsertTableRow("inventory", "stock_trace_event", {
        id: crypto.randomUUID(),
        entityType: "sales_order",
        entityId: orderId,
        revision: 1,
        action: "serial_fulfilled",
        actorId,
        details: { lineId: line.id, codes },
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

export async function returnSerializedOrder(
  orderId: string,
  lines: ReturnSerializedOrderLine[],
  actorId: string,
) {
  return runAtomicMutation(async () => {
    const [orders, orderLines, allSerials] = await Promise.all([
      listTableRows<Record<string, any>>("commerce", "sales_order"),
      listTableRows<Record<string, any>>("commerce", "sales_order_line"),
      listTableRows<Record<string, any>>("inventory", "stock_serial"),
    ]);
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error("Sales order not found");
    const linesForOrder = orderLines.filter((l) => l.orderId === orderId);

    for (const reqLine of lines) {
      const line = linesForOrder.find((l) => l.id === reqLine.lineId);
      if (!line) throw new Error("Sales order line not found");
      const codes = uniqueSerials(reqLine.serialCodes);
      if (codes.length === 0) {
        throw new Error("Duplicate or invalid serial identifier");
      }
      const codeSet = new Set(codes);

      await requireStockLocationAccess(actorId, reqLine.locationId, true);

      const serials = allSerials.filter(
        (s) =>
          codeSet.has(String(s.code)) &&
          s.productId === line.productId &&
          (s.variantKey ?? "") === (line.variantKey ?? "") &&
          s.status === "sold",
      );
      if (serials.length !== codes.length) {
        throw new Error("Serial was not sold on this order");
      }

      for (const s of serials) {
        await upsertTableRow("inventory", "stock_serial", {
          id: s.id,
          status: "available",
          locationId: reqLine.locationId,
          revision: Number(s.revision ?? 0) + 1,
        });
      }

      await upsertTableRow("commerce", "sales_order_line", {
        id: line.id,
        returnedQuantity: Number(line.returnedQuantity ?? 0) + codes.length,
      });

      await postMovements(
        null,
        [
          {
            type: "return",
            productId: String(line.productId),
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

      await upsertTableRow("inventory", "stock_trace_event", {
        id: crypto.randomUUID(),
        entityType: "sales_order",
        entityId: orderId,
        revision: 2,
        action: "serial_returned",
        actorId,
        details: { lineId: line.id, codes, returnLocationId: reqLine.locationId },
      });
    }

    return { id: orderId, returned: true };
  });
}

export async function getAvailableSerials(
  productId: string,
  locationId: string,
  variantKey = "",
  batchKey = "",
) {
  const serials = await listTableRows<Record<string, any>>("inventory", "stock_serial", "code ASC");
  return serials
    .filter(
      (s) =>
        s.productId === productId &&
        s.locationId === locationId &&
        (s.variantKey ?? "") === variantKey &&
        (s.batchKey ?? "") === batchKey &&
        s.status === "available",
    )
    .sort((a, b) => String(a.code ?? "").localeCompare(String(b.code ?? "")))
    .map((s) => ({
      id: String(s.id),
      code: String(s.code ?? ""),
      revision: Number(s.revision ?? 1),
    }));
}
