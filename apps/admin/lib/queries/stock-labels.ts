import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { db, runAtomicMutation } from "../atomic";
import { requireStockLocationAccess } from "./branches";
import {
  validateStockLabelTemplate,
  type StockLabelTemplate,
} from "../constants/stock-traceability";

export interface SerialLabelInput {
  productId: string;
  variantKey: string;
  batchKey: string;
  locationId: string;
  quantity: number;
  idempotencyKey: string;
  template: StockLabelTemplate;
}
/** Reserve internal labels against real stock. This does not activate tracking or move/create stock. */
export async function generateSerialLabels(
  input: SerialLabelInput,
  actorId: string,
) {
  if (
    !Number.isInteger(input.quantity) ||
    input.quantity < 1 ||
    input.quantity > 1000 ||
    !/^[a-zA-Z0-9_-]{16,100}$/.test(input.idempotencyKey)
  )
    throw new Error("Invalid label request");
  validateStockLabelTemplate(input.template);
  const requestHash = createHash("sha256")
    .update(
      JSON.stringify([
        input.productId,
        input.variantKey,
        input.batchKey,
        input.locationId,
        input.quantity,
        input.template.widthMm,
        input.template.heightMm,
        input.template.gapMm,
        input.template.copies,
        actorId,
      ]),
    )
    .digest("hex");
  return runAtomicMutation(async () => {
    await requireStockLocationAccess(actorId, input.locationId, true);
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`labels:${input.idempotencyKey}`}, 0))`;
    const previous = await db.labelPrintJob.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (previous) {
      if (previous.requestHash !== requestHash)
        throw new Error("Idempotency key belongs to a different request");
      return { id: previous.id };
    }
    const product = await db.product.findUniqueOrThrow({
      where: { id: input.productId },
      include: { variants: true },
    });
    if (
      !product.isActive ||
      !product.trackStock ||
      (product.variants.length
        ? !product.variants.some(
            (variant) => variant.id === input.variantKey && variant.isActive,
          )
        : !!input.variantKey)
    )
      throw new Error("Product or variant is unavailable");
    if (product.trackBatches) {
      const batch = await db.stockBatch.findUnique({
        where: { id: input.batchKey },
      });
      if (
        !batch ||
        batch.productId !== product.id ||
        batch.variantKey !== input.variantKey
      )
        throw new Error("Invalid stock batch");
    } else if (input.batchKey) throw new Error("Product does not use batches");
    const rows = await db.$queryRaw<Array<{ onHand: { toString(): string } }>>`
      SELECT "onHand" FROM "StockLevel" WHERE "productId"=${product.id} AND "variantKey"=${input.variantKey}
      AND "batchKey"=${input.batchKey} AND "locationId"=${input.locationId} FOR UPDATE`;
    const existing = await db.stockSerial.count({
      where: {
        productId: product.id,
        variantKey: input.variantKey,
        batchKey: input.batchKey,
        locationId: input.locationId,
        status: { not: "void" },
      },
    });
    if (!rows[0] || Number(rows[0].onHand) - existing < input.quantity)
      throw new Error("Quantity exceeds stock without assigned identifiers");
    const generation = await db.serialGeneration.create({
      data: {
        idempotencyKey: input.idempotencyKey,
        requestHash,
        productId: product.id,
        variantKey: input.variantKey,
        batchKey: input.batchKey,
        locationId: input.locationId,
        quantity: input.quantity,
        createdById: actorId,
      },
    });
    const labels: any[] = [];
    for (let index = 0; index < input.quantity; index++) {
      // UUID-derived identifiers are globally unique internal references, not manufactured GTINs.
      const code = `INT-${generation.id}-${String(index + 1).padStart(4, "0")}`;
      await db.stockSerial.create({
        data: {
          code,
          generationId: generation.id,
          productId: product.id,
          variantKey: input.variantKey,
          batchKey: input.batchKey,
          locationId: input.locationId,
          status: "reserved",
        },
      });
      labels.push({
        code,
        productId: product.id,
        sku:
          product.variants.find((variant) => variant.id === input.variantKey)
            ?.sku ?? product.sku,
        nameEn: product.nameEn,
        nameAr: product.nameAr,
        batch: input.batchKey,
      });
    }
    const job = await db.labelPrintJob.create({
      data: {
        idempotencyKey: input.idempotencyKey,
        requestHash,
        createdById: actorId,
        template: { ...input.template, version: 1 },
        labels,
      },
    });
    await db.stockTraceEvent.create({
      data: {
        entityType: "serial_generation",
        entityId: generation.id,
        revision: 1,
        action: "reserve_labels",
        actorId,
        details: {
          jobId: job.id,
          quantity: input.quantity,
          locationId: input.locationId,
        },
      },
    });
    return { id: job.id };
  });
}
export async function getSerialLabelJob(id: string, actorId: string) {
  const job = await db.labelPrintJob.findUniqueOrThrow({ where: { id } });
  const original = job.originalJobId
    ? await db.labelPrintJob.findUniqueOrThrow({
        where: { id: job.originalJobId },
      })
    : job;
  const generation = await db.serialGeneration.findUniqueOrThrow({
    where: { idempotencyKey: original.idempotencyKey },
  });
  await requireStockLocationAccess(actorId, generation.locationId);
  return job;
}

/** Reprints copy the original label payload and never allocate another identifier. */
export async function reprintSerialLabels(
  input: { jobId: string; idempotencyKey: string },
  actorId: string,
) {
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(input.idempotencyKey))
    throw new Error("Invalid label request");
  return runAtomicMutation(async () => {
    const requested = await getSerialLabelJob(input.jobId, actorId);
    const original = requested.originalJobId
      ? await getSerialLabelJob(requested.originalJobId, actorId)
      : requested;
    const generation = await db.serialGeneration.findUniqueOrThrow({
      where: { idempotencyKey: original.idempotencyKey },
    });
    await requireStockLocationAccess(actorId, generation.locationId, true);
    const requestHash = createHash("sha256")
      .update(JSON.stringify(["reprint", original.id, actorId]))
      .digest("hex");
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`labels:${input.idempotencyKey}`}, 0))`;
    const existing = await db.labelPrintJob.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) {
      if (existing.requestHash !== requestHash)
        throw new Error("Idempotency key belongs to a different request");
      return { id: existing.id };
    }
    const job = await db.labelPrintJob.create({
      data: {
        idempotencyKey: input.idempotencyKey,
        requestHash,
        originalJobId: original.id,
        template: original.template as Prisma.InputJsonValue,
        labels: original.labels as Prisma.InputJsonValue,
        createdById: actorId,
      },
    });
    await db.stockTraceEvent.create({
      data: {
        entityType: "label_job",
        entityId: job.id,
        revision: 1,
        action: "reprint_generated",
        actorId,
        details: { originalJobId: original.id },
      },
    });
    return { id: job.id };
  });
}

/** This records a human acknowledgment, never an inference from window.print(). */
export async function confirmSerialLabelPrinting(
  jobId: string,
  actorId: string,
) {
  return runAtomicMutation(async () => {
    const job = await getSerialLabelJob(jobId, actorId);
    const original = job.originalJobId
      ? await getSerialLabelJob(job.originalJobId, actorId)
      : job;
    const generation = await db.serialGeneration.findUniqueOrThrow({
      where: { idempotencyKey: original.idempotencyKey },
    });
    await requireStockLocationAccess(actorId, generation.locationId, true);
    const changed = await db.labelPrintJob.updateMany({
      where: { id: jobId, status: "generated" },
      data: {
        status: "operator_confirmed",
        confirmedAt: new Date(),
        confirmedById: actorId,
      },
    });
    if (changed.count)
      await db.stockTraceEvent.create({
        data: {
          entityType: "label_job",
          entityId: jobId,
          revision: 2,
          action: "operator_confirmed",
          actorId,
          details: { generationId: generation.id },
        },
      });
    return { id: jobId };
  });
}
