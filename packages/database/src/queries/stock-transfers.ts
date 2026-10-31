import { createHash, randomUUID } from "node:crypto";
import { db, runAtomicMutation } from "../db";
import { requireBranchAccess, requireStockLocationAccess } from "./branches";
import { getEffectivePermissions } from "./permissions";
import { postMovements } from "./inventory";
import { uniqueSerials } from "../constants/stock-traceability";

type TransferCommand = {
  allocationId: string;
  revision: number;
  idempotencyKey: string;
};
function commandIdentity(key: string, payload: unknown) {
  if (!/^[A-Za-z0-9_-]{16,100}$/.test(key))
    throw new Error("Invalid transfer command");
  return {
    id: `stock-transfer:${key}`,
    hash: createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
  };
}
async function previousCommand(identity: ReturnType<typeof commandIdentity>) {
  await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${identity.id}, 0))`;
  const previous = await db.stockTraceEvent.findUnique({
    where: { id: identity.id },
  });
  if (
    previous &&
    (previous.details as { hash?: string }).hash !== identity.hash
  )
    throw new Error("Idempotency key belongs to a different request");
  return previous
    ? { id: previous.entityId, revision: previous.revision }
    : null;
}
async function record(
  identity: ReturnType<typeof commandIdentity>,
  id: string,
  revision: number,
  action: string,
  actorId: string,
  details: Record<string, unknown> = {},
) {
  await db.stockTraceEvent.create({
    data: {
      id: identity.id,
      entityType: "stock_transfer",
      entityId: id,
      revision,
      action,
      actorId,
      details: { hash: identity.hash, ...details },
    },
  });
  return { id, revision };
}
async function loadTransfer(input: TransferCommand) {
  await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`allocation:${input.allocationId}`}, 0))`;
  const transfer = await db.stockAllocation.findUniqueOrThrow({
    where: { id: input.allocationId },
    include: { lines: true },
  });
  if (transfer.kind !== "warehouse_transfer" || transfer.lines.length !== 1)
    throw new Error("Invalid transfer command");
  return transfer;
}

/** Exact serial transfer request. No reservation, quantity movement or custody event is implied. */
export async function requestSerialTransfer(
  input: {
    sourceLocationId: string;
    transitLocationId: string;
    destinationLocationId: string;
    codes: string[];
    idempotencyKey: string;
  },
  actorId: string,
) {
  const codes = uniqueSerials(input.codes).sort();
  if (
    codes.length > 200 ||
    new Set([
      input.sourceLocationId,
      input.transitLocationId,
      input.destinationLocationId,
    ]).size !== 3
  )
    throw new Error("Invalid transfer command");
  const identity = commandIdentity(input.idempotencyKey, [
    "request",
    actorId,
    input.sourceLocationId,
    input.transitLocationId,
    input.destinationLocationId,
    codes,
  ]);
  return runAtomicMutation(async () => {
    await requireStockLocationAccess(actorId, input.sourceLocationId, true);
    await requireStockLocationAccess(actorId, input.transitLocationId, true);
    await requireStockLocationAccess(
      actorId,
      input.destinationLocationId,
      true,
    );
    const previous = await previousCommand(identity);
    if (previous) return previous;
    const serials = await db.stockSerial.findMany({
      where: { code: { in: codes } },
    });
    const first = serials[0];
    if (
      serials.length !== codes.length ||
      serials.some(
        (s) =>
          s.locationId !== input.sourceLocationId ||
          s.status !== "available" ||
          s.packageId ||
          s.productId !== first.productId ||
          s.variantKey !== first.variantKey ||
          s.batchKey !== first.batchKey,
      )
    )
      throw new Error("Transfer serials must match available source stock");
    const transfer = await db.stockAllocation.create({
      data: {
        number: `TR-${randomUUID()}`,
        kind: "warehouse_transfer",
        sourceLocationId: input.sourceLocationId,
        transitLocationId: input.transitLocationId,
        destinationLocationId: input.destinationLocationId,
        createdById: actorId,
        lines: {
          create: {
            productId: first.productId,
            variantKey: first.variantKey,
            batchKey: first.batchKey,
            requested: codes.length,
            serialIds: serials.map((s) => s.id),
            unitSnapshot: { code: "piece", baseUnits: "1", revision: 1 },
          },
        },
      },
    });
    return record(
      identity,
      transfer.id,
      transfer.revision,
      "requested",
      actorId,
      { codes },
    );
  });
}

