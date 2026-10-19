import { CURRENCY_CONFIGS, type SupportedCurrency } from "@platform/database/types";

/** Converts a BHD price into `currency` at `perBhd` units per 1 BHD, rounded to that currency's minor unit. */
export function convertFromBhd(amountBhd: number, perBhd: number, currency: SupportedCurrency): number {
  const decimals = CURRENCY_CONFIGS[currency]?.decimals ?? 3;
  const factor = 10 ** decimals;
  return Math.round(amountBhd * (currency === "BHD" ? 1 : perBhd) * factor) / factor;
}
