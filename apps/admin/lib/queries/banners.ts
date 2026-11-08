import { randomUUID } from "node:crypto";
import { getContentSnapshot, saveContentDraft } from "@platform/api-client";
import { HeroBanner } from "../types";

async function getDraftSnapshot(): Promise<{ draft: any; revision: number }> {
  try {
    const snap = await getContentSnapshot("main");
    const draft = snap?.draft && typeof snap.draft === "object" ? snap.draft : {};
    return { draft, revision: snap?.revision ?? 1 };
  } catch (e) {
    console.error("Error fetching content snapshot for banners:", e);
    return { draft: {}, revision: 1 };
  }
}

export async function getActiveBanners(): Promise<HeroBanner[]> {
  const { draft } = await getDraftSnapshot();
  const list: HeroBanner[] = Array.isArray(draft.banners) ? draft.banners : [];
  return list.filter((b) => b.is_active).sort((a, b) => a.display_order - b.display_order);
}

export async function getAllBanners(): Promise<HeroBanner[]> {
  const { draft } = await getDraftSnapshot();
  const list: HeroBanner[] = Array.isArray(draft.banners) ? draft.banners : [];
  return [...list].sort((a, b) => a.display_order - b.display_order);
}

export async function createBanner(
  data: Omit<HeroBanner, "id" | "created_at">,
): Promise<HeroBanner> {
  const { draft } = await getDraftSnapshot();
  const banners: HeroBanner[] = Array.isArray(draft.banners) ? [...draft.banners] : [];
  const created: HeroBanner = {
    id: randomUUID(),
    title_en: data.title_en,
    title_ar: data.title_ar,
    subtitle_en: data.subtitle_en,
    subtitle_ar: data.subtitle_ar,
    media_type: data.media_type,
    media_url: data.media_url,
    poster_url: data.poster_url,
    display_order: data.display_order ?? banners.length,
    is_active: data.is_active ?? true,
    cta_label_en: data.cta_label_en,
    cta_label_ar: data.cta_label_ar,
    cta_link: data.cta_link,
    created_at: new Date().toISOString(),
  };
  banners.push(created);
  draft.banners = banners;
  await saveContentDraft("", "main", draft);
  return created;
}

export async function updateBanner(
  id: string,
  data: Partial<HeroBanner>,
): Promise<HeroBanner | null> {
  const { draft } = await getDraftSnapshot();
  const banners: HeroBanner[] = Array.isArray(draft.banners) ? [...draft.banners] : [];
  const index = banners.findIndex((b) => b.id === id);
  if (index === -1) return null;
  const updated = { ...banners[index], ...data };
  banners[index] = updated;
  draft.banners = banners;
  await saveContentDraft("", "main", draft);
  return updated;
}

export async function deleteBanner(id: string): Promise<boolean> {
  const { draft } = await getDraftSnapshot();
  const banners: HeroBanner[] = Array.isArray(draft.banners) ? [...draft.banners] : [];
  const filtered = banners.filter((b) => b.id !== id);
  if (filtered.length === banners.length) return false;
  draft.banners = filtered;
  await saveContentDraft("", "main", draft);
  return true;
}
