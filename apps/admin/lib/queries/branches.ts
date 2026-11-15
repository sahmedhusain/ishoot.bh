import {
  getAdminUserApi,
  listAdminBranchesApi,
  listAdminBranchGrantsApi,
  saveAdminBranchApi,
} from "../api/identity";
import { listStockCounts, listWarehouses } from "../api/inventory";
import { listTableRows } from "../api/tables";
import { createActivityLogApi } from "../api/system-workspace";
import { runAtomicMutation } from "../api/atomic";
import { getEffectivePermissions } from "./permissions";

export async function requireBranchAccess(
  actorId: string,
  branchId: string,
  manage = false,
) {
  const [actor, branches] = await Promise.all([
    getAdminUserApi(actorId).catch(() => null),
    listAdminBranchesApi(),
  ]);
  const branch = branches.find((b) => b.id === branchId);
  if (!(actor?.is_active ?? actor?.isActive) || !(branch?.is_active ?? branch?.isActive))
    throw new Error("Branch access denied");
  if (actor.role !== "super_admin" && actor.role !== "admin") {
    const grants = await listAdminBranchGrantsApi();
    const grant = grants.find((g) => g.branch_id === branchId && g.user_id === actorId);
    if (!grant || (manage && !(grant.can_manage ?? grant.canManage)))
      throw new Error("Branch access denied");
  }
  return { actor, branch };
}

export async function requireStockLocationAccess(
  actorId: string,
  locationId: string,
  write = false,
) {
  const [locations, warehouses] = await Promise.all([
    listTableRows<any>("inventory", "stock_location"),
    listWarehouses(),
  ]);
  const location = locations.find((l: any) => l.id === locationId);
  const warehouse = warehouses.find((w: any) => w.id === location?.warehouseId);
  if (!location?.isActive || !warehouse?.isActive)
    throw new Error("Location is unavailable or has no branch");
  const branchId = (warehouse as any).branchId ?? "legacy-main";
  const { actor } = await requireBranchAccess(actorId, branchId);
  const grants = await getEffectivePermissions(
    actor.role,
    actor.permissions as Record<string, boolean> | undefined,
  );
  if (!grants[`inventory:${write ? "edit" : "read"}`])
    throw new Error("Inventory access denied");
  return { ...location, warehouse };
}

export async function listAccessibleBranches(actorId: string) {
  const [actor, branches, grants] = await Promise.all([
    getAdminUserApi(actorId).catch(() => null),
    listAdminBranchesApi(),
    listAdminBranchGrantsApi(),
  ]);
  if (!(actor?.is_active ?? actor?.isActive)) throw new Error("Branch access denied");
  const active = branches.filter((b) => b.is_active ?? b.isActive ?? true);
  if (actor.role === "super_admin" || actor.role === "admin") {
    return active.sort((a, b) => String(a.code ?? "").localeCompare(String(b.code ?? "")));
  }
  const grantedIds = new Set(
    grants.filter((g) => g.user_id === actorId).map((g) => g.branch_id),
  );
  return active
    .filter((b) => grantedIds.has(b.id))
    .sort((a, b) => String(a.code ?? "").localeCompare(String(b.code ?? "")));
}

export interface BranchInput {
  id?: string;
  revision?: number;
  code: string;
  name: string;
  timeZone: string;
  businessDayStart: number;
}

export async function saveBranch(input: BranchInput, actorId: string) {
  return runAtomicMutation(async () => {
    const actor = await getAdminUserApi(actorId).catch(() => null);
    if (!(actor?.is_active ?? actor?.isActive) || actor.role !== "super_admin")
      throw new Error("Branch administration requires a super administrator");
    if (
      !/^[A-Z0-9_-]{1,20}$/.test(input.code) ||
      !input.name.trim() ||
      input.name.length > 120 ||
      !Number.isInteger(input.businessDayStart) ||
      input.businessDayStart < 0 ||
      input.businessDayStart > 1439
    )
      throw new Error("Invalid branch configuration");
    new Intl.DateTimeFormat("en", { timeZone: input.timeZone }).format();
    const result = await saveAdminBranchApi({
      id: input.id,
      code: input.code,
      name: input.name.trim(),
      timeZone: input.timeZone,
      businessDayStart: input.businessDayStart,
    });
    await createActivityLogApi({
      userId: actorId,
      action: input.id ? "update" : "create",
      entityType: "branch",
      entityId: result.id,
      details: {
        code: input.code,
        name: input.name.trim(),
        timeZone: input.timeZone,
        businessDayStart: input.businessDayStart,
      },
    }).catch(() => null);
    return result;
  });
}

export async function requireWarehouseAccess(
  actorId: string,
  warehouseId: string,
  action: "read" | "edit" | "create" | "approve" = "read",
) {
  const warehouses = await listWarehouses();
  const warehouse = warehouses.find((w: any) => w.id === warehouseId);
  const branchId = (warehouse as any)?.branchId;
  if (!warehouse?.isActive || !branchId)
    throw new Error("Location is unavailable or has no branch");
  const { actor } = await requireBranchAccess(actorId, branchId);
  const permissions = await getEffectivePermissions(
    actor.role,
    actor.permissions as Record<string, boolean> | undefined,
  );
  if (!permissions[`inventory:${action}`])
    throw new Error("Inventory access denied");
  return warehouse;
}

export async function requireStockCountAccess(
  actorId: string,
  countId: string,
  action: "read" | "edit" | "approve" = "read",
) {
  const counts = await listStockCounts();
  const count = counts.find((c: any) => c.id === countId);
  if (!count) throw new Error("Location is unavailable or has no branch");
  await requireWarehouseAccess(actorId, count.warehouseId, action);
  return count;
}
