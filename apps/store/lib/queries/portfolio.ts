import { randomUUID } from "node:crypto";
import {
  listPortfolioCategories,
  createPortfolioCategory as apiCreatePortfolioCategory,
  updatePortfolioCategory as apiUpdatePortfolioCategory,
  deletePortfolioCategory as apiDeletePortfolioCategory,
  listPortfolioItems,
  createPortfolioItem as apiCreatePortfolioItem,
  updatePortfolioItem as apiUpdatePortfolioItem,
  deletePortfolioItem as apiDeletePortfolioItem,
  getContentSnapshot,
  saveContentDraft,
  type CMSPortfolioCategory,
  type CMSPortfolioItem,
} from "@platform/api-client";
import { PortfolioCategory, PortfolioItem } from "../types";

async function getDraftSnapshot(): Promise<{ draft: any; revision: number }> {
  try {
    const snap = await getContentSnapshot("main");
    const draft = snap?.draft && typeof snap.draft === "object" ? snap.draft : {};
    return { draft, revision: snap?.revision ?? 1 };
  } catch (e) {
    console.error("Error fetching content snapshot for portfolio:", e);
    return { draft: {}, revision: 1 };
  }
}

function mapCategory(c: CMSPortfolioCategory, idx = 0): PortfolioCategory {
  return {
    id: c.id,
    slug: c.slug ?? c.id,
    name_en: c.nameEn ?? c.slug ?? "",
    name_ar: c.nameAr ?? c.nameEn ?? c.slug ?? "",
    display_order: c.displayOrder ?? idx,
  };
}

function mapItem(
  it: CMSPortfolioItem,
  categoryMap: Map<string, PortfolioCategory>,
  metaMap: Record<string, Partial<PortfolioItem>>,
  idx = 0,
): PortfolioItem {
  const meta = metaMap[it.id] ?? {};
  return {
    id: it.id,
    category_id: it.categoryId ?? undefined,
    category: it.categoryId ? categoryMap.get(it.categoryId) : undefined,
    slug: it.slug ?? it.id,
    title_en: it.titleEn ?? "",
    title_ar: it.titleAr ?? it.titleEn ?? "",
    client_name: it.clientName ?? "",
    year: it.year ?? undefined,
    subtitle_en: it.subtitleEn ?? undefined,
    subtitle_ar: it.subtitleAr ?? undefined,
    price: it.price ?? undefined,
    price_note_en: it.priceNoteEn ?? undefined,
    price_note_ar: it.priceNoteAr ?? undefined,
    location: it.location ?? undefined,
    external_url: it.externalUrl ?? undefined,
    attributes: Array.isArray(meta.attributes) ? meta.attributes : [],
    aspect_ratio: meta.aspect_ratio ?? "16:9",
    thumbnail_url: meta.thumbnail_url ?? "",
    preview_video_url: meta.preview_video_url,
    full_video_url: meta.full_video_url,
    gallery_urls: Array.isArray(meta.gallery_urls) ? meta.gallery_urls : [],
    description_en: meta.description_en,
    description_ar: meta.description_ar,
    credits: meta.credits ?? {},
    is_featured: meta.is_featured ?? false,
    display_order: meta.display_order ?? idx,
    created_at: meta.created_at ?? "",
  };
}

export async function getPortfolioCategories(): Promise<PortfolioCategory[]> {
  try {
    const remote = await listPortfolioCategories();
    if (Array.isArray(remote) && remote.length > 0) {
      return remote
        .map((c, idx) => mapCategory(c, idx))
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    }
  } catch (e) {
    if (!(e instanceof Error && /404|not_found/i.test(e.message))) {
      console.error("Error fetching portfolio categories:", e);
    }
  }
  const { draft } = await getDraftSnapshot();
  const list: PortfolioCategory[] = Array.isArray(draft.categories)
    ? draft.categories
    : [];
  return [...list].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
}

export async function createPortfolioCategory(data: {
  slug: string;
  name_en: string;
  name_ar: string;
  display_order?: number;
}): Promise<PortfolioCategory> {
  const created = await apiCreatePortfolioCategory("", {
    id: randomUUID(),
    slug: data.slug,
    nameEn: data.name_en,
    nameAr: data.name_ar,
    displayOrder: data.display_order ?? 0,
  });
  return mapCategory(created);
}

export async function updatePortfolioCategory(
  id: string,
  data: Partial<PortfolioCategory>,
): Promise<PortfolioCategory | null> {
  try {
    const updated = await apiUpdatePortfolioCategory("", id, {
      slug: data.slug,
      nameEn: data.name_en,
      nameAr: data.name_ar,
      displayOrder: data.display_order,
    });
    return mapCategory(updated);
  } catch {
    return null;
  }
}

export async function deletePortfolioCategory(id: string): Promise<boolean> {
  try {
    await apiDeletePortfolioCategory("", id);
    return true;
  } catch {
    return false;
  }
}

