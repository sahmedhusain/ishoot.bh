import { randomUUID } from "node:crypto";
import { listTableRows, upsertTableRow } from "../api/tables";
import { postMovements } from "./inventory";
import { getNextSequenceNumber } from "./sequence";

async function loadTransfer(allocationId: string, revision: number) {
  const [allocations, allLines, allSerials] = await Promise.all([
    listTableRows<Record<string, any>>("inventory", "stock_allocation"),
    listTableRows<Record<string, any>>("inventory", "stock_allocation_line"),
    listTableRows<Record<string, any>>("inventory", "stock_serial"),
  ]);
  const allocation = allocations.find((a) => a.id === allocationId);
  if (!allocation) throw new Error("Stock allocation not found");
  if (Number(allocation.revision) !== Number(revision)) {
    throw new Error("Transfer changed; reload before continuing");
  }
  const lines = allLines.filter((l) => l.allocationId === allocationId);
  return { allocation, lines, allSerials };
}

function lineSerialIds(line: Record<string, any>): string[] {
  if (Array.isArray(line.serialIds)) return line.serialIds.map(String);
  const snap = line.unitSnapshot;
  if (snap && Array.isArray(snap.serialIds)) return snap.serialIds.map(String);
  return [];
}

export async function requestSerialTransfer(
  input: {
    sourceLocationId: string;
    transitLocationId: string;
    destinationLocationId: string;
    codes: string[];
    idempotencyKey?: string;
  },
  actorId: string,
): Promise<{ id: string; number: string; status: string; revision: number; [key: string]: any }> {
  const codes = Array.from(new Set((input.codes || []).map((c) => c.trim()).filter(Boolean)));
  if (!codes.length) throw new Error("Serial codes are required");
  if (!input.sourceLocationId || !input.transitLocationId || !input.destinationLocationId) {
    throw new Error("Source, transit, and destination locations are required");
  }
  const allSerials = await listTableRows<Record<string, any>>("inventory", "stock_serial");
  const codeSet = new Set(codes);
  const matched = allSerials.filter(
    (s) => codeSet.has(String(s.code)) && s.locationId === input.sourceLocationId,
  );
  if (matched.length !== codes.length) {
    throw new Error("One or more serial codes are missing from source location");
  }
  const id = randomUUID();
  const number = await getNextSequenceNumber("TRF");
  const created = await upsertTableRow<Record<string, any>>("inventory", "stock_allocation", {
    id,
    number,
    kind: "warehouse_transfer",
    sourceLocationId: input.sourceLocationId,
    transitLocationId: input.transitLocationId,
    destinationLocationId: input.destinationLocationId,
    status: "requested",
    revision: 1,
    createdById: actorId,
  });
  const grouped = new Map<string, Record<string, any>[]>();
  for (const s of matched) {
    const key = `${s.productId}::${s.variantKey ?? ""}::${s.batchKey ?? ""}`;
    const arr = grouped.get(key) ?? [];
    arr.push(s);
    grouped.set(key, arr);
  }
  for (const group of grouped.values()) {
    const first = group[0];
    await upsertTableRow("inventory", "stock_allocation_line", {
      id: randomUUID(),
      allocationId: id,
      productId: first.productId,
      variantKey: first.variantKey ?? null,
      batchKey: first.batchKey ?? null,
      requested: group.length,
      dispatched: 0,
      received: 0,
      rejected: 0,
      unitSnapshot: { serialIds: group.map((s) => s.id) },
    });
  }
  return { ...created, id, number, status: "requested", revision: 1 };
}

export async function approveSerialTransfer(
  input: { allocationId: string; revision: number },
  actorId: string,
): Promise<any> {
  const { allocation } = await loadTransfer(input.allocationId, input.revision);
  if (allocation.status !== "requested") {
    throw new Error("Transfer is not awaiting approval");
  }
  return upsertTableRow("inventory", "stock_allocation", {
    ...allocation,
    status: "approved",
    approvedById: actorId,
    revision: Number(allocation.revision) + 1,
  });
}

export async function dispatchSerialTransfer(
  input: { allocationId: string; revision: number },
  actorId: string,
): Promise<any> {
  const { allocation, lines, allSerials } = await loadTransfer(input.allocationId, input.revision);
  if (allocation.status !== "approved") {
    throw new Error("Transfer must be approved before dispatch");
  }
  const serialById = new Map(allSerials.map((s) => [String(s.id), s]));
  const movements: any[] = [];
  for (const line of lines) {
    const ids = lineSerialIds(line);
    for (const sid of ids) {
      const s = serialById.get(sid);
      if (s) {
        await upsertTableRow("inventory", "stock_serial", {
          ...s,
          locationId: allocation.transitLocationId,
          status: "in_transit",
          revision: Number(s.revision ?? 0) + 1,
        });
      }
    }
    const qty = Number(line.requested ?? ids.length ?? 0);
    await upsertTableRow("inventory", "stock_allocation_line", {
      ...line,
      dispatched: qty,
    });
    if (qty > 0 && line.productId) {
      movements.push(
        {
          type: "transfer_out",
          productId: String(line.productId),
          variantId: line.variantKey || undefined,
          locationId: String(allocation.sourceLocationId),
          quantity: -qty,
          sourceType: "stock_transfer",
          sourceId: allocation.id,
          transferId: allocation.id,
        },
        {
          type: "transfer_in",
          productId: String(line.productId),
          variantId: line.variantKey || undefined,
          locationId: String(allocation.transitLocationId),
          quantity: qty,
          sourceType: "stock_transfer",
          sourceId: allocation.id,
          transferId: allocation.id,
        },
      );
    }
  }
  await postMovements(null, movements, actorId);
  return upsertTableRow("inventory", "stock_allocation", {
    ...allocation,
    status: "in_transit",
    revision: Number(allocation.revision) + 1,
  });
}

