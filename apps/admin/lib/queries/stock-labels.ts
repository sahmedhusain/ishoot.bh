import { createHash } from "node:crypto";
import { runAtomicMutation } from "../api/atomic";
import { listTableRows, upsertTableRow } from "../api/tables";
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
    const [jobs, products, allVariants, batches, levels, serials] = await Promise.all([
      listTableRows<Record<string, any>>("system", "label_print_job"),
      listTableRows<Record<string, any>>("inventory", "product"),
      listTableRows<Record<string, any>>("inventory", "product_variant"),
      listTableRows<Record<string, any>>("inventory", "stock_batch"),
      listTableRows<Record<string, any>>("inventory", "stock_level"),
      listTableRows<Record<string, any>>("inventory", "stock_serial"),
    ]);

    const previous = jobs.find((j) => j.idempotencyKey === input.idempotencyKey);
    if (previous) {
      if (previous.requestHash !== requestHash)
        throw new Error("Idempotency key belongs to a different request");
      return { id: String(previous.id) };
    }

    const rawProduct = products.find((p) => p.id === input.productId);
    if (!rawProduct) throw new Error("Product or variant is unavailable");
    const variants = allVariants.filter((v) => v.productId === rawProduct.id);
    if (
      !rawProduct.isActive ||
      !rawProduct.trackStock ||
      (variants.length
        ? !variants.some((variant) => variant.id === input.variantKey && variant.isActive)
        : !!input.variantKey)
    )
      throw new Error("Product or variant is unavailable");

    if (rawProduct.trackBatches) {
      const batch = batches.find((b) => b.id === input.batchKey);
      if (
        !batch ||
        batch.productId !== rawProduct.id ||
        (batch.variantKey ?? "") !== input.variantKey
      )
        throw new Error("Invalid stock batch");
    } else if (input.batchKey) {
      throw new Error("Product does not use batches");
    }

    const level = levels.find(
      (l) =>
        l.productId === rawProduct.id &&
        (l.variantKey ?? "") === input.variantKey &&
        (l.batchKey ?? "") === input.batchKey &&
        l.locationId === input.locationId,
    );
    const existing = serials.filter(
      (s) =>
        s.productId === rawProduct.id &&
        (s.variantKey ?? "") === input.variantKey &&
        (s.batchKey ?? "") === input.batchKey &&
        s.locationId === input.locationId &&
        s.status !== "void",
    ).length;
    if (!level || Number(level.onHand ?? 0) - existing < input.quantity)
      throw new Error("Quantity exceeds stock without assigned identifiers");

    const generationId = crypto.randomUUID();
    const generation = await upsertTableRow<Record<string, any>>("system", "serial_generation", {
      id: generationId,
      idempotencyKey: input.idempotencyKey,
      requestHash,
      productId: rawProduct.id,
      variantKey: input.variantKey,
      batchKey: input.batchKey,
      locationId: input.locationId,
      quantity: input.quantity,
      createdById: actorId,
    });

    const labels: any[] = [];
    for (let index = 0; index < input.quantity; index++) {
      const code = `INT-${generation.id}-${String(index + 1).padStart(4, "0")}`;
      await upsertTableRow("inventory", "stock_serial", {
        id: crypto.randomUUID(),
        code,
        generationId: generation.id,
        productId: rawProduct.id,
        variantKey: input.variantKey,
        batchKey: input.batchKey,
        locationId: input.locationId,
        status: "reserved",
        revision: 1,
      });
      labels.push({
        code,
        productId: rawProduct.id,
        sku:
          variants.find((variant) => variant.id === input.variantKey)?.sku ??
          rawProduct.sku,
        nameEn: rawProduct.nameEn,
        nameAr: rawProduct.nameAr,
        batch: input.batchKey,
      });
    }

    const job = await upsertTableRow<Record<string, any>>("system", "label_print_job", {
      id: crypto.randomUUID(),
      idempotencyKey: input.idempotencyKey,
      requestHash,
      createdById: actorId,
      template: { ...input.template, version: 1 },
      labels,
      status: "generated",
    });

    await upsertTableRow("inventory", "stock_trace_event", {
      id: crypto.randomUUID(),
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
    });
    return { id: String(job.id) };
  });
}