export async function getPortfolioItems(
  categorySlug?: string,
): Promise<PortfolioItem[]> {
  try {
    const [remoteItems, categories, { draft }] = await Promise.all([
      listPortfolioItems(categorySlug),
      getPortfolioCategories(),
      getDraftSnapshot(),
    ]);
    if (Array.isArray(remoteItems) && remoteItems.length > 0) {
      const categoryMap = new Map(categories.map((c) => [c.id, c]));
      const metaMap =
        draft.portfolioMeta && typeof draft.portfolioMeta === "object"
          ? (draft.portfolioMeta as Record<string, Partial<PortfolioItem>>)
          : {};
      return remoteItems
        .map((it, idx) => mapItem(it, categoryMap, metaMap, idx))
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    }
  } catch (e) {
    if (!(e instanceof Error && /404|not_found/i.test(e.message))) {
      console.error("Error fetching portfolio items:", e);
    }
  }

  const { draft } = await getDraftSnapshot();
  const items: PortfolioItem[] = Array.isArray(draft.portfolio)
    ? draft.portfolio
    : [];
  const categories: PortfolioCategory[] = Array.isArray(draft.categories)
    ? draft.categories
    : [];
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const enriched = items.map((it) => ({
    ...it,
    category: it.category_id ? categoryMap.get(it.category_id) : undefined,
  }));

  if (categorySlug && categorySlug !== "all") {
    const targetCat = categories.find((c) => c.slug === categorySlug);
    if (targetCat) {
      return enriched
        .filter((it) => it.category_id === targetCat.id)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    }
    return [];
  }

  return enriched.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
}

export async function getPortfolioItemBySlug(
  slug: string,
): Promise<PortfolioItem | null> {
  const items = await getPortfolioItems();
  return items.find((it) => it.slug === slug) ?? null;
}

export async function createPortfolioItem(data: {
  category_id?: string;
  slug: string;
  title_en: string;
  title_ar: string;
  client_name?: string;
  year?: number;
  subtitle_en?: string;
  subtitle_ar?: string;
  price?: number;
  price_note_en?: string;
  price_note_ar?: string;
  location?: string;
  external_url?: string;
  attributes?: PortfolioItem["attributes"];
  aspect_ratio?: string;
  thumbnail_url: string;
  preview_video_url?: string;
  full_video_url?: string;
  gallery_urls?: string[];
  description_en?: string;
  description_ar?: string;
  credits?: any;
  is_featured?: boolean;
  display_order?: number;
}): Promise<PortfolioItem> {
  const id = randomUUID();
  const created = await apiCreatePortfolioItem("", {
    id,
    categoryId: data.category_id || undefined,
    slug: data.slug,
    titleEn: data.title_en,
    titleAr: data.title_ar,
    clientName: data.client_name ?? "",
    year: data.year,
    subtitleEn: data.subtitle_en,
    subtitleAr: data.subtitle_ar,
    price: data.price,
    priceNoteEn: data.price_note_en,
    priceNoteAr: data.price_note_ar,
    location: data.location,
    externalUrl: data.external_url,
  });

  const { draft } = await getDraftSnapshot();
  const metaMap =
    draft.portfolioMeta && typeof draft.portfolioMeta === "object"
      ? { ...draft.portfolioMeta }
      : {};
  const meta: Partial<PortfolioItem> = {
    attributes: data.attributes || [],
    aspect_ratio: (data.aspect_ratio as any) || "16:9",
    thumbnail_url: data.thumbnail_url,
    preview_video_url: data.preview_video_url,
    full_video_url: data.full_video_url,
    gallery_urls: data.gallery_urls || [],
    description_en: data.description_en,
    description_ar: data.description_ar,
    credits: data.credits || {},
    is_featured: data.is_featured ?? false,
    display_order: data.display_order ?? 0,
    created_at: new Date().toISOString(),
  };
  metaMap[created.id] = meta;
  draft.portfolioMeta = metaMap;
  await saveContentDraft("", "main", draft).catch(() => null);

  return mapItem(created, new Map(), metaMap);
}

export async function updatePortfolioItem(
  id: string,
  data: Partial<PortfolioItem>,
): Promise<PortfolioItem | null> {
  try {
    const updated = await apiUpdatePortfolioItem("", id, {
      categoryId: data.category_id,
      slug: data.slug,
      titleEn: data.title_en,
      titleAr: data.title_ar,
      clientName: data.client_name,
      year: data.year,
      subtitleEn: data.subtitle_en,
      subtitleAr: data.subtitle_ar,
      price: data.price,
      priceNoteEn: data.price_note_en,
      priceNoteAr: data.price_note_ar,
      location: data.location,
      externalUrl: data.external_url,
    });
    const { draft } = await getDraftSnapshot();
    const metaMap =
      draft.portfolioMeta && typeof draft.portfolioMeta === "object"
        ? { ...draft.portfolioMeta }
        : {};
    metaMap[id] = {
      ...(metaMap[id] ?? {}),
      ...(data.attributes !== undefined ? { attributes: data.attributes } : {}),
      ...(data.aspect_ratio !== undefined ? { aspect_ratio: data.aspect_ratio } : {}),
      ...(data.thumbnail_url !== undefined ? { thumbnail_url: data.thumbnail_url } : {}),
      ...(data.preview_video_url !== undefined ? { preview_video_url: data.preview_video_url } : {}),
      ...(data.full_video_url !== undefined ? { full_video_url: data.full_video_url } : {}),
      ...(data.gallery_urls !== undefined ? { gallery_urls: data.gallery_urls } : {}),
      ...(data.description_en !== undefined ? { description_en: data.description_en } : {}),
      ...(data.description_ar !== undefined ? { description_ar: data.description_ar } : {}),
      ...(data.credits !== undefined ? { credits: data.credits } : {}),
      ...(data.is_featured !== undefined ? { is_featured: data.is_featured } : {}),
      ...(data.display_order !== undefined ? { display_order: data.display_order } : {}),
    };
    draft.portfolioMeta = metaMap;
    await saveContentDraft("", "main", draft).catch(() => null);
    return mapItem(updated, new Map(), metaMap);
  } catch {
    return null;
  }
}

export async function deletePortfolioItem(id: string): Promise<boolean> {
  try {
    await apiDeletePortfolioItem("", id);
    return true;
  } catch {
    return false;
  }
}
