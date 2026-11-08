import { randomUUID } from "node:crypto";
import { getContentSnapshot, saveContentDraft } from "@platform/api-client";
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

export async function getPortfolioCategories(): Promise<PortfolioCategory[]> {
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
  const { draft } = await getDraftSnapshot();
  const categories: PortfolioCategory[] = Array.isArray(draft.categories)
    ? [...draft.categories]
    : [];
  const created: PortfolioCategory = {
    id: randomUUID(),
    slug: data.slug,
    name_en: data.name_en,
    name_ar: data.name_ar,
    display_order: data.display_order ?? categories.length,
  };
  categories.push(created);
  draft.categories = categories;
  await saveContentDraft("", "main", draft);
  return created;
}

export async function updatePortfolioCategory(
  id: string,
  data: Partial<PortfolioCategory>,
): Promise<PortfolioCategory | null> {
  const { draft } = await getDraftSnapshot();
  const categories: PortfolioCategory[] = Array.isArray(draft.categories)
    ? [...draft.categories]
    : [];
  const index = categories.findIndex((c) => c.id === id);
  if (index === -1) return null;
  const updated = { ...categories[index], ...data };
  categories[index] = updated;
  draft.categories = categories;
  await saveContentDraft("", "main", draft);
  return updated;
}

export async function deletePortfolioCategory(id: string): Promise<boolean> {
  const { draft } = await getDraftSnapshot();
  const categories: PortfolioCategory[] = Array.isArray(draft.categories)
    ? [...draft.categories]
    : [];
  const filtered = categories.filter((c) => c.id !== id);
  if (filtered.length === categories.length) return false;
  draft.categories = filtered;
  await saveContentDraft("", "main", draft);
  return true;
}

export async function getPortfolioItems(
  categorySlug?: string,
): Promise<PortfolioItem[]> {
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
  const { draft } = await getDraftSnapshot();
  const portfolio: PortfolioItem[] = Array.isArray(draft.portfolio)
    ? [...draft.portfolio]
    : [];
  const created: PortfolioItem = {
    id: randomUUID(),
    category_id: data.category_id || "",
    slug: data.slug,
    title_en: data.title_en,
    title_ar: data.title_ar,
    client_name: data.client_name ?? "",
    year: data.year,
    subtitle_en: data.subtitle_en,
    subtitle_ar: data.subtitle_ar,
    price: data.price,
    price_note_en: data.price_note_en,
    price_note_ar: data.price_note_ar,
    location: data.location,
    external_url: data.external_url,
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
    display_order: data.display_order ?? portfolio.length,
    created_at: new Date().toISOString(),
  };
  portfolio.push(created);
  draft.portfolio = portfolio;
  await saveContentDraft("", "main", draft);
  return created;
}

export async function updatePortfolioItem(
  id: string,
  data: Partial<PortfolioItem>,
): Promise<PortfolioItem | null> {
  const { draft } = await getDraftSnapshot();
  const portfolio: PortfolioItem[] = Array.isArray(draft.portfolio)
    ? [...draft.portfolio]
    : [];
  const index = portfolio.findIndex((it) => it.id === id);
  if (index === -1) return null;
  const updated = { ...portfolio[index], ...data };
  portfolio[index] = updated;
  draft.portfolio = portfolio;
  await saveContentDraft("", "main", draft);
  return updated;
}

export async function deletePortfolioItem(id: string): Promise<boolean> {
  const { draft } = await getDraftSnapshot();
  const portfolio: PortfolioItem[] = Array.isArray(draft.portfolio)
    ? [...draft.portfolio]
    : [];
  const filtered = portfolio.filter((it) => it.id !== id);
  if (filtered.length === portfolio.length) return false;
  draft.portfolio = filtered;
  await saveContentDraft("", "main", draft);
  return true;
}