export async function approveSerialTransfer(
  input: TransferCommand,
  actorId: string,
) {
  const identity = commandIdentity(input.idempotencyKey, [
    "approve",
    actorId,
    input.allocationId,
    input.revision,
  ]);
  return runAtomicMutation(async () => {
    const transfer = await loadTransfer(input);
    const source = await requireStockLocationAccess(
      actorId,
      transfer.sourceLocationId,
      true,
    );
    const { actor } = await requireBranchAccess(
      actorId,
      source.warehouse.branchId!,
      true,
    );
    const permissions = await getEffectivePermissions(
      actor.role,
      actor.permissions as Record<string, boolean> | undefined,
    );
    if (!permissions["inventory:approve"])
      throw new Error("Inventory access denied");
    const previous = await previousCommand(identity);
    if (previous) return previous;
    if (transfer.revision !== input.revision || transfer.status !== "requested")
      throw new Error("Transfer changed; reload before continuing");
    const updated = await db.stockAllocation.update({
      where: { id: transfer.id },
      data: {
        status: "approved",
        approvedById: actorId,
        revision: { increment: 1 },
      },
    });
    return record(identity, updated.id, updated.revision, "approved", actorId);
  });
}

export async function dispatchSerialTransfer(
  input: TransferCommand,
  actorId: string,
) {
  const identity = commandIdentity(input.idempotencyKey, [
    "dispatch",
    actorId,
    input.allocationId,
    input.revision,
  ]);
  return runAtomicMutation(async () => {
    const transfer = await loadTransfer(input);
    await requireStockLocationAccess(actorId, transfer.sourceLocationId, true);
    await requireStockLocationAccess(actorId, transfer.transitLocationId, true);
    const previous = await previousCommand(identity);
    if (previous) return previous;
    if (transfer.revision !== input.revision || transfer.status !== "approved")
      throw new Error("Transfer changed; reload before continuing");
    const line = transfer.lines[0];
    const serials = await db.stockSerial.findMany({
      where: { id: { in: line.serialIds } },
    });
    if (
      serials.length !== Number(line.requested) ||
      serials.some(
        (s) =>
          s.productId !== line.productId ||
          s.variantKey !== line.variantKey ||
          s.batchKey !== line.batchKey ||
          s.locationId !== transfer.sourceLocationId ||
          s.status !== "available" ||
          s.packageId,
      )
    )
      throw new Error("Transfer serials must match available source stock");
    // Update identity before paired movements; deferred conservation checks see the final state.
    const changed = await db.stockSerial.updateMany({
      where: {
        id: { in: line.serialIds },
        locationId: transfer.sourceLocationId,
        status: "available",
        packageId: null,
      },
      data: {
        locationId: transfer.transitLocationId,
        status: "in_transit",
        revision: { increment: 1 },
      },
    });
    if (changed.count !== serials.length)
      throw new Error("Transfer changed; reload before continuing");
    await transferMovement(
      transfer.id,
      line,
      transfer.sourceLocationId,
      transfer.transitLocationId,
      serials.length,
      actorId,
    );
    await changeTransitReservation(
      line,
      transfer.transitLocationId,
      serials.length,
    );
    await db.stockAllocationLine.update({
      where: { id: line.id },
      data: { dispatched: serials.length },
    });
    const updated = await db.stockAllocation.update({
      where: { id: transfer.id },
      data: { status: "in_transit", revision: { increment: 1 } },
    });
    return record(
      identity,
      updated.id,
      updated.revision,
      "dispatched",
      actorId,
      { serialIds: line.serialIds },
    );
  });
}

