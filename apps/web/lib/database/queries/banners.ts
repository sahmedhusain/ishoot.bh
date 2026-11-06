import { db } from "../db";
import { HeroBanner } from "../types";

function mapBanner(b: any): HeroBanner {
  return {
    id: b.id,
    title_en: b.titleEn,
    title_ar: b.titleAr,
    subtitle_en: b.subtitleEn || undefined,
    subtitle_ar: b.subtitleAr || undefined,
    media_type: b.mediaType as "video" | "image",
    media_url: b.mediaUrl,
    poster_url: b.posterUrl || undefined,
    display_order: b.displayOrder,
    is_active: b.isActive,
    cta_label_en: b.ctaLabelEn || undefined,
    cta_label_ar: b.ctaLabelAr || undefined,
    cta_link: b.ctaLink || undefined,
    created_at: b.createdAt.toISOString(),
  };
}

export async function getActiveBanners(): Promise<HeroBanner[]> {
  try {
    const banners =
      (await db.heroBanner.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
      })) || [];
    return banners.map(mapBanner);
  } catch (e) {
    console.error(
      "Error fetching active banners from DB:",
      e instanceof Error ? e.message : e,
    );
    return [];
  }
}

export async function getAllBanners(): Promise<HeroBanner[]> {
  try {
    const banners =
      (await db.heroBanner.findMany({
        orderBy: { displayOrder: "asc" },
      })) || [];
    return banners.map(mapBanner);
  } catch (e) {
    console.error(
      "Error fetching all banners from DB:",
      e instanceof Error ? e.message : e,
    );
    return [];
  }
}

export async function createBanner(
  data: Omit<HeroBanner, "id" | "created_at">,
): Promise<HeroBanner> {
  const created = await db.heroBanner.create({
    data: {
      titleEn: data.title_en,
      titleAr: data.title_ar,
      subtitleEn: data.subtitle_en || null,
      subtitleAr: data.subtitle_ar || null,
      mediaType: data.media_type,
      mediaUrl: data.media_url,
      posterUrl: data.poster_url || null,
      displayOrder: data.display_order ?? 0,
      isActive: data.is_active ?? true,
      ctaLabelEn: data.cta_label_en || null,
      ctaLabelAr: data.cta_label_ar || null,
      ctaLink: data.cta_link || null,
    },
  });
  return mapBanner(created);
}

export async function updateBanner(
  id: string,
  data: Partial<HeroBanner>,
): Promise<HeroBanner | null> {
  try {
    const updateData: any = {};
    if (data.title_en !== undefined) updateData.titleEn = data.title_en;
    if (data.title_ar !== undefined) updateData.titleAr = data.title_ar;
    if (data.subtitle_en !== undefined)
      updateData.subtitleEn = data.subtitle_en;
    if (data.subtitle_ar !== undefined)
      updateData.subtitleAr = data.subtitle_ar;
    if (data.media_type !== undefined) updateData.mediaType = data.media_type;
    if (data.media_url !== undefined) updateData.mediaUrl = data.media_url;
    if (data.poster_url !== undefined) updateData.posterUrl = data.poster_url;
    if (data.display_order !== undefined)
      updateData.displayOrder = data.display_order;
    if (data.is_active !== undefined) updateData.isActive = data.is_active;
    if (data.cta_label_en !== undefined)
      updateData.ctaLabelEn = data.cta_label_en;
    if (data.cta_label_ar !== undefined)
      updateData.ctaLabelAr = data.cta_label_ar;
    if (data.cta_link !== undefined) updateData.ctaLink = data.cta_link;

    const updated = await db.heroBanner.update({
      where: { id },
      data: updateData,
    });
    return mapBanner(updated);
  } catch (e) {
    console.error(
      `Error updating banner ${id}:`,
      e instanceof Error ? e.message : e,
    );
    throw e;
  }
}

export async function deleteBanner(id: string): Promise<boolean> {
  try {
    await db.heroBanner.delete({ where: { id } });
    return true;
  } catch (e) {
    console.error(
      `Error deleting banner ${id}:`,
      e instanceof Error ? e.message : e,
    );
    throw e;
  }
}
