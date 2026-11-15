import { Database } from "@platform/database/decimal";
import { runAtomicMutation } from "../api/atomic";
import { listTableRows, upsertTableRow } from "../api/tables";
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

    const multiplier =
      input.priceMultiplier != null
        ? new Database.Decimal(input.priceMultiplier.toString())
        : new Database.Decimal("1.0000");

    if (multiplier.lessThan(0)) throw new Error("Invalid store region");

    const data = {
      code: input.code.trim().toUpperCase(),
      nameEn: input.nameEn.trim(),
      nameAr: input.nameAr.trim(),
      currency: input.currency.trim().toUpperCase(),
      defaultLanguage: input.defaultLanguage?.trim() || "en",
      branchId: input.branchId,
      isEnabled: input.isEnabled ?? true,
      priceMultiplier: Number(multiplier.toString()),
      settings: input.settings ? JSON.parse(JSON.stringify(input.settings)) : undefined,
    };

    if (input.id) {
      const regions = await listTableRows<Record<string, any>>("commerce", "store_region");
      const existing = regions.find((r) => r.id === input.id);
      if (!existing) throw new Error("Store region not found");
      return upsertTableRow("commerce", "store_region", {
        id: input.id,
        ...data,
      });
    }

    return upsertTableRow("commerce", "store_region", {
      id: crypto.randomUUID(),
      ...data,
    });
  });
}

export async function listStoreRegions() {
  const [regions, branches] = await Promise.all([
    listTableRows<Record<string, any>>("commerce", "store_region", "code ASC"),
    listTableRows<Record<string, any>>("identity", "branch"),
  ]);
  const branchById = new Map(branches.map((b) => [String(b.id), b]));
  return regions
    .sort((a, b) => String(a.code ?? "").localeCompare(String(b.code ?? "")))
    .map((r) => ({
      ...r,
      branch: r.branchId ? (branchById.get(String(r.branchId)) ?? null) : null,
    }));
}

export async function getStoreRegion(code: string) {
  const normalized = code.trim().toUpperCase();
  const [regions, branches] = await Promise.all([
    listTableRows<Record<string, any>>("commerce", "store_region"),
    listTableRows<Record<string, any>>("identity", "branch"),
  ]);
  const region = regions.find((r) => String(r.code ?? "").toUpperCase() === normalized);
  if (!region) return null;
  const branch = region.branchId
    ? (branches.find((b) => b.id === region.branchId) ?? null)
    : null;
  return { ...region, branch };
}

export async function resolveRegionalPrice(basePrice: number | string, regionCode: string) {
  const region = await getStoreRegion(regionCode);
  const reg: Record<string, any> | null = region;
  const base = new Database.Decimal(basePrice.toString());
  if (!reg || !reg.isEnabled) return base;
  return base.mul(new Database.Decimal(String(reg.priceMultiplier ?? 1)));
}
