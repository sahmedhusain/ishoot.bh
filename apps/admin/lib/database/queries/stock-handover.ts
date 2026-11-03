import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db, runAtomicMutation } from "../db";
import { requireStockLocationAccess } from "./branches";
import { validateSignatureImage } from "../services/signature-image";

type HandoverStage = "collection" | "receipt";
async function handoverManifest(
  allocationId: string,
  revision: number,
  stage: HandoverStage,
  actorId: string,
) {
  if (!["collection", "receipt"].includes(stage))
    throw new Error("Invalid handover stage");
  const allocation = await db.stockAllocation.findUniqueOrThrow({
    where: { id: allocationId },
    include: { lines: { orderBy: { id: "asc" } } },
  });
  await requireStockLocationAccess(
    actorId,
    stage === "collection"
      ? allocation.sourceLocationId
      : allocation.destinationLocationId,
    true,
  );
  if (
    allocation.revision !== revision ||
    allocation.kind !== "warehouse_transfer" ||
    (stage === "collection"
      ? allocation.status !== "in_transit"
      : !["partially_received", "received"].includes(allocation.status))
  )
    throw new Error("Transfer changed; reload before continuing");
  const actor = await db.user.findUniqueOrThrow({ where: { id: actorId } });
  const manifest = {
    version: 1,
    allocationId,
    number: allocation.number,
    revision,
    stage,
    status: allocation.status,
    sourceLocationId: allocation.sourceLocationId,
    transitLocationId: allocation.transitLocationId,
    destinationLocationId: allocation.destinationLocationId,
    signerId: actor.id,
    signerName: actor.fullName,
    acknowledgment:
      stage === "collection"
        ? "collection_of_dispatched_units_only"
        : "receipt_of_accepted_units_only",
    lines: await Promise.all(
      allocation.lines.map(async (line) => ({
        product: await db.product.findUniqueOrThrow({
          where: { id: line.productId },
          select: { id: true, sku: true, nameEn: true, nameAr: true },
        }),
        productId: line.productId,
        variantKey: line.variantKey,
        batchKey: line.batchKey,
        requested: line.requested.toString(),
        dispatched: line.dispatched.toString(),
        received: line.received.toString(),
        rejected: line.rejected.toString(),
        outstanding: line.dispatched
          .minus(line.received)
          .minus(line.rejected)
          .toString(),
        unitSnapshot: line.unitSnapshot,
        serials: await db.stockSerial.findMany({
          where: { id: { in: line.serialIds } },
          orderBy: { code: "asc" },
          select: { id: true, code: true, locationId: true, status: true },
        }),
      })),
    ),
  };
  return {
    manifest,
    hash: createHash("sha256").update(JSON.stringify(manifest)).digest("hex"),
  };
}

/** Server-authenticated staff signing only. External signing invitations are a separate boundary. */
export async function previewStockHandover(
  input: { allocationId: string; revision: number; stage: HandoverStage },
  actorId: string,
) {
  return runAtomicMutation(async () => {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`allocation:${input.allocationId}`}, 0))`;
    return handoverManifest(
      input.allocationId,
      input.revision,
      input.stage,
      actorId,
    );
  });
}

export async function acknowledgeStockHandover(
  input: {
    allocationId: string;
    revision: number;
    stage: HandoverStage;
    manifestHash: string;
    signature: string;
  },
  actorId: string,
) {
  validateSignatureImage(input.signature);
  return runAtomicMutation(async () => {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`allocation:${input.allocationId}`}, 0))`;
    // Authenticate before reading acknowledgment evidence, including on retries.
    const allocation = await db.stockAllocation.findUniqueOrThrow({
      where: { id: input.allocationId },
    });
    await requireStockLocationAccess(
      actorId,
      input.stage === "collection"
        ? allocation.sourceLocationId
        : allocation.destinationLocationId,
      true,
    );
    const existing = await db.stockAcknowledgment.findUnique({
      where: {
        allocationId_revision_stage_actorId: {
          allocationId: input.allocationId,
          revision: input.revision,
          stage: input.stage,
          actorId,
        },
      },
    });
    if (existing) {
      if (
        existing.manifestHash !== input.manifestHash ||
        existing.signature !== input.signature
      )
        throw new Error(
          "Handover acknowledgment already exists with different evidence",
        );
      return { id: existing.id };
    }
    const { manifest, hash } = await handoverManifest(
      input.allocationId,
      input.revision,
      input.stage,
      actorId,
    );
    if (hash !== input.manifestHash)
      throw new Error(
        "Handover manifest changed; review it again before signing",
      );
    const acknowledgment = await db.stockAcknowledgment.create({
      data: {
        allocationId: input.allocationId,
        revision: input.revision,
        stage: input.stage,
        actorId,
        signerName: manifest.signerName,
        statement: manifest.acknowledgment,
        manifest: manifest as Prisma.InputJsonValue,
        manifestHash: hash,
        signature: input.signature,
      },
    });
    await db.stockTraceEvent.create({
      data: {
        entityType: "stock_handover",
        entityId: acknowledgment.id,
        revision: input.revision,
        action: input.stage,
        actorId,
        details: { allocationId: input.allocationId, manifestHash: hash },
      },
    });
    return { id: acknowledgment.id };
  });
}
