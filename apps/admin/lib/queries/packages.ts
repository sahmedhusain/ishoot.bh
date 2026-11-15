import { runAtomicMutation } from "../api/atomic";
import { listTableRows, upsertTableRow } from "../api/tables";
import { requireStockLocationAccess } from "./branches";
import { postMovements } from "./inventory";
import { assertPackageParent, uniqueSerials } from "../constants/stock-traceability";

export interface PackageInput {
  code: string;
  kind?: string;
  locationId: string;
  parentId?: string | null;
}

export async function createStockPackage(input: PackageInput, actorId: string) {
  return runAtomicMutation(async () => {
    await requireStockLocationAccess(actorId, input.locationId, true);

    if (input.parentId) {
      const allPackages = await listTableRows<Record<string, any>>("inventory", "stock_package");
      const parents = new Map<string, string | null>(
        allPackages.map((p) => [String(p.id), p.parentId ?? null]),
      );
      assertPackageParent("new-package", input.parentId, parents);
    }

    return upsertTableRow("inventory", "stock_package", {
      id: crypto.randomUUID(),
      code: input.code.trim().toUpperCase(),
      kind: input.kind?.trim() || "carton",
      locationId: input.locationId,
      parentId: input.parentId || null,
      status: "open",
      revision: 1,
      createdById: actorId,
    });
  });
}

export async function packSerialsIntoPackage(packageId: string, serialCodes: string[], actorId: string) {
  return runAtomicMutation(async () => {
    const [packages, allSerials] = await Promise.all([
      listTableRows<Record<string, any>>("inventory", "stock_package"),
      listTableRows<Record<string, any>>("inventory", "stock_serial"),
    ]);
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) throw new Error("Package not found");
    if (pkg.status === "sealed") throw new Error("Package already sealed");
    await requireStockLocationAccess(actorId, String(pkg.locationId), true);

    const codes = uniqueSerials(serialCodes);
    const codeSet = new Set(codes);
    const serials = allSerials.filter((s) => codeSet.has(String(s.code)));

    if (serials.length !== codes.length) throw new Error("Invalid serial movement");
    if (serials.some((s) => s.locationId !== pkg.locationId)) throw new Error("Invalid serial movement");
    if (serials.some((s) => s.packageId && s.packageId !== packageId)) throw new Error("Serial already in package");

    for (const s of serials) {
      await upsertTableRow("inventory", "stock_serial", {
        id: s.id,
        packageId,
        revision: Number(s.revision ?? 0) + 1,
      });
    }

    await upsertTableRow("inventory", "stock_trace_event", {
      id: crypto.randomUUID(),
      entityType: "stock_package",
      entityId: packageId,
      revision: Number(pkg.revision ?? 1),
      action: "pack_serials",
      actorId,
      details: { count: serials.length, codes },
    });

    return { success: true, count: serials.length };
  });
}

export async function sealStockPackage(packageId: string, sealNumber: string, actorId: string) {
  return runAtomicMutation(async () => {
    const packages = await listTableRows<Record<string, any>>("inventory", "stock_package");
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) throw new Error("Package not found");
    if (pkg.status === "sealed") throw new Error("Package already sealed");
    await requireStockLocationAccess(actorId, String(pkg.locationId), true);

    const nextRev = Number(pkg.revision ?? 1) + 1;
    const updated = await upsertTableRow("inventory", "stock_package", {
      id: packageId,
      status: "sealed",
      sealNumber: sealNumber.trim(),
      revision: nextRev,
    });

    await upsertTableRow("inventory", "stock_trace_event", {
      id: crypto.randomUUID(),
      entityType: "stock_package",
      entityId: packageId,
      revision: nextRev,
      action: "sealed",
      actorId,
      details: { sealNumber },
    });

    return updated;
  });
}

