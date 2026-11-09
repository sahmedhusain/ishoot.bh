import { db, runAtomicMutation } from "../atomic";
import { getEffectivePermissions } from "./permissions";

export async function requireBranchAccess(
  actorId: string,
  branchId: string,
  manage = false,
) {
  const [actor, branch] = await Promise.all([
    db.user.findUnique({ where: { id: actorId } }),
    db.branch.findUnique({ where: { id: branchId } }),
  ]);
  if (!actor?.isActive || !branch?.isActive)
    throw new Error("Branch access denied");
  if (actor.role !== "super_admin" && actor.role !== "admin") {
    const grant = await db.branchGrant.findUnique({
      where: { branchId_userId: { branchId, userId: actorId } },
    });
    if (!grant || (manage && !grant.canManage))
      throw new Error("Branch access denied");
  }
  return { actor, branch };
}
export async function requireStockLocationAccess(
  actorId: string,
  locationId: string,
  write = false,
) {
  const location = await db.stockLocation.findUnique({
    where: { id: locationId },
    include: { warehouse: true },
  });
  if (
    !location?.isActive ||
    !location.warehouse.isActive
  )
    throw new Error("Location is unavailable or has no branch");
  const branchId = location.warehouse.branchId ?? "legacy-main";
  const { actor } = await requireBranchAccess(
    actorId,
    branchId,
  );
  const grants = await getEffectivePermissions(
    actor.role,
    actor.permissions as Record<string, boolean> | undefined,
  );
  if (!grants[`inventory:${write ? "edit" : "read"}`])
    throw new Error("Inventory access denied");
  return location;
}
export async function listAccessibleBranches(actorId: string) {
  const actor = await db.user.findUnique({ where: { id: actorId } });
  if (!actor?.isActive) throw new Error("Branch access denied");
  return db.branch.findMany({
    where: {
      isActive: true,
      ...(actor.role === "super_admin" || actor.role === "admin"
        ? {}
        : { grants: { some: { userId: actorId } } }),
    },
    orderBy: { code: "asc" },
  });
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
    const actor = await db.user.findUnique({ where: { id: actorId } });
    if (!actor?.isActive || actor.role !== "super_admin")
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
    const data = {
      code: input.code,
      name: input.name.trim(),
      timeZone: input.timeZone,
      businessDayStart: input.businessDayStart,
    };
    if (input.id) {
      const updated = await db.branch.updateMany({
        where: { id: input.id, revision: input.revision ?? -1 },
        data: { ...data, revision: { increment: 1 } },
      });
      if (updated.count !== 1)
        throw new Error("Branch changed; reload before saving");
    }
    const result = input.id
      ? await db.branch.findUniqueOrThrow({ where: { id: input.id } })
      : await db.branch.create({ data });
    await db.activityLog.create({
      data: {
        userId: actorId,
        action: input.id ? "update" : "create",
        entityType: "branch",
        entityId: result.id,
        details: data,
      },
    });
    return result;
  });
}

export async function requireWarehouseAccess(actorId: string, warehouseId: string, action: "read" | "edit" | "create" | "approve" = "read") {
  const warehouse=await db.warehouse.findUnique({where:{id:warehouseId}});
  if(!warehouse?.isActive||!warehouse.branchId)throw new Error("Location is unavailable or has no branch");
  const {actor}=await requireBranchAccess(actorId,warehouse.branchId);
  const permissions=await getEffectivePermissions(actor.role,actor.permissions as Record<string,boolean>|undefined);
  if(!permissions[`inventory:${action}`])throw new Error("Inventory access denied");
  return warehouse;
}
export async function requireStockCountAccess(actorId: string, countId: string, action: "read" | "edit" | "approve" = "read") {
  const count=await db.stockCount.findUnique({where:{id:countId}});
  if(!count) throw new Error("Location is unavailable or has no branch");
  await requireWarehouseAccess(actorId,count.warehouseId,action);return count;
}
