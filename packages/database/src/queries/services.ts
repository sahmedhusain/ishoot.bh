import { db } from "../db";
import { ServiceItem, ServiceCategory } from "../types";

function mapService(s: any): ServiceItem {
  return {
    id: s.id,
    code: s.code || undefined,
    name_en: s.nameEn,
    name_ar: s.nameAr,
    category: s.category as ServiceCategory,
    description_en: s.descriptionEn || undefined,
    description_ar: s.descriptionAr || undefined,
    unit: s.unit as any,
    default_rate: Number(s.defaultRate),
    is_active: s.isActive,
    display_order: s.displayOrder,
    created_at: s.createdAt?.toISOString(),
    updated_at: s.updatedAt?.toISOString(),
  };
}

export async function getAllServices(options?: {
  category?: string;
  isActive?: boolean;
  search?: string;
}): Promise<ServiceItem[]> {
  try {
    const where: any = {};
    if (options?.category && options.category !== "all") {
      where.category = options.category;
    }
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }
    if (options?.search) {
      where.OR = [
        { nameEn: { contains: options.search, mode: "insensitive" } },
        { nameAr: { contains: options.search, mode: "insensitive" } },
        { code: { contains: options.search, mode: "insensitive" } },
        { descriptionEn: { contains: options.search, mode: "insensitive" } },
      ];
    }

    const items = await db.service.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { nameEn: "asc" }],
    });
    return items.map(mapService);
  } catch (e) {
    console.error("Error fetching services:", e);
    throw e;
  }
}

export async function getServiceById(id: string): Promise<ServiceItem | null> {
  try {
    const s = await db.service.findUnique({
      where: { id },
    });
    return s ? mapService(s) : null;
  } catch (e) {
    console.error("Error fetching service by ID:", e);
    throw e;
  }
}

export async function createService(data: {
  code?: string;
  name_en: string;
  name_ar: string;
  category?: ServiceCategory;
  description_en?: string;
  description_ar?: string;
  unit?: "hour" | "day" | "project" | "unit" | "minute";
  default_rate: number;
  is_active?: boolean;
  display_order?: number;
}): Promise<ServiceItem> {
  const created = await db.service.create({
    data: {
      code: data.code || null,
      nameEn: data.name_en,
      nameAr: data.name_ar,
      category: data.category || "production",
      descriptionEn: data.description_en || null,
      descriptionAr: data.description_ar || null,
      unit: data.unit || "day",
      defaultRate: data.default_rate,
      isActive: data.is_active !== undefined ? data.is_active : true,
      displayOrder: data.display_order ?? 0,
    },
  });
  return mapService(created);
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
    unit: "hour" | "day" | "project" | "unit" | "minute";
    default_rate: number;
    is_active: boolean;
    display_order: number;
  }>,
): Promise<ServiceItem> {
  const updateData: any = {};
  if (data.code !== undefined) updateData.code = data.code || null;
  if (data.name_en !== undefined) updateData.nameEn = data.name_en;
  if (data.name_ar !== undefined) updateData.nameAr = data.name_ar;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.description_en !== undefined)
    updateData.descriptionEn = data.description_en || null;
  if (data.description_ar !== undefined)
    updateData.descriptionAr = data.description_ar || null;
  if (data.unit !== undefined) updateData.unit = data.unit;
  if (data.default_rate !== undefined)
    updateData.defaultRate = data.default_rate;
  if (data.is_active !== undefined) updateData.isActive = data.is_active;
  if (data.display_order !== undefined)
    updateData.displayOrder = data.display_order;

  const updated = await db.service.update({
    where: { id },
    data: updateData,
  });
  return mapService(updated);
}

export async function deleteService(id: string): Promise<boolean> {
  try {
    await db.service.delete({
      where: { id },
    });
    return true;
  } catch (e) {
    console.error("Error deleting service:", e);
    throw e;
  }
}
