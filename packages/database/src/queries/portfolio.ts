import { db } from '../db';
import { mockPortfolioCategories, mockPortfolioItems } from '../mock-data';
import { PortfolioCategory, PortfolioItem } from '../types';

export async function getPortfolioCategories(): Promise<PortfolioCategory[]> {
  try {
    const cats = await db.portfolioCategory.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    if (cats && cats.length > 0) {
      return cats.map((c) => ({
        id: c.id,
        slug: c.slug,
        name_en: c.nameEn,
        name_ar: c.nameAr,
        display_order: c.displayOrder,
      }));
    }
  } catch (e) {
    console.error('Error fetching portfolio categories:', e);
  }
  return mockPortfolioCategories;
}

export async function getPortfolioItems(categorySlug?: string): Promise<PortfolioItem[]> {
  try {
    const whereCondition: any = {};
    if (categorySlug && categorySlug !== 'all') {
      const cat = await db.portfolioCategory.findUnique({
        where: { slug: categorySlug },
      });
      if (cat) {
        whereCondition.categoryId = cat.id;
      }
    }

    const items = await db.portfolioItem.findMany({
      where: whereCondition,
      orderBy: { displayOrder: 'asc' },
    });

    if (items && items.length > 0) {
      return items.map((item) => ({
        id: item.id,
        category_id: item.categoryId || '',
        slug: item.slug,
        title_en: item.titleEn,
        title_ar: item.titleAr,
        client_name: item.clientName,
        year: item.year,
        aspect_ratio: (item.aspectRatio as any) || '16:9',
        thumbnail_url: item.thumbnailUrl,
        preview_video_url: item.previewVideoUrl || undefined,
        full_video_url: item.fullVideoUrl || undefined,
        gallery_urls: item.galleryUrls,
        description_en: item.descriptionEn || undefined,
        description_ar: item.descriptionAr || undefined,
        credits: item.credits as any,
        is_featured: item.isFeatured,
        display_order: item.displayOrder,
        created_at: item.createdAt.toISOString(),
      }));
    }
  } catch (e) {
    console.error('Error fetching portfolio items:', e);
  }

  if (!categorySlug || categorySlug === 'all') return mockPortfolioItems;
  const cat = mockPortfolioCategories.find((c) => c.slug === categorySlug);
  if (!cat) return mockPortfolioItems;
  return mockPortfolioItems.filter((item) => item.category_id === cat.id);
}

export async function getPortfolioItemBySlug(slug: string): Promise<PortfolioItem | null> {
  try {
    const item = await db.portfolioItem.findUnique({
      where: { slug },
    });
    if (item) {
      return {
        id: item.id,
        category_id: item.categoryId || '',
        slug: item.slug,
        title_en: item.titleEn,
        title_ar: item.titleAr,
        client_name: item.clientName,
        year: item.year,
        aspect_ratio: (item.aspectRatio as any) || '16:9',
        thumbnail_url: item.thumbnailUrl,
        preview_video_url: item.previewVideoUrl || undefined,
        full_video_url: item.fullVideoUrl || undefined,
        gallery_urls: item.galleryUrls,
        description_en: item.descriptionEn || undefined,
        description_ar: item.descriptionAr || undefined,
        credits: item.credits as any,
        is_featured: item.isFeatured,
        display_order: item.displayOrder,
        created_at: item.createdAt.toISOString(),
      };
    }
  } catch (e) {
    console.error('Error fetching portfolio item by slug:', e);
  }
  return mockPortfolioItems.find((p) => p.slug === slug) || null;
}