export async function receiveSerialTransfer(
  input: { allocationId: string; revision: number; codes: string[] },
  actorId: string,
): Promise<any> {
  const { allocation, lines, allSerials } = await loadTransfer(input.allocationId, input.revision);
  if (!["in_transit", "partially_received"].includes(String(allocation.status))) {
    throw new Error("Transfer is not in transit");
  }
  const receivedCodes = new Set((input.codes || []).map((c) => c.trim()).filter(Boolean));
  const serialById = new Map(allSerials.map((s) => [String(s.id), s]));
  let allDone = true;
  const movements: any[] = [];
  for (const line of lines) {
    const ids = lineSerialIds(line);
    let newlyReceived = 0;
    for (const sid of ids) {
      const s = serialById.get(sid);
      if (s && s.locationId === allocation.transitLocationId && (!receivedCodes.size || receivedCodes.has(String(s.code)))) {
        await upsertTableRow("inventory", "stock_serial", {
          ...s,
          locationId: allocation.destinationLocationId,
          status: "in_stock",
          revision: Number(s.revision ?? 0) + 1,
        });
        newlyReceived++;
      }
    }
    const nextReceived = Number(line.received ?? 0) + newlyReceived;
    const target = Number(line.dispatched ?? line.requested ?? 0);
    if (nextReceived + Number(line.rejected ?? 0) < target) {
      allDone = false;
    }
    if (newlyReceived > 0) {
      await upsertTableRow("inventory", "stock_allocation_line", {
        ...line,
        received: nextReceived,
      });
      if (line.productId) {
        movements.push(
          {
            type: "transfer_out",
            productId: String(line.productId),
            variantId: line.variantKey || undefined,
            locationId: String(allocation.transitLocationId),
            quantity: -newlyReceived,
            sourceType: "stock_transfer",
            sourceId: allocation.id,
            transferId: allocation.id,
          },
          {
            type: "transfer_in",
            productId: String(line.productId),
            variantId: line.variantKey || undefined,
            locationId: String(allocation.destinationLocationId),
            quantity: newlyReceived,
            sourceType: "stock_transfer",
            sourceId: allocation.id,
            transferId: allocation.id,
          },
        );
      }
    }
  }
  if (movements.length) {
    await postMovements(null, movements, actorId);
  }
  return upsertTableRow("inventory", "stock_allocation", {
    ...allocation,
    status: allDone ? "received" : "partially_received",
    revision: Number(allocation.revision) + 1,
  });
}

export async function reportMissingTransferUnits(
  input: { allocationId: string; revision: number; codes: string[]; reason: string },
  actorId: string,
): Promise<any> {
  const { allocation, lines, allSerials } = await loadTransfer(input.allocationId, input.revision);
  const missingCodes = new Set((input.codes || []).map((c) => c.trim()).filter(Boolean));
  if (!missingCodes.size) throw new Error("Missing serial codes are required");
  const serialById = new Map(allSerials.map((s) => [String(s.id), s]));
  for (const line of lines) {
    const ids = lineSerialIds(line);
    let newlyMissing = 0;
    for (const sid of ids) {
      const s = serialById.get(sid);
      if (s && missingCodes.has(String(s.code))) {
        await upsertTableRow("inventory", "stock_serial", {
          ...s,
          status: "missing",
          revision: Number(s.revision ?? 0) + 1,
        });
        newlyMissing++;
      }
    }
    if (newlyMissing > 0) {
      await upsertTableRow("inventory", "stock_allocation_line", {
        ...line,
        rejected: Number(line.rejected ?? 0) + newlyMissing,
      });
    }
  }
  const nextRevision = Number(allocation.revision) + 1;
  await upsertTableRow("inventory", "stock_trace_event", {
    id: randomUUID(),
    entityType: "stock_transfer",
    entityId: allocation.id,
    revision: nextRevision,
    action: "missing_reported",
    actorId,
    details: { codes: Array.from(missingCodes), reason: input.reason || "" },
  });
  return upsertTableRow("inventory", "stock_allocation", {
    ...allocation,
    revision: nextRevision,
  });
}

export async function closeSerialTransfer(
  input: { allocationId: string; revision: number },
  _actorId: string,
): Promise<any> {
  const { allocation } = await loadTransfer(input.allocationId, input.revision);
  return upsertTableRow("inventory", "stock_allocation", {
    ...allocation,
    status: "closed",
    revision: Number(allocation.revision) + 1,
  });
}