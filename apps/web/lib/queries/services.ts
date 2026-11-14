import { randomUUID } from "node:crypto";
import { getContentSnapshot, saveContentDraft } from "@platform/api-client";
import { ServiceCategory, ServiceItem } from "../types";

export interface StoredServiceRecord extends ServiceItem {
  is_public?: boolean;
  image_url?: string | null;
}

function mapService(raw: any): StoredServiceRecord {
  const now = new Date().toISOString();
  return {
    id: String(raw?.id ?? ""),
    code: raw?.code || undefined,
    name_en: raw?.name_en ?? raw?.nameEn ?? "",
    name_ar: raw?.name_ar ?? raw?.nameAr ?? "",
    category: (raw?.category as ServiceCategory) || "production",
    description_en: (raw?.description_en ?? raw?.descriptionEn) || undefined,
    description_ar: (raw?.description_ar ?? raw?.descriptionAr) || undefined,
    unit: raw?.unit ?? "project",
    default_rate: Number(raw?.default_rate ?? raw?.defaultRate ?? 0),
    is_active: raw?.is_active ?? raw?.isActive ?? true,
    is_public: raw?.is_public ?? raw?.isPublic ?? true,
    image_url: (raw?.image_url ?? raw?.imageUrl) || null,
    display_order: Number(raw?.display_order ?? raw?.displayOrder ?? 0),
    created_at:
      typeof raw?.created_at === "string"
        ? raw.created_at
        : typeof raw?.createdAt === "string"
          ? raw.createdAt
          : now,
    updated_at:
      typeof raw?.updated_at === "string"
        ? raw.updated_at
        : typeof raw?.updatedAt === "string"
          ? raw.updatedAt
          : now,
  };
}

function serializeService(s: StoredServiceRecord) {
  return {
    id: s.id,
    code: s.code,
    name_en: s.name_en,
    name_ar: s.name_ar,
    nameEn: s.name_en,
    nameAr: s.name_ar,
    category: s.category,
    description_en: s.description_en,
    description_ar: s.description_ar,
    descriptionEn: s.description_en ?? null,
    descriptionAr: s.description_ar ?? null,
    image_url: s.image_url ?? null,
    imageUrl: s.image_url ?? null,
    unit: s.unit,
    default_rate: s.default_rate,
    is_active: s.is_active,
    is_public: s.is_public ?? true,
    display_order: s.display_order,
    created_at: s.created_at,
    updated_at: s.updated_at,
  };
}

async function readSnapshotServices(includeInactive = true): Promise<StoredServiceRecord[]> {
  try {
    const snap = await getContentSnapshot("main");
    const draftList = Array.isArray(snap?.draft?.services)
      ? snap.draft.services
      : [];
    const pubList = Array.isArray(snap?.published?.services)
      ? snap.published.services
      : [];
    const raw = draftList.length > 0 ? draftList : pubList;
    const mapped = raw.map(mapService);
    const filtered = includeInactive ? mapped : mapped.filter((s) => s.is_active);
    return filtered.sort(
      (a, b) =>
        a.display_order - b.display_order || a.name_en.localeCompare(b.name_en),
    );
  } catch (e) {
    console.error("Failed to fetch services from CMS snapshot:", e);
    return [];
  }
}

export async function getAllServices(options?: {
  includeInactive?: boolean;
  isActive?: boolean;
  category?: string;
  search?: string;
}): Promise<ServiceItem[]> {
  const includeInactive =
    options?.isActive !== undefined
      ? !options.isActive
      : (options?.includeInactive ?? true);
  let items = await readSnapshotServices(includeInactive);
  if (options?.isActive !== undefined) {
    items = items.filter((s) => s.is_active === options.isActive);
  }
  if (options?.category && options.category !== "all") {
    items = items.filter((s) => s.category === options.category);
  }
  if (options?.search?.trim()) {
    const q = options.search.trim().toLowerCase();
    items = items.filter(
      (s) =>
        s.name_en.toLowerCase().includes(q) ||
        s.name_ar.toLowerCase().includes(q) ||
        (s.code ?? "").toLowerCase().includes(q) ||
        (s.description_en ?? "").toLowerCase().includes(q),
    );
  }
  return items;
}

export async function getServiceById(id: string): Promise<ServiceItem | null> {
  const list = await readSnapshotServices(true);
  return list.find((s) => s.id === id) ?? null;
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
  is_public?: boolean;
  image_url?: string | null;
  display_order?: number;
}): Promise<ServiceItem> {
  const snap = await getContentSnapshot("main").catch(() => null);
  const currentDraft = (snap?.draft as Record<string, any>) ?? {};
  const list = Array.isArray(currentDraft.services)
    ? [...currentDraft.services].map(mapService)
    : [];

  const now = new Date().toISOString();
  const created = mapService({
    id: randomUUID(),
    code: data.code?.trim() || undefined,
    name_en: data.name_en,
    name_ar: data.name_ar,
    category: data.category || "production",
    description_en: data.description_en || undefined,
    description_ar: data.description_ar || undefined,
    unit: data.unit || "project",
    default_rate: data.default_rate,
    is_active: data.is_active ?? true,
    is_public: data.is_public ?? true,
    image_url: data.image_url ?? null,
    display_order: data.display_order ?? list.length,
    created_at: now,
    updated_at: now,
  });

  await saveContentDraft("", "main", {
    ...currentDraft,
    services: [...list, created].map(serializeService),
  });
  return created;
}

export async function updateService(
  id: string,
  data: Partial<
    Omit<StoredServiceRecord, "id" | "created_at" | "updated_at">
  >,
): Promise<ServiceItem> {
  const snap = await getContentSnapshot("main").catch(() => null);
  const currentDraft = (snap?.draft as Record<string, any>) ?? {};
  const list = Array.isArray(currentDraft.services)
    ? [...currentDraft.services].map(mapService)
    : [];

  const idx = list.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error("Service not found");

  const updated = mapService({
    ...list[idx],
    ...data,
    updated_at: new Date().toISOString(),
  });
  list[idx] = updated;

  await saveContentDraft("", "main", {
    ...currentDraft,
    services: list.map(serializeService),
  });
  return updated;
}

export async function deleteService(id: string): Promise<boolean> {
  const snap = await getContentSnapshot("main").catch(() => null);
  const currentDraft = (snap?.draft as Record<string, any>) ?? {};
  const list = Array.isArray(currentDraft.services)
    ? [...currentDraft.services].map(mapService)
    : [];

  const next = list.filter((s) => s.id !== id);
  if (next.length === list.length) return false;

  await saveContentDraft("", "main", {
    ...currentDraft,
    services: next.map(serializeService),
  });
  return true;
}