/** Only explicitly scanned units are accepted. Outstanding units remain reserved in transit. */
export async function receiveSerialTransfer(
  input: TransferCommand & { codes: string[] },
  actorId: string,
) {
  const codes = uniqueSerials(input.codes).sort();
  if (codes.length > 200) throw new Error("Invalid transfer command");
  const identity = commandIdentity(input.idempotencyKey, [
    "receive",
    actorId,
    input.allocationId,
    input.revision,
    codes,
  ]);
  return runAtomicMutation(async () => {
    const transfer = await loadTransfer(input);
    await requireStockLocationAccess(
      actorId,
      transfer.destinationLocationId,
      true,
    );
    // Destination staff need not have permission to browse the source branch.
    const previous = await previousCommand(identity);
    if (previous) return previous;
    if (
      transfer.revision !== input.revision ||
      !["in_transit", "partially_received"].includes(transfer.status)
    )
      throw new Error("Transfer changed; reload before continuing");
    const line = transfer.lines[0];
    const serials = await db.stockSerial.findMany({
      where: { code: { in: codes } },
    });
    if (
      serials.length !== codes.length ||
      serials.some(
        (s) =>
          !line.serialIds.includes(s.id) ||
          s.locationId !== transfer.transitLocationId ||
          s.status !== "in_transit" ||
          s.packageId,
      )
    )
      throw new Error(
        "Received serials do not match outstanding transfer stock",
      );
    const changed = await db.stockSerial.updateMany({
      where: {
        id: { in: serials.map((s) => s.id) },
        locationId: transfer.transitLocationId,
        status: "in_transit",
      },
      data: {
        locationId: transfer.destinationLocationId,
        status: "available",
        revision: { increment: 1 },
      },
    });
    if (changed.count !== serials.length)
      throw new Error("Transfer changed; reload before continuing");
    await changeTransitReservation(
      line,
      transfer.transitLocationId,
      -serials.length,
    );
    await transferMovement(
      transfer.id,
      line,
      transfer.transitLocationId,
      transfer.destinationLocationId,
      serials.length,
      actorId,
    );
    const received = Number(line.received) + serials.length;
    if (received > Number(line.dispatched))
      throw new Error(
        "Received serials do not match outstanding transfer stock",
      );
    await db.stockAllocationLine.update({
      where: { id: line.id },
      data: { received },
    });
    const updated = await db.stockAllocation.update({
      where: { id: transfer.id },
      data: {
        status:
          received === Number(line.dispatched)
            ? "received"
            : "partially_received",
        revision: { increment: 1 },
      },
    });
    return record(identity, updated.id, updated.revision, "received", actorId, {
      codes,
      outstanding: Number(line.dispatched) - received,
    });
  });
}

type TransferLine = { productId: string; variantKey: string; batchKey: string };
async function transferMovement(
  id: string,
  line: TransferLine,
  source: string,
  destination: string,
  quantity: number,
  actorId: string,
) {
  const batch = line.batchKey
    ? await db.stockBatch.findUniqueOrThrow({ where: { id: line.batchKey } })
    : null;
  const common = {
    productId: line.productId,
    variantId: line.variantKey || undefined,
    batchNumber: batch?.batchNumber,
    sourceType: "stock_allocation",
    sourceId: id,
    transferId: id,
  };
  await postMovements(
    db,
    [
      {
        ...common,
        type: "transfer_out",
        locationId: source,
        quantity: -quantity,
      },
      { ...common, type: "transfer_in", locationId: destination, quantity },
    ],
    actorId,
  );
}
async function changeTransitReservation(
  line: TransferLine,
  locationId: string,
  quantity: number,
) {
  const changed =
    await db.$executeRaw`UPDATE "StockLevel" SET reserved=reserved+${quantity},"updatedAt"=now()
    WHERE "productId"=${line.productId} AND "variantKey"=${line.variantKey} AND "batchKey"=${line.batchKey} AND "locationId"=${locationId}
    AND reserved+${quantity}>=0 AND reserved+${quantity}<= "onHand"`;
  if (changed !== 1)
    throw new Error("Transfer transit balance is inconsistent");
}

