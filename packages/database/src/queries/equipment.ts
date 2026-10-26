import { db } from "../db";
import { StudioEquipment } from "../types";

function mapEquipment(i: any): StudioEquipment {
  return {
    id: i.id,
    category: (i.category as any) || "cameras",
    model_name: i.nameEn,
    name_ar: i.nameAr,
    brand: i.brand || undefined,
    specification: i.specification || i.descriptionEn || i.nameAr,
    description_en: i.descriptionEn || undefined,
    description_ar: i.descriptionAr || undefined,
    quantity: i.quantity || 1,
    image_url: i.imageUrl || undefined,
    display_order: i.displayOrder,
    created_at: i.createdAt.toISOString(),
  };
}

export async function getStudioEquipment(): Promise<StudioEquipment[]> {
  try {
    const items = await db.studioEquipment.findMany({
      orderBy: { displayOrder: "asc" },
    });
    return items.map(mapEquipment);
  } catch (e) {
    console.error(
      "Error fetching studio equipment from DB:",
      e instanceof Error ? e.message : e,
    );
    throw e;
  }
}

export async function getAllEquipment(): Promise<StudioEquipment[]> {
  return getStudioEquipment();
}

export async function createEquipment(data: {
  category: StudioEquipment["category"];
  model_name: string;
  name_ar?: string;
  brand?: string;
  specification?: string;
  quantity?: number;
  display_order?: number;
}): Promise<StudioEquipment> {
  const created = await db.studioEquipment.create({
    data: {
      category: data.category,
      nameEn: data.model_name,
      nameAr: data.name_ar || data.model_name,
      brand: data.brand || null,
      specification: data.specification || null,
      descriptionEn: data.specification || null,
      quantity: data.quantity ?? 1,
      displayOrder: data.display_order ?? 0,
    },
  });
  return mapEquipment(created);
}

export async function updateEquipment(
  id: string,
  data: Partial<StudioEquipment>,
): Promise<StudioEquipment | null> {
  try {
    const updateData: any = {};
    if (data.category !== undefined) updateData.category = data.category;
    if (data.model_name !== undefined) updateData.nameEn = data.model_name;
    if (data.name_ar !== undefined) updateData.nameAr = data.name_ar;
    if (data.brand !== undefined) updateData.brand = data.brand;
    if (data.specification !== undefined) {
      updateData.specification = data.specification;
      updateData.descriptionEn = data.specification;
    }
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.display_order !== undefined)
      updateData.displayOrder = data.display_order;

    const updated = await db.studioEquipment.update({
      where: { id },
      data: updateData,
    });
    return mapEquipment(updated);
  } catch (e) {
    console.error(`Error updating equipment ${id}:`, e);
    throw e;
  }
}

export async function deleteEquipment(id: string): Promise<boolean> {
  try {
    await db.studioEquipment.delete({ where: { id } });
    return true;
  } catch (e) {
    console.error(`Error deleting equipment ${id}:`, e);
    throw e;
  }
}
