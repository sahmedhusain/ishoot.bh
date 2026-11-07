import { createHash } from "node:crypto";
import { db, runAtomicMutation } from "../atomic";
import { requireStockLocationAccess } from "./branches";
import { postMovements } from "./inventory";
import { uniqueSerials } from "../constants/stock-traceability";

/** Scan every generated label before activating its association with existing physical stock. */
export async function verifyGeneratedSerials(
  generationId: string,
  scannedCodes: string[],
  actorId: string,
) {
  const codes = uniqueSerials(scannedCodes);
  return runAtomicMutation(async () => {
    const generation = await db.serialGeneration.findUniqueOrThrow({
      where: { id: generationId },
    });
    await requireStockLocationAccess(actorId, generation.locationId, true);
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`serial-generation:${generationId}`}, 0))`;
    const serials = await db.stockSerial.findMany({ where: { generationId } });
    if (
      codes.length !== generation.quantity ||
      serials.length !== codes.length ||
      serials.some((s) => !codes.includes(s.code))
    )
      throw new Error("Scans must match every generated identifier");
    const eventId = `serial-verified:${generationId}`;
    if (await db.stockTraceEvent.findUnique({ where: { id: eventId } }))
      return { id: generationId };
    if (
      serials.some(
        (s) =>
          s.status !== "reserved" || s.locationId !== generation.locationId,
      )
    )
      throw new Error("Serial state changed; reconcile before verification");
    await db.stockSerial.updateMany({
      where: { generationId },
      data: { status: "available", revision: { increment: 1 } },
    });
    await db.stockTraceEvent.create({
      data: {
        id: eventId,
        entityType: "serial_generation",
        entityId: generationId,
        revision: 2,
        action: "scan_verified",
        actorId,
        details: { codes },
      },
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
/** A put-away/bin relocation within one warehouse. Branch dispatch uses a separate transit workflow. */
export async function moveSerialsBetweenBins(
  input: SerialBinMove,
  actorId: string,
) {
  const codes = uniqueSerials(input.serials.map((s) => s.code));
  if (
    codes.length > 1000 ||
    input.serials.some(
      (s) => !Number.isInteger(s.revision) || s.revision < 1,
    ) ||
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
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${operationId}, 0))`;
    const previous = await db.stockTraceEvent.findUnique({
      where: { id: operationId },
    });
    if (previous) {
      if (
        (previous.details as { requestHash?: string })?.requestHash !==
        requestHash
      )
        throw new Error("Idempotency key belongs to a different request");
      return { id: operationId };
    }
    const serials = await db.stockSerial.findMany({
      where: { code: { in: codes } },
      orderBy: [{ productId: "asc" }, { variantKey: "asc" }, { code: "asc" }],
    });
    if (
      serials.length !== codes.length ||
      serials.some(
        (s) =>
          s.locationId !== source.id ||
          s.status !== "available" ||
          s.packageId ||
          s.revision !==
            input.serials.find((requested) => requested.code === s.code)
              ?.revision,
      )
    )
      throw new Error("Serial state changed; reconcile before movement");
    for (const serial of serials) {
      const changed = await db.stockSerial.updateMany({
        where: {
          id: serial.id,
          revision: serial.revision,
          status: "available",
          locationId: source.id,
          packageId: null,
        },
        data: { locationId: destination.id, revision: { increment: 1 } },
      });
      if (changed.count !== 1)
        throw new Error("Serial state changed; reconcile before movement");
      const batch = serial.batchKey
        ? await db.stockBatch.findUniqueOrThrow({
            where: { id: serial.batchKey },
          })
        : null;
      const common = {
        productId: serial.productId,
        variantId: serial.variantKey || undefined,
        batchNumber: batch?.batchNumber,
        sourceType: "serial_bin_move",
        sourceId: operationId,
        transferId: operationId,
      };
      await postMovements(
        db,
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
    await db.stockTraceEvent.create({
      data: {
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
      },
    });
    return { id: operationId };
  });
}
