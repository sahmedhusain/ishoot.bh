import { db } from "../atomic";
import { listAccessibleBranches } from "./branches";
import { getEffectivePermissions } from "./permissions";

export async function getTransferWorkspace(actorId: string) {
  const actor = await db.user.findUniqueOrThrow({ where: { id: actorId } });
  const permissions = await getEffectivePermissions(
    actor.role,
    actor.permissions as Record<string, boolean> | undefined,
  );
  if (!actor.isActive || !permissions["inventory:read"])
    throw new Error("Inventory access denied");
  const branches = await listAccessibleBranches(actorId);
  const locations = await db.stockLocation.findMany({
    where: {
      isActive: true,
      warehouse: {
        isActive: true,
        branchId: { in: branches.map((b) => b.id) },
      },
    },
    include: { warehouse: true },
    orderBy: [{ warehouseId: "asc" }, { code: "asc" }],
  });
  const managedBranches =
    actor.role === "super_admin"
      ? branches.map((b) => b.id)
      : (
          await db.branchGrant.findMany({
            where: { userId: actorId, canManage: true },
            select: { branchId: true },
          })
        ).map((g) => g.branchId);
  const managedLocations = new Set(
    locations
      .filter((l) => managedBranches.includes(l.warehouse.branchId!))
      .map((l) => l.id),
  );
  const locationIds = locations.map((l) => l.id);
  const transfers = await db.stockAllocation.findMany({
    where: {
      kind: "warehouse_transfer",
      OR: [
        { sourceLocationId: { in: locationIds } },
        { destinationLocationId: { in: locationIds } },
      ],
    },
    include: { lines: true },
    orderBy: { createdAt: "desc" },
    take: 101,
  });
  const productIds = [
    ...Array.from(
      new Set(transfers.flatMap((t) => t.lines.map((l) => l.productId))),
    ),
  ];
  const reports = await db.stockTraceEvent.findMany({
    where: {
      entityType: "stock_transfer",
      action: "missing_reported",
      entityId: { in: transfers.slice(0, 100).map((t) => t.id) },
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
    select: { id: true, entityId: true, revision: true, details: true },
  });
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, sku: true, nameEn: true, nameAr: true },
  });
  return {
    canEdit: !!permissions["inventory:edit"],
    canApprove: !!permissions["inventory:approve"],
    hasMore: transfers.length > 100,
    locations: locations.map((l) => ({
      id: l.id,
      label: `${branches.find((b) => b.id === l.warehouse.branchId)?.name} / ${l.warehouse.code} / ${l.code}`,
    })),
    transfers: await Promise.all(
      transfers.slice(0, 100).map(async (t) => ({
        id: t.id,
        number: t.number,
        reports: reports.filter((report) => report.entityId === t.id).map((report) => ({
          id: report.id,
          revision: report.revision,
          reason: String((report.details as { reason?: string }).reason ?? ""),
          codes: (report.details as { codes?: string[] }).codes ?? [],
        })),
        canApprove:
          !!permissions["inventory:approve"] &&
          managedLocations.has(t.sourceLocationId),
        canClose:
          !!permissions["inventory:approve"] &&
          managedLocations.has(t.destinationLocationId),
        status: t.status,
        revision: t.revision,
        sourceLocationId: t.sourceLocationId,
        destinationLocationId: t.destinationLocationId,
        lines: await Promise.all(
          t.lines.map(async (l) => ({
            id: l.id,
            product: products.find((p) => p.id === l.productId)!,
            requested: l.requested.toString(),
            dispatched: l.dispatched.toString(),
            received: l.received.toString(),
            serials: await db.stockSerial.findMany({
              where: { id: { in: l.serialIds } },
              select: { code: true, status: true, locationId: true },
              orderBy: { code: "asc" },
            }),
          })),
        ),
      })),
    ),
  };
}
