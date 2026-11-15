import { createHash } from "node:crypto";
import { runAtomicMutation } from "../api/atomic";
import { listTableRows, upsertTableRow } from "../api/tables";
import { requireStockLocationAccess } from "./branches";
import { postMovements } from "./inventory";
import { uniqueSerials } from "../constants/stock-traceability";

export async function verifyGeneratedSerials(
  generationId: string,
  scannedCodes: string[],
  actorId: string,
) {
  const codes = uniqueSerials(scannedCodes);
  return runAtomicMutation(async () => {
    const [generations, allSerials, traceEvents] = await Promise.all([
      listTableRows<Record<string, any>>("system", "serial_generation"),
      listTableRows<Record<string, any>>("inventory", "stock_serial"),
      listTableRows<Record<string, any>>("inventory", "stock_trace_event"),
    ]);
    const generation = generations.find((g) => g.id === generationId);
    if (!generation) throw new Error("Serial generation not found");
    await requireStockLocationAccess(actorId, String(generation.locationId), true);

    const serials = allSerials.filter((s) => s.generationId === generationId);
    if (
      codes.length !== Number(generation.quantity) ||
      serials.length !== codes.length ||
      serials.some((s) => !codes.includes(String(s.code)))
    )
      throw new Error("Scans must match every generated identifier");

    const eventId = `serial-verified:${generationId}`;
    if (traceEvents.some((e) => e.id === eventId)) return { id: generationId };

    if (
      serials.some(
        (s) => s.status !== "reserved" || s.locationId !== generation.locationId,
      )
    )
      throw new Error("Serial state changed; reconcile before verification");

    for (const s of serials) {
      await upsertTableRow("inventory", "stock_serial", {
        id: s.id,
        status: "available",
        revision: Number(s.revision ?? 0) + 1,
      });
    }
    await upsertTableRow("inventory", "stock_trace_event", {
      id: eventId,
      entityType: "serial_generation",
      entityId: generationId,
      revision: 2,
      action: "scan_verified",
      actorId,
      details: { codes },
    });
    return { id: generationId };
  });
}

export interface SerialBinMove {
  sourceLocationId: string;
  destinationLocationId: string;
  serials: { code: string; revision: number }[];
  idempotencyKey: string;
}

export async function moveSerialsBetweenBins(
  input: SerialBinMove,
  actorId: string,
) {
  const codes = uniqueSerials(input.serials.map((s) => s.code));
  if (
    codes.length > 1000 ||
    input.serials.some((s) => !Number.isInteger(s.revision) || s.revision < 1) ||
    !/^[a-zA-Z0-9_-]{16,100}$/.test(input.idempotencyKey) ||
    input.sourceLocationId === input.destinationLocationId
  )
    throw new Error("Invalid serial movement");

  const requestHash = createHash("sha256")
    .update(
      JSON.stringify([
        actorId,
        input.sourceLocationId,
        input.destinationLocationId,
        [...input.serials]
          .sort((a, b) => a.code.localeCompare(b.code))
          .map((s) => [s.code, s.revision]),
      ]),
    )
    .digest("hex");
  const operationId = `serial-bin:${input.idempotencyKey}`;

  return runAtomicMutation(async () => {
    const source = await requireStockLocationAccess(
      actorId,
      input.sourceLocationId,
      true,
    );
    const destination = await requireStockLocationAccess(
      actorId,
      input.destinationLocationId,
      true,
    );
    if (source.warehouseId !== destination.warehouseId)
      throw new Error("Bin relocation requires the same warehouse");

    const [traceEvents, allSerials, allBatches] = await Promise.all([
      listTableRows<Record<string, any>>("inventory", "stock_trace_event"),
      listTableRows<Record<string, any>>("inventory", "stock_serial"),
      listTableRows<Record<string, any>>("inventory", "stock_batch"),
    ]);

    const previous = traceEvents.find((e) => e.id === operationId);
    if (previous) {
      if ((previous.details as { requestHash?: string })?.requestHash !== requestHash)
        throw new Error("Idempotency key belongs to a different request");
      return { id: operationId };
    }

    const codeSet = new Set(codes);
    const serials = allSerials
      .filter((s) => codeSet.has(String(s.code)))
      .sort(
        (a, b) =>
          String(a.productId).localeCompare(String(b.productId)) ||
          String(a.variantKey ?? "").localeCompare(String(b.variantKey ?? "")) ||
          String(a.code).localeCompare(String(b.code)),
      );

    if (
      serials.length !== codes.length ||
      serials.some(
        (s) =>
          s.locationId !== source.id ||
          s.status !== "available" ||
          s.packageId ||
          Number(s.revision) !==
            input.serials.find((requested) => requested.code === s.code)?.revision,
      )
    )
      throw new Error("Serial state changed; reconcile before movement");

    for (const serial of serials) {
      await upsertTableRow("inventory", "stock_serial", {
        id: serial.id,
        locationId: destination.id,
        revision: Number(serial.revision) + 1,
      });
      const batch = serial.batchKey
        ? allBatches.find((b) => b.id === serial.batchKey)
        : null;
      if (serial.batchKey && !batch) throw new Error("Stock batch not found");

      const common = {
        productId: String(serial.productId),
        variantId: serial.variantKey || undefined,
        batchNumber: batch?.batchNumber,
        sourceType: "serial_bin_move",
        sourceId: operationId,
        transferId: operationId,
      };
      await postMovements(
        null,
        [
          {
            ...common,
            type: "transfer_out",
            locationId: source.id,
            quantity: -1,
          },
          {
            ...common,
            type: "transfer_in",
            locationId: destination.id,
            quantity: 1,
          },
        ],
        actorId,
      );
    }

    await upsertTableRow("inventory", "stock_trace_event", {
      id: operationId,
      entityType: "serial_bin_move",
      entityId: operationId,
      revision: 1,
      action: "relocate",
      actorId,
      details: {
        requestHash,
        codes,
        sourceLocationId: source.id,
        destinationLocationId: destination.id,
      },
    });
    return { id: operationId };
  });
}
