import { randomUUID } from "node:crypto";
import {
  getContentSnapshot,
  listCategories,
  listProducts,
  saveContentDraft,
} from "@platform/api-client";
import { StudioEquipment } from "../types";

function mapSnapshotEquipment(raw: any): StudioEquipment {
  return {
    id: String(raw?.id ?? ""),
    category: String(raw?.category ?? "equipment"),
    model_name: raw?.model_name ?? raw?.modelName ?? "",
    name_ar: (raw?.name_ar ?? raw?.nameAr) || undefined,
    brand: raw?.brand || undefined,
    specification: raw?.specification ?? "",
    description_en: (raw?.description_en ?? raw?.descriptionEn) || undefined,
    description_ar: (raw?.description_ar ?? raw?.descriptionAr) || undefined,
    image_url: (raw?.image_url ?? raw?.imageUrl) || undefined,
    quantity: Number(raw?.quantity ?? 1),
    display_order: Number(raw?.display_order ?? raw?.displayOrder ?? 0),
    created_at:
      typeof raw?.created_at === "string"
        ? raw.created_at
        : new Date().toISOString(),
  };
}

export async function getStudioEquipment(): Promise<StudioEquipment[]> {
  try {
    const [snap, products, categories] = await Promise.all([
      getContentSnapshot("main").catch(() => null),
      listProducts().catch(() => []),
      listCategories().catch(() => []),
    ]);

    const snapshotItems = Array.isArray(snap?.draft?.equipment)
      ? snap.draft.equipment.map(mapSnapshotEquipment)
      : [];
    if (snapshotItems.length > 0) {
      return snapshotItems.sort(
        (a: StudioEquipment, b: StudioEquipment) =>
          a.display_order - b.display_order ||
          a.model_name.localeCompare(b.model_name),
      );
    }

    const catById = new Map<string, string>(
      categories.map((c: any): [string, string] => [
        String(c.id),
        String(c.nameEn ?? ""),
      ]),
    );
    return products
      .filter((p) => p.isActive)
      .map((p, idx) => ({
        id: p.id,
        category: catById.get(p.categoryId || "") || "equipment",
        model_name: p.nameEn,
        name_ar: p.nameAr || undefined,
        brand: undefined,
        specification: p.descriptionEn || p.sku,
        quantity: 1,
        display_order: idx,
        created_at: p.createdAt,
      }));
  } catch (e) {
    console.error("Failed to fetch studio equipment:", e);
    return [];
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
  const snap = await getContentSnapshot("main").catch(() => null);
  const currentDraft = (snap?.draft as Record<string, any>) ?? {};
  const list = Array.isArray(currentDraft.equipment)
    ? [...currentDraft.equipment].map(mapSnapshotEquipment)
    : [];

  const created = mapSnapshotEquipment({
    id: randomUUID(),
    category: data.category,
    model_name: data.model_name,
    name_ar: data.name_ar || undefined,
    brand: data.brand || undefined,
    specification: data.specification || "",
    quantity: data.quantity ?? 1,
    display_order: data.display_order ?? list.length,
    created_at: new Date().toISOString(),
  });

  await saveContentDraft("", "main", {
    ...currentDraft,
    equipment: [...list, created],
  });
  return created;
}

export async function updateEquipment(
  id: string,
  data: Partial<Omit<StudioEquipment, "id" | "created_at">>,
): Promise<StudioEquipment | null> {
  const snap = await getContentSnapshot("main").catch(() => null);
  const currentDraft = (snap?.draft as Record<string, any>) ?? {};
  let list = Array.isArray(currentDraft.equipment)
    ? [...currentDraft.equipment].map(mapSnapshotEquipment)
    : [];
  if (list.length === 0) {
    list = await getStudioEquipment();
  }

  const idx = list.findIndex((item) => item.id === id);
  if (idx === -1) return null;

  const updated = mapSnapshotEquipment({
    ...list[idx],
    ...data,
  });
  list[idx] = updated;

  await saveContentDraft("", "main", {
    ...currentDraft,
    equipment: list,
  });
  return updated;
}

export async function deleteEquipment(id: string): Promise<boolean> {
  const snap = await getContentSnapshot("main").catch(() => null);
  const currentDraft = (snap?.draft as Record<string, any>) ?? {};
  const list = Array.isArray(currentDraft.equipment)
    ? [...currentDraft.equipment].map(mapSnapshotEquipment)
    : [];

  const next = list.filter((item) => item.id !== id);
  if (next.length === list.length) return false;

  await saveContentDraft("", "main", {
    ...currentDraft,
    equipment: next,
  });
  return true;
}
