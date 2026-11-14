import { Database } from "@platform/database/decimal";

export interface StoreRegionRecord {
  id: string;
  code: string;
  name?: string;
  currency: string;
  priceMultiplier: number | string;
  isEnabled: boolean;
}

export async function listStoreRegions(): Promise<StoreRegionRecord[]> {
  return [];
}

export async function getStoreRegion(
  _code: string,
): Promise<StoreRegionRecord | null> {
  return null;
}

export async function resolveRegionalPrice(
  basePrice: number | string,
  _regionCode: string,
) {
  return new Database.Decimal(basePrice.toString());
}
