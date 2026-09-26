import { db } from '../db';
import { mockHeroBanners } from '../mock-data';
import { HeroBanner } from '../types';

export async function getActiveBanners(): Promise<HeroBanner[]> {
  try {
    const banners = await db.heroBanner.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
    if (banners && banners.length > 0) {
      return banners.map((b) => ({
        id: b.id,
        title_en: b.titleEn,
        title_ar: b.titleAr,
        subtitle_en: b.subtitleEn || undefined,
        subtitle_ar: b.subtitleAr || undefined,
        media_type: b.mediaType as 'video' | 'image',
        media_url: b.mediaUrl,
        poster_url: b.posterUrl || undefined,
        display_order: b.displayOrder,
        is_active: b.isActive,
        cta_label_en: b.ctaLabelEn || undefined,
        cta_label_ar: b.ctaLabelAr || undefined,
        cta_link: b.ctaLink || undefined,
        created_at: b.createdAt.toISOString(),
      }));
    }
  } catch (e) {
    console.error('Error fetching active banners from DB:', e);
  }
  return mockHeroBanners.filter((b) => b.is_active);
}

export async function getAllBanners(): Promise<HeroBanner[]> {
  try {
    const banners = await db.heroBanner.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    if (banners && banners.length > 0) {
      return banners.map((b) => ({
        id: b.id,
        title_en: b.titleEn,
        title_ar: b.titleAr,
        subtitle_en: b.subtitleEn || undefined,
        subtitle_ar: b.subtitleAr || undefined,
        media_type: b.mediaType as 'video' | 'image',
        media_url: b.mediaUrl,
        poster_url: b.posterUrl || undefined,
        display_order: b.displayOrder,
        is_active: b.isActive,
        cta_label_en: b.ctaLabelEn || undefined,
        cta_label_ar: b.ctaLabelAr || undefined,
        cta_link: b.ctaLink || undefined,
        created_at: b.createdAt.toISOString(),
      }));
    }
  } catch (e) {
    console.error('Error fetching all banners from DB:', e);
  }
  return mockHeroBanners;
}