export async function moveStockPackage(packageId: string, targetLocationId: string, actorId: string) {
  return runAtomicMutation(async () => {
    const [packages, allSerials, allBatches] = await Promise.all([
      listTableRows<Record<string, any>>("inventory", "stock_package"),
      listTableRows<Record<string, any>>("inventory", "stock_serial"),
      listTableRows<Record<string, any>>("inventory", "stock_batch"),
    ]);
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) throw new Error("Package not found");
    if (pkg.locationId === targetLocationId) return pkg;
    const source = await requireStockLocationAccess(actorId, String(pkg.locationId), true);
    const destination = await requireStockLocationAccess(actorId, targetLocationId, true);

    const operationId = `pkg-move:${packageId}:${Date.now()}`;
    const serials = allSerials.filter((s) => s.packageId === packageId);

    for (const serial of serials) {
      await upsertTableRow("inventory", "stock_serial", {
        id: serial.id,
        locationId: targetLocationId,
        revision: Number(serial.revision ?? 0) + 1,
      });

      const batch = serial.batchKey
        ? allBatches.find((b) => b.id === serial.batchKey)
        : null;

      const common = {
        productId: String(serial.productId),
        variantId: serial.variantKey || undefined,
        batchNumber: batch?.batchNumber,
        sourceType: "package_move",
        sourceId: operationId,
        transferId: operationId,
      };

      await postMovements(
        null,
        [
          { ...common, type: "transfer_out", locationId: source.id, quantity: -1 },
          { ...common, type: "transfer_in", locationId: destination.id, quantity: 1 },
        ],
        actorId,
      );
    }

    const nextRev = Number(pkg.revision ?? 1) + 1;
    const updated = await upsertTableRow("inventory", "stock_package", {
      id: packageId,
      locationId: targetLocationId,
      revision: nextRev,
    });

    await upsertTableRow("inventory", "stock_trace_event", {
      id: crypto.randomUUID(),
      entityType: "stock_package",
      entityId: packageId,
      revision: nextRev,
      action: "relocate",
      actorId,
      details: { fromLocationId: pkg.locationId, toLocationId: targetLocationId },
    });

    return updated;
  });
}

export async function unpackStockPackage(packageId: string, actorId: string) {
  return runAtomicMutation(async () => {
    const [packages, allSerials] = await Promise.all([
      listTableRows<Record<string, any>>("inventory", "stock_package"),
      listTableRows<Record<string, any>>("inventory", "stock_serial"),
    ]);
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) throw new Error("Package not found");
    await requireStockLocationAccess(actorId, String(pkg.locationId), true);

    for (const s of allSerials) {
      if (s.packageId === packageId) {
        await upsertTableRow("inventory", "stock_serial", {
          id: s.id,
          packageId: null,
          revision: Number(s.revision ?? 0) + 1,
        });
      }
    }

    const nextRev = Number(pkg.revision ?? 1) + 1;
    const updated = await upsertTableRow("inventory", "stock_package", {
      id: packageId,
      status: "unpacked",
      revision: nextRev,
    });

    await upsertTableRow("inventory", "stock_trace_event", {
      id: crypto.randomUUID(),
      entityType: "stock_package",
      entityId: packageId,
      revision: nextRev,
      action: "unpacked",
      actorId,
      details: {},
    });

    return updated;
  });
}

export async function getStockPackage(packageId: string, actorId: string) {
  const [packages, serials, contents, locations] = await Promise.all([
    listTableRows<Record<string, any>>("inventory", "stock_package"),
    listTableRows<Record<string, any>>("inventory", "stock_serial"),
    listTableRows<Record<string, any>>("system", "package_content"),
    listTableRows<Record<string, any>>("inventory", "stock_location"),
  ]);
  const pkg = packages.find((p) => p.id === packageId);
  if (!pkg) return null;
  await requireStockLocationAccess(actorId, String(pkg.locationId), false);
  return {
    ...pkg,
    serials: serials.filter((s) => s.packageId === packageId),
    contents: contents.filter((c) => c.packageId === packageId),
    location: locations.find((l) => l.id === pkg.locationId) ?? null,
  };
}
