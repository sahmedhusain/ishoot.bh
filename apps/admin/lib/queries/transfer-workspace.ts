import { listTableRows } from "../api/tables";
import { listAccessibleBranches } from "./branches";
import { getEffectivePermissions } from "./permissions";

export async function getTransferWorkspace(actorId: string) {
  const users = await listTableRows<any>("identity", "user").catch(() => []);
  const actor = users.find((u) => u.id === actorId);
  if (!actor) {
    return {
      canEdit: false,
      canApprove: false,
      hasMore: false,
      locations: [],
      transfers: [],
    };
  }
  const permissions = await getEffectivePermissions(
    actor.role,
    actor.permissions as Record<string, boolean> | undefined,
  );
  if (!actor.isActive || !permissions["inventory:read"])
    throw new Error("Inventory access denied");
  const branches = await listAccessibleBranches(actorId);
  const branchIds = new Set(branches.map((b) => b.id));
  const [rawLocations, rawWarehouses, rawBranchGrants, rawAllocations, rawAllocLines, rawTraceEvents, rawProducts, rawSerials] = await Promise.all([
    listTableRows<any>("inventory", "stock_location", "warehouse_id ASC, code ASC").catch(() => []),
    listTableRows<any>("inventory", "warehouse").catch(() => []),
    actor.role === "super_admin" ? Promise.resolve([]) : listTableRows<any>("identity", "branch_grant").catch(() => []),
    listTableRows<any>("inventory", "stock_allocation", "created_at DESC").catch(() => []),
    listTableRows<any>("inventory", "stock_allocation_line").catch(() => []),
    listTableRows<any>("inventory", "stock_trace_event", "created_at DESC").catch(() => []),
    listTableRows<any>("inventory", "product").catch(() => []),
    listTableRows<any>("inventory", "stock_serial", "code ASC").catch(() => []),
  ]);
  const warehouseMap = new Map<string, any>(rawWarehouses.map((w): [any, any] => [w.id, w]));
  const locations = rawLocations
    .map((l) => ({ ...l, warehouse: warehouseMap.get(l.warehouseId) }))
    .filter((l) => l.isActive && l.warehouse?.isActive && branchIds.has(l.warehouse.branchId));
  const managedBranches =
    actor.role === "super_admin"
      ? branches.map((b) => b.id)
      : rawBranchGrants
          .filter((g) => g.userId === actorId && g.canManage)
          .map((g) => g.branchId);
  const managedLocations = new Set(
    locations
      .filter((l) => managedBranches.includes(l.warehouse.branchId!))
      .map((l) => l.id),
  );
  const locationIdSet = new Set(locations.map((l) => l.id));
  const linesByAlloc = new Map<string, any[]>();
  for (const l of rawAllocLines) {
    const arr = linesByAlloc.get(l.allocationId) || [];
    arr.push(l);
    linesByAlloc.set(l.allocationId, arr);
  }
  const transfers = rawAllocations
    .filter(
      (t) =>
        t.kind === "warehouse_transfer" &&
        (locationIdSet.has(t.sourceLocationId) || locationIdSet.has(t.destinationLocationId)),
    )
    .slice(0, 101)
    .map((t) => ({ ...t, lines: linesByAlloc.get(t.id) || [] }));
  const transferIds = new Set(transfers.slice(0, 100).map((t) => t.id));
  const productIds = new Set(transfers.flatMap((t) => t.lines.map((l: any) => l.productId)));
  const reports = rawTraceEvents
    .filter(
      (ev) =>
        ev.entityType === "stock_transfer" &&
        ev.action === "missing_reported" &&
        transferIds.has(ev.entityId),
    )
    .slice(0, 1000);
  const products = rawProducts.filter((p) => productIds.has(p.id));
  const serialMap = new Map<string, any>(rawSerials.map((s): [any, any] => [s.id, s]));
  return {
    canEdit: !!permissions["inventory:edit"],
    canApprove: !!permissions["inventory:approve"],
    hasMore: transfers.length > 100,
    locations: locations.map((l) => ({
      id: l.id,
      label: `${branches.find((b) => b.id === l.warehouse.branchId)?.name} / ${l.warehouse.code} / ${l.code}`,
    })),
    transfers: transfers.slice(0, 100).map((t) => ({
      id: t.id,
      number: t.number,
      reports: reports
        .filter((report) => report.entityId === t.id)
        .map((report) => ({
          id: report.id,
          revision: report.revision,
          reason: String((report.details as { reason?: string })?.reason ?? ""),
          codes: (report.details as { codes?: string[] })?.codes ?? [],
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
      lines: t.lines.map((l: any) => {
        const serialIds = Array.isArray(l.serialIds) ? l.serialIds : [];
        return {
          id: l.id,
          product: products.find((p) => p.id === l.productId)!,
          requested: String(l.requested ?? 0),
          dispatched: String(l.dispatched ?? 0),
          received: String(l.received ?? 0),
          serials: serialIds
            .map((sid: string) => serialMap.get(sid))
            .filter(Boolean)
            .map((s: any) => ({
              code: s.code,
              status: s.status,
              locationId: s.locationId,
            })),
        };
      }),
    })),
  };
}
