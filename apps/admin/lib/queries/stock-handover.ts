import { createHash } from "node:crypto";
import { Database } from "@platform/database/decimal";
import { runAtomicMutation } from "../api/atomic";
import { listTableRows, upsertTableRow } from "../api/tables";
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
  const [allocations, allLines, users, products, allSerials] = await Promise.all([
    listTableRows<Record<string, any>>("inventory", "stock_allocation"),
    listTableRows<Record<string, any>>("inventory", "stock_allocation_line", "id ASC"),
    listTableRows<Record<string, any>>("identity", "user"),
    listTableRows<Record<string, any>>("inventory", "product"),
    listTableRows<Record<string, any>>("inventory", "stock_serial", "code ASC"),
  ]);
  const allocation = allocations.find((a) => a.id === allocationId);
  if (!allocation) throw new Error("Stock allocation not found");
  await requireStockLocationAccess(
    actorId,
    stage === "collection"
      ? String(allocation.sourceLocationId)
      : String(allocation.destinationLocationId),
    true,
  );
  if (
    Number(allocation.revision) !== revision ||
    allocation.kind !== "warehouse_transfer" ||
    (stage === "collection"
      ? allocation.status !== "in_transit"
      : !["partially_received", "received"].includes(String(allocation.status)))
  )
    throw new Error("Transfer changed; reload before continuing");
  const actor = users.find((u) => u.id === actorId);
  if (!actor) throw new Error("User not found");

  const lines = allLines
    .filter((l) => l.allocationId === allocationId)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const productById = new Map(products.map((p) => [String(p.id), p]));

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
    lines: lines.map((line) => {
      const prod = productById.get(String(line.productId));
      if (!prod) throw new Error("Product not found");
      const serialIds = new Set(Array.isArray(line.serialIds) ? line.serialIds.map(String) : []);
      const dispatched = new Database.Decimal(String(line.dispatched ?? 0));
      const received = new Database.Decimal(String(line.received ?? 0));
      const rejected = new Database.Decimal(String(line.rejected ?? 0));
      return {
        product: {
          id: prod.id,
          sku: prod.sku,
          nameEn: prod.nameEn,
          nameAr: prod.nameAr,
        },
        productId: line.productId,
        variantKey: line.variantKey,
        batchKey: line.batchKey,
        requested: String(line.requested ?? 0),
        dispatched: dispatched.toString(),
        received: received.toString(),
        rejected: rejected.toString(),
        outstanding: dispatched.minus(received).minus(rejected).toString(),
        unitSnapshot: line.unitSnapshot,
        serials: allSerials
          .filter((s) => serialIds.has(String(s.id)))
          .sort((a, b) => String(a.code ?? "").localeCompare(String(b.code ?? "")))
          .map((s) => ({
            id: s.id,
            code: s.code,
            locationId: s.locationId,
            status: s.status,
          })),
      };
    }),
  };
  return {
    manifest,
    hash: createHash("sha256").update(JSON.stringify(manifest)).digest("hex"),
  };
}

export async function previewStockHandover(
  input: { allocationId: string; revision: number; stage: HandoverStage },
  actorId: string,
) {
  return runAtomicMutation(() =>
    handoverManifest(
      input.allocationId,
      input.revision,
      input.stage,
      actorId,
    ),
  );
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
    const [allocations, acknowledgments] = await Promise.all([
      listTableRows<Record<string, any>>("inventory", "stock_allocation"),
      listTableRows<Record<string, any>>("inventory", "stock_acknowledgment"),
    ]);
    const allocation = allocations.find((a) => a.id === input.allocationId);
    if (!allocation) throw new Error("Stock allocation not found");
    await requireStockLocationAccess(
      actorId,
      input.stage === "collection"
        ? String(allocation.sourceLocationId)
        : String(allocation.destinationLocationId),
      true,
    );
    const existing = acknowledgments.find(
      (k) =>
        k.allocationId === input.allocationId &&
        Number(k.revision) === input.revision &&
        k.stage === input.stage &&
        k.actorId === actorId,
    );
    if (existing) {
      if (
        existing.manifestHash !== input.manifestHash ||
        existing.signature !== input.signature
      )
        throw new Error(
          "Handover acknowledgment already exists with different evidence",
        );
      return { id: String(existing.id) };
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
    const ackId = crypto.randomUUID();
    const acknowledgment = await upsertTableRow<Record<string, any>>(
      "inventory",
      "stock_acknowledgment",
      {
        id: ackId,
        allocationId: input.allocationId,
        revision: input.revision,
        stage: input.stage,
        actorId,
        signerName: manifest.signerName,
        statement: manifest.acknowledgment,
        manifest,
        manifestHash: hash,
        signature: input.signature,
      },
    );
    await upsertTableRow("inventory", "stock_trace_event", {
      id: crypto.randomUUID(),
      entityType: "stock_handover",
      entityId: acknowledgment.id,
      revision: input.revision,
      action: input.stage,
      actorId,
      details: { allocationId: input.allocationId, manifestHash: hash },
    });
    return { id: String(acknowledgment.id) };
  });
}