function normalizeLabelJob(
  job: Record<string, any>,
): Record<string, any> & {
  template: Record<string, any> & {
    widthMm: number;
    heightMm: number;
    gapMm: number;
    copies: number;
  };
  labels: Array<{
    code: string;
    productId: string;
    sku: string;
    nameEn: string;
    nameAr: string;
    batch: string | undefined;
  }>;
} {
  const rawTpl =
    job.template && typeof job.template === "object" ? job.template : {};
  let widthMm = Number(rawTpl.widthMm);
  let heightMm = Number(rawTpl.heightMm);
  if ((!Number.isFinite(widthMm) || !Number.isFinite(heightMm)) && typeof rawTpl.size === "string") {
    const m = /^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/i.exec(rawTpl.size);
    if (m) {
      widthMm = Number(m[1]);
      heightMm = Number(m[2]);
    }
  }
  const template = {
    ...rawTpl,
    widthMm: Number.isFinite(widthMm) && widthMm > 0 ? widthMm : 50,
    heightMm: Number.isFinite(heightMm) && heightMm > 0 ? heightMm : 25,
    gapMm: Number.isFinite(Number(rawTpl.gapMm)) ? Number(rawTpl.gapMm) : 2,
    copies: Number.isFinite(Number(rawTpl.copies)) && Number(rawTpl.copies) > 0 ? Number(rawTpl.copies) : 1,
  };
  const labels = (Array.isArray(job.labels) ? job.labels : []).map((l: any, idx: number) => ({
    code: String(l?.code ?? l?.sku ?? `${job.id}-${idx + 1}`),
    productId: String(l?.productId ?? ""),
    sku: String(l?.sku ?? l?.code ?? ""),
    nameEn: String(l?.nameEn ?? l?.name ?? l?.sku ?? "Label"),
    nameAr: String(l?.nameAr ?? l?.name ?? l?.sku ?? "ملصق"),
    batch: l?.batch ? String(l.batch) : undefined,
  }));
  return { ...job, template, labels };
}

export async function getSerialLabelJob(id: string, actorId: string) {
  const [jobs, generations] = await Promise.all([
    listTableRows<Record<string, any>>("system", "label_print_job"),
    listTableRows<Record<string, any>>("system", "serial_generation"),
  ]);
  const job = jobs.find((j) => j.id === id);
  if (!job) throw new Error("Label print job not found");
  const original = job.originalJobId
    ? jobs.find((j) => j.id === job.originalJobId)
    : job;
  if (!original) throw new Error("Original label print job not found");
  const generation = generations.find((g) => g.idempotencyKey === original.idempotencyKey);
  if (generation?.locationId) {
    await requireStockLocationAccess(actorId, String(generation.locationId));
  }
  return normalizeLabelJob(job);
}

export async function reprintSerialLabels(
  input: { jobId: string; idempotencyKey: string },
  actorId: string,
) {
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(input.idempotencyKey))
    throw new Error("Invalid label request");
  return runAtomicMutation(async () => {
    const requested = await getSerialLabelJob(input.jobId, actorId);
    const original = requested.originalJobId
      ? await getSerialLabelJob(String(requested.originalJobId), actorId)
      : requested;
    const [generations, jobs] = await Promise.all([
      listTableRows<Record<string, any>>("system", "serial_generation"),
      listTableRows<Record<string, any>>("system", "label_print_job"),
    ]);
    const generation = generations.find((g) => g.idempotencyKey === original.idempotencyKey);
    if (!generation) throw new Error("Serial generation not found");
    await requireStockLocationAccess(actorId, String(generation.locationId), true);
    const requestHash = createHash("sha256")
      .update(JSON.stringify(["reprint", original.id, actorId]))
      .digest("hex");
    const existing = jobs.find((j) => j.idempotencyKey === input.idempotencyKey);
    if (existing) {
      if (existing.requestHash !== requestHash)
        throw new Error("Idempotency key belongs to a different request");
      return { id: String(existing.id) };
    }
    const job = await upsertTableRow<Record<string, any>>("system", "label_print_job", {
      id: crypto.randomUUID(),
      idempotencyKey: input.idempotencyKey,
      requestHash,
      originalJobId: original.id,
      template: original.template,
      labels: original.labels,
      createdById: actorId,
      status: "generated",
    });
    await upsertTableRow("inventory", "stock_trace_event", {
      id: crypto.randomUUID(),
      entityType: "label_job",
      entityId: job.id,
      revision: 1,
      action: "reprint_generated",
      actorId,
      details: { originalJobId: original.id },
    });
    return { id: String(job.id) };
  });
}

export async function confirmSerialLabelPrinting(
  jobId: string,
  actorId: string,
) {
  return runAtomicMutation(async () => {
    const job = await getSerialLabelJob(jobId, actorId);
    const original = job.originalJobId
      ? await getSerialLabelJob(String(job.originalJobId), actorId)
      : job;
    const generations = await listTableRows<Record<string, any>>("system", "serial_generation");
    const generation = generations.find((g) => g.idempotencyKey === original.idempotencyKey);
    if (!generation) throw new Error("Serial generation not found");
    await requireStockLocationAccess(actorId, String(generation.locationId), true);
    if (job.status === "generated") {
      await upsertTableRow("system", "label_print_job", {
        id: jobId,
        status: "operator_confirmed",
        confirmedAt: new Date().toISOString(),
        confirmedById: actorId,
      });
      await upsertTableRow("inventory", "stock_trace_event", {
        id: crypto.randomUUID(),
        entityType: "label_job",
        entityId: jobId,
        revision: 2,
        action: "operator_confirmed",
        actorId,
        details: { generationId: generation.id },
      });
    }
    return { id: jobId };
  });
}
