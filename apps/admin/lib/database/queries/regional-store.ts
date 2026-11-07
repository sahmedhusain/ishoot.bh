import { Prisma } from "@prisma/client";
import { db, runAtomicMutation } from "../atomic";
import { requireBranchAccess } from "./branches";

export interface StoreRegionInput {
  id?: string;
  code: string;
  nameEn: string;
  nameAr: string;
  currency: string;
  defaultLanguage?: string;
  branchId: string;
  isEnabled?: boolean;
  priceMultiplier?: number | string;
  settings?: Record<string, unknown>;
}

export async function saveStoreRegion(input: StoreRegionInput, actorId: string) {
  return runAtomicMutation(async () => {
    await requireBranchAccess(actorId, input.branchId, true);
    if (!input.code.trim() || !input.nameEn.trim() || !input.nameAr.trim() || !input.currency.trim())
      throw new Error("Invalid store region");

    const multiplier = input.priceMultiplier != null
      ? new Prisma.Decimal(input.priceMultiplier.toString())
      : new Prisma.Decimal("1.0000");

    if (multiplier.lessThan(0)) throw new Error("Invalid store region");

    const data = {
      code: input.code.trim().toUpperCase(),
      nameEn: input.nameEn.trim(),
      nameAr: input.nameAr.trim(),
      currency: input.currency.trim().toUpperCase(),
      defaultLanguage: input.defaultLanguage?.trim() || "en",
      branchId: input.branchId,
      isEnabled: input.isEnabled ?? true,
      priceMultiplier: multiplier,
      settings: input.settings ? JSON.parse(JSON.stringify(input.settings)) : undefined,
    };

    if (input.id) {
      const existing = await db.storeRegion.findUnique({ where: { id: input.id } });
      if (!existing) throw new Error("Store region not found");
      return db.storeRegion.update({
        where: { id: input.id },
        data,
      });
    }

    return db.storeRegion.create({ data });
  });
}

export async function listStoreRegions() {
  return db.storeRegion.findMany({
    orderBy: { code: "asc" },
    include: { branch: true },
  });
}

export async function getStoreRegion(code: string) {
  return db.storeRegion.findUnique({
    where: { code: code.trim().toUpperCase() },
    include: { branch: true },
  });
}

export async function resolveRegionalPrice(basePrice: number | string, regionCode: string) {
  const region = await getStoreRegion(regionCode);
  const base = new Prisma.Decimal(basePrice.toString());
  if (!region || !region.isEnabled) return base;
  return base.mul(region.priceMultiplier);
}
