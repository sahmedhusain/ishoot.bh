import { Prisma } from "@prisma/client";
import { db } from "../atomic";

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

export async function resolveRegionalPrice(
  basePrice: number | string,
  regionCode: string,
) {
  const region = await getStoreRegion(regionCode);
  const base = new Prisma.Decimal(basePrice.toString());
  if (!region || !region.isEnabled) return base;
  return base.mul(region.priceMultiplier);
}
