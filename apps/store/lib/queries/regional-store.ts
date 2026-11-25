import { Database } from "@platform/database/decimal";
import { STORE_REGIONS } from "../constants/store";
import { getCurrencyDecimals, getCurrencySymbol } from "../config/currency";
import { getCanonicalRegionName } from "../config/phone";
import { getCompanySettings } from "./company-settings";

export interface StoreRegionRecord {
  id: string;
  code: string;
  name?: string;
  name_en?: string;
  name_ar?: string;
  currency: string;
  currencySymbol?: string;
  priceMultiplier: number | string;
  freeShippingThreshold?: number | null;
  defaultLanguage?: string | null;
  flag?: string;
  isEnabled: boolean;
}

export async function listStoreRegions(): Promise<StoreRegionRecord[]> {
  const company = await getCompanySettings().catch(() => null);
  const base = STORE_REGIONS[0];
  const code = (company?.country || base.code).trim().toUpperCase();
  const currency = (company?.default_currency || base.currency).trim().toUpperCase();
  const nameEn = company?.city
    ? `${company.city}, ${getCanonicalRegionName(code, "en") || code}`
    : (getCanonicalRegionName(code, "en") || base.name_en);
  const nameAr = company?.city
    ? `${company.city}، ${getCanonicalRegionName(code, "ar") || code}`
    : (getCanonicalRegionName(code, "ar") || base.name_ar);

  return [
    {
      id: `region-${code.toLowerCase()}`,
      code,
      name: nameEn,
      name_en: nameEn,
      name_ar: nameAr,
      currency,
      currencySymbol: getCurrencySymbol(currency, false) || base.currencySymbol,
      priceMultiplier: 1,
      freeShippingThreshold: base.freeShippingOver,
      defaultLanguage: company?.primary_language || "en",
      flag: code,
      isEnabled: true,
    },
  ];
}

export async function getStoreRegion(
  code: string,
): Promise<StoreRegionRecord | null> {
  const key = (code || "").trim().toUpperCase();
  if (!key) return null;
  const regions = await listStoreRegions();
  return (
    regions.find(
      (r) => r.code.toUpperCase() === key || r.currency.toUpperCase() === key,
    ) ?? null
  );
}

export async function resolveRegionalPrice(
  basePrice: number | string,
  regionCode: string,
) {
  const numeric = Number(basePrice ?? 0);
  if (!Number.isFinite(numeric)) {
    return new Database.Decimal(0);
  }
  const region = await getStoreRegion(regionCode).catch(() => null);
  const multiplier = region ? Number(region.priceMultiplier ?? 1) : 1;
  const decimals = region ? getCurrencyDecimals(region.currency) : 3;
  const converted =
    multiplier > 0 && Number.isFinite(multiplier)
      ? numeric * multiplier
      : numeric;
  return new Database.Decimal(converted.toFixed(decimals));
}