/** A shortage report preserves outstanding stock in transit until physical recovery or an approved adjustment. */
export async function reportMissingTransferUnits(
  input: TransferCommand & { codes: string[]; reason: string },
  actorId: string,
) {
  const codes = uniqueSerials(input.codes).sort();
  if (codes.length > 200 || !input.reason.trim() || input.reason.length > 1000)
    throw new Error("A transfer discrepancy reason is required");
  const identity = commandIdentity(input.idempotencyKey, [
    "missing",
    actorId,
    input.allocationId,
    input.revision,
    codes,
    input.reason.trim(),
  ]);
  return runAtomicMutation(async () => {
    const transfer = await loadTransfer(input);
    await requireStockLocationAccess(
      actorId,
      transfer.destinationLocationId,
      true,
    );
    const previous = await previousCommand(identity);
    if (previous) return previous;
    if (
      transfer.revision !== input.revision ||
      !["in_transit", "partially_received"].includes(transfer.status)
    )
      throw new Error("Transfer changed; reload before continuing");
    const line = transfer.lines[0];
    const serials = await db.stockSerial.findMany({
      where: { code: { in: codes } },
    });
    if (
      serials.length !== codes.length ||
      serials.some(
        (s) =>
          !line.serialIds.includes(s.id) ||
          s.locationId !== transfer.transitLocationId ||
          s.status !== "in_transit",
      )
    )
      throw new Error(
        "Received serials do not match outstanding transfer stock",
      );
    const updated = await db.stockAllocation.update({
      where: { id: transfer.id },
      data: { revision: { increment: 1 } },
    });
    return record(
      identity,
      updated.id,
      updated.revision,
      "missing_reported",
      actorId,
      { codes, reason: input.reason.trim() },
    );
  });
}

/** Completion requires physical acceptance and a live receipt acknowledgment for the current manifest. */
export async function closeSerialTransfer(
  input: TransferCommand,
  actorId: string,
) {
  const identity = commandIdentity(input.idempotencyKey, [
    "close",
    actorId,
    input.allocationId,
    input.revision,
  ]);
  return runAtomicMutation(async () => {
    const transfer = await loadTransfer(input);
    const destination = await requireStockLocationAccess(
      actorId,
      transfer.destinationLocationId,
      true,
    );
    const { actor } = await requireBranchAccess(
      actorId,
      destination.warehouse.branchId!,
      true,
    );
    const permissions = await getEffectivePermissions(
      actor.role,
      actor.permissions as Record<string, boolean> | undefined,
    );
    if (!permissions["inventory:approve"])
      throw new Error("Inventory access denied");
    const previous = await previousCommand(identity);
    if (previous) return previous;
    if (transfer.revision !== input.revision || transfer.status !== "received")
      throw new Error("Transfer changed; reload before continuing");
    const line = transfer.lines[0];
    const accepted = await db.stockSerial.count({
      where: {
        id: { in: line.serialIds },
        locationId: transfer.destinationLocationId,
        status: "available",
      },
    });
    if (
      accepted !== line.serialIds.length ||
      !line.received.equals(line.dispatched) ||
      !line.rejected.isZero()
    )
      throw new Error("Transfer transit balance is inconsistent");
    if (
      !(await db.stockAcknowledgment.count({
        where: {
          allocationId: transfer.id,
          revision: transfer.revision,
          stage: "receipt",
        },
      }))
    )
      throw new Error(
        "A current receipt acknowledgment is required before closing",
      );
    // Missing reports are reconciled by actual acceptance of every exact unit, never by editing the report.
    const updated = await db.stockAllocation.update({
      where: { id: transfer.id },
      data: { status: "closed", revision: { increment: 1 } },
    });
    return record(
      identity,
      updated.id,
      updated.revision,
      "reconciled_and_closed",
      actorId,
      { acceptedSerialIds: line.serialIds },
    );
  });
}
