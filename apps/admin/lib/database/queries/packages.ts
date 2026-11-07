import { db, runAtomicMutation } from "../atomic";
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
      const allPackages = await db.stockPackage.findMany({ select: { id: true, parentId: true } });
      const parents = new Map<string, string | null>(allPackages.map((p: any) => [p.id, p.parentId]));
      assertPackageParent("new-package", input.parentId, parents);
    }

    return db.stockPackage.create({
      data: {
        code: input.code.trim().toUpperCase(),
        kind: input.kind?.trim() || "carton",
        locationId: input.locationId,
        parentId: input.parentId || null,
        status: "open",
        createdById: actorId,
      },
    });
  });
}

export async function packSerialsIntoPackage(packageId: string, serialCodes: string[], actorId: string) {
  return runAtomicMutation(async () => {
    const pkg = await db.stockPackage.findUnique({ where: { id: packageId } });
    if (!pkg) throw new Error("Package not found");
    if (pkg.status === "sealed") throw new Error("Package already sealed");
    await requireStockLocationAccess(actorId, pkg.locationId, true);

    const codes = uniqueSerials(serialCodes);
    const serials = await db.stockSerial.findMany({
      where: { code: { in: codes } },
    });

    if (serials.length !== codes.length) throw new Error("Invalid serial movement");
    if (serials.some((s) => s.locationId !== pkg.locationId)) throw new Error("Invalid serial movement");
    if (serials.some((s) => s.packageId && s.packageId !== packageId)) throw new Error("Serial already in package");

    await db.stockSerial.updateMany({
      where: { id: { in: serials.map((s) => s.id) } },
      data: { packageId, revision: { increment: 1 } },
    });

    await db.stockTraceEvent.create({
      data: {
        entityType: "stock_package",
        entityId: packageId,
        revision: pkg.revision,
        action: "pack_serials",
        actorId,
        details: { count: serials.length, codes },
      },
    });

    return { success: true, count: serials.length };
  });
}

export async function sealStockPackage(packageId: string, sealNumber: string, actorId: string) {
  return runAtomicMutation(async () => {
    const pkg = await db.stockPackage.findUnique({ where: { id: packageId } });
    if (!pkg) throw new Error("Package not found");
    if (pkg.status === "sealed") throw new Error("Package already sealed");
    await requireStockLocationAccess(actorId, pkg.locationId, true);

    const updated = await db.stockPackage.update({
      where: { id: packageId },
      data: {
        status: "sealed",
        sealNumber: sealNumber.trim(),
        revision: { increment: 1 },
      },
    });

    await db.stockTraceEvent.create({
      data: {
        entityType: "stock_package",
        entityId: packageId,
        revision: updated.revision,
        action: "sealed",
        actorId,
        details: { sealNumber },
      },
    });

    return updated;
  });
}

export async function moveStockPackage(packageId: string, targetLocationId: string, actorId: string) {
  return runAtomicMutation(async () => {
    const pkg = await db.stockPackage.findUnique({
      where: { id: packageId },
      include: { serials: true },
    });
    if (!pkg) throw new Error("Package not found");
    if (pkg.locationId === targetLocationId) return pkg;
    const source = await requireStockLocationAccess(actorId, pkg.locationId, true);
    const destination = await requireStockLocationAccess(actorId, targetLocationId, true);

    const operationId = `pkg-move:${packageId}:${Date.now()}`;

    // Post paired movements for all enclosed serials
    for (const serial of pkg.serials) {
      await db.stockSerial.update({
        where: { id: serial.id },
        data: { locationId: targetLocationId, revision: { increment: 1 } },
      });

      const batch = serial.batchKey
        ? await db.stockBatch.findUnique({ where: { id: serial.batchKey } })
        : null;

      const common = {
        productId: serial.productId,
        variantId: serial.variantKey || undefined,
        batchNumber: batch?.batchNumber,
        sourceType: "package_move",
        sourceId: operationId,
        transferId: operationId,
      };

      await postMovements(
        db,
        [
          { ...common, type: "transfer_out", locationId: source.id, quantity: -1 },
          { ...common, type: "transfer_in", locationId: destination.id, quantity: 1 },
        ],
        actorId,
      );
    }

    // Update package location
    const updated = await db.stockPackage.update({
      where: { id: packageId },
      data: { locationId: targetLocationId, revision: { increment: 1 } },
    });

    await db.stockTraceEvent.create({
      data: {
        entityType: "stock_package",
        entityId: packageId,
        revision: updated.revision,
        action: "relocate",
        actorId,
        details: { fromLocationId: pkg.locationId, toLocationId: targetLocationId },
      },
    });

    return updated;
  });
}

export async function unpackStockPackage(packageId: string, actorId: string) {
  return runAtomicMutation(async () => {
    const pkg = await db.stockPackage.findUnique({ where: { id: packageId } });
    if (!pkg) throw new Error("Package not found");
    await requireStockLocationAccess(actorId, pkg.locationId, true);

    await db.stockSerial.updateMany({
      where: { packageId },
      data: { packageId: null, revision: { increment: 1 } },
    });

    const updated = await db.stockPackage.update({
      where: { id: packageId },
      data: { status: "unpacked", revision: { increment: 1 } },
    });

    await db.stockTraceEvent.create({
      data: {
        entityType: "stock_package",
        entityId: packageId,
        revision: updated.revision,
        action: "unpacked",
        actorId,
        details: {},
      },
    });

    return updated;
  });
}

export async function getStockPackage(packageId: string, actorId: string) {
  const pkg = await db.stockPackage.findUnique({
    where: { id: packageId },
    include: { serials: true, contents: true, location: true },
  });
  if (!pkg) return null;
  await requireStockLocationAccess(actorId, pkg.locationId, false);
  return pkg;
}
