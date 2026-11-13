import { db } from "../atomic";
import { StudioEquipment } from "../types";

function mapEquipment(i: any): StudioEquipment {
  return {
    id: i.id,
    category: i.category || "",
    model_name: i.nameEn,
    name_ar: i.nameAr,
    brand: i.brand || undefined,
    specification: i.specification || i.descriptionEn || i.nameAr,
    description_en: i.descriptionEn || undefined,
    description_ar: i.descriptionAr || undefined,
    quantity: i.quantity ?? 1,
    image_url: i.imageUrl || undefined,
    display_order: i.displayOrder,
    created_at: i.createdAt.toISOString(),
  };
}

export async function getStudioEquipment(): Promise<StudioEquipment[]> {
  try {
    const items =
      (await db.studioEquipment.findMany({
        orderBy: { displayOrder: "asc" },
      })) || [];
    return items.map(mapEquipment);
  } catch (e) {
    console.error(
      "Error fetching studio equipment from DB:",
      e instanceof Error ? e.message : e,
    );
    return [];
  }
}

export async function getAllEquipment(): Promise<StudioEquipment[]> {
  return getStudioEquipment();
}
