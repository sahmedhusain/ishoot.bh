import { serverMessages } from "@platform/locales";
import { getContentSnapshot } from "@platform/api-client";
import {
  listSystemServices,
  getSystemService,
  createSystemService,
  updateSystemService,
  deleteSystemService,
  type SystemServiceCatalogItem,
} from "../api/system-catalog";
import { listProducts } from "../api/inventory";
import { ServiceItem, ServiceCategory } from "../types";

function mapSystemServiceToItem(
  s: SystemServiceCatalogItem,
  idx: number,
): ServiceItem {
  return {
    id: s.id,
    code: s.code || undefined,
    name_en: s.nameEn || "",
    name_ar: s.nameAr || s.nameEn || "",
    category: (s.category as ServiceCategory) || "production",
    description_en: s.descriptionEn || undefined,
    description_ar: s.descriptionAr || undefined,
    unit: s.unit || "day",
    default_rate: Number(s.defaultRate ?? 0),
    is_active: s.isActive !== false,
    display_order: Number(s.sortOrder ?? idx),
    created_at: s.createdAt,
    updated_at: s.updatedAt,
  };
}

function mapCmsService(s: any, idx: number): ServiceItem {
  return {
    id: s.id || `svc-${idx + 1}`,
    code: s.code || undefined,
    name_en: s.name_en || s.nameEn || s.title || "",
    name_ar: s.name_ar || s.nameAr || s.name_en || "",
    category: (s.category || "production") as ServiceCategory,
    description_en: s.description_en || s.descriptionEn || "",
    description_ar: s.description_ar || s.descriptionAr || "",
    unit: s.unit || "day",
    default_rate: Number(s.default_rate ?? s.defaultRate ?? 0),
    is_active: s.is_active !== false && s.isActive !== false,
    display_order: Number(s.display_order ?? idx),
  };
}

export async function getAllServices(options?: {
  includeInactive?: boolean;
  isActive?: boolean;
  category?: ServiceCategory;
}): Promise<ServiceItem[]> {
  let mapped: ServiceItem[] = [];
  try {
    const apiServices = await listSystemServices();
    if (Array.isArray(apiServices) && apiServices.length > 0) {
      mapped = apiServices.map(mapSystemServiceToItem);
    }
  } catch (e) {
    console.warn("listSystemServices failed, trying CMS snapshot fallback:", e);
  }

  if (mapped.length === 0) {
    try {
      const snap = await getContentSnapshot("main").catch(() => null);
      const raw: any[] = Array.isArray((snap as any)?.services)
        ? (snap as any).services
        : [];
      mapped = raw.map(mapCmsService);
    } catch {
      mapped = [];
    }
  }

  if (options?.isActive !== undefined) {
    mapped = mapped.filter((s) => s.is_active === options.isActive);
  } else if (options?.includeInactive === false) {
    mapped = mapped.filter((s) => s.is_active);
  }
  if (options?.category) {
    mapped = mapped.filter((s) => s.category === options.category);
  }

  return mapped;
}

export async function getServiceById(id: string): Promise<ServiceItem | null> {
  try {
    const item = await getSystemService(id);
    if (item?.id) return mapSystemServiceToItem(item, 0);
  } catch {
  }
  const all = await getAllServices({ includeInactive: true });
  return all.find((s) => s.id === id) || null;
}

export async function createService(data: {
  code?: string;
  name_en: string;
  name_ar: string;
  category?: ServiceCategory;
  description_en?: string;
  description_ar?: string;
  unit?: string;
  default_rate: number;
  is_active?: boolean;
  display_order?: number;
}): Promise<ServiceItem> {
  const code =
    (data.code || "").trim() ||
    `SRV-${Math.floor(1000 + Math.random() * 9000)}`;
  const created = await createSystemService({
    code,
    nameEn: data.name_en,
    nameAr: data.name_ar || data.name_en,
    category: data.category || "production",
    descriptionEn: data.description_en || "",
    descriptionAr: data.description_ar || "",
    unit: data.unit || "day",
    defaultRate: String(Number(data.default_rate || 0)),
    isActive: data.is_active !== false,
    isPublic: true,
    sortOrder: data.display_order ?? 0,
  });
  return mapSystemServiceToItem(created, 0);
}

export async function updateService(
  id: string,
  data: Partial<{
    code: string;
    name_en: string;
    name_ar: string;
    category: ServiceCategory;
    description_en: string;
    description_ar: string;
    unit: string;
    default_rate: number;
    is_active: boolean;
    display_order: number;
  }>,
): Promise<ServiceItem> {
  const existing = await getServiceById(id);
  if (!existing) {
    throw new Error("Service not found");
  }
  const updated = await updateSystemService(id, {
    code: data.code ?? existing.code ?? id,
    nameEn: data.name_en ?? existing.name_en,
    nameAr: data.name_ar ?? existing.name_ar,
    category: data.category ?? existing.category,
    descriptionEn: data.description_en ?? existing.description_en ?? "",
    descriptionAr: data.description_ar ?? existing.description_ar ?? "",
    unit: data.unit ?? existing.unit ?? "day",
    defaultRate: String(Number(data.default_rate ?? existing.default_rate ?? 0)),
    isActive: data.is_active ?? existing.is_active,
    isPublic: true,
    sortOrder: data.display_order ?? existing.display_order ?? 0,
  });
  return mapSystemServiceToItem(updated, 0);
}

export async function deleteService(id: string): Promise<boolean> {
  await deleteSystemService(id);
  return true;
}

export type CatalogPriceListItem = {
  kind: "service" | "product";
  id: string;
  sku?: string;
  nameEn: string;
  nameAr?: string;
  category?: string;
  unit: string;
  unitPrice: number;
  taxRate: number;
  currency: string;
};

/** Unified active price list combining studio services and inventory products. */
export async function getCatalogPriceListItems(): Promise<CatalogPriceListItem[]> {
  const [services, products] = await Promise.all([
    getAllServices({ isActive: true }).catch(() => []),
    listProducts().catch(() => []),
  ]);

  const serviceItems: CatalogPriceListItem[] = services.map((s) => ({
    kind: "service" as const,
    id: s.id,
    sku: s.code,
    nameEn: s.name_en,
    nameAr: s.name_ar,
    category: s.category,
    unit: s.unit || "day",
    unitPrice: Number(s.default_rate || 0),
    taxRate: 0,
    currency: "BHD",
  }));

  const productItems: CatalogPriceListItem[] = (products || [])
    .filter((p) => p.isActive !== false)
    .map((p) => ({
      kind: "product",
      id: p.id,
      sku: p.sku,
      nameEn: p.nameEn,
      nameAr: p.nameAr,
      unit: "unit",
      unitPrice: Number(p.sellingPrice || 0),
      taxRate: Number(p.taxRate || 0),
      currency: p.currency || "BHD",
    }));

  return [...serviceItems, ...productItems];
}
