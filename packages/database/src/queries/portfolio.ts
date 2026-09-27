import { db } from "../db";
import { PortfolioCategory, PortfolioItem } from "../types";

function mapCategory(c: any): PortfolioCategory {
  return {
    id: c.id,
    slug: c.slug,
    name_en: c.nameEn,
    name_ar: c.nameAr,
    display_order: c.displayOrder,
  };
}

function mapItem(item: any): PortfolioItem {
  return {
    id: item.id,
    category_id: item.categoryId || "",
    category: item.category ? mapCategory(item.category) : undefined,
    slug: item.slug,
    title_en: item.titleEn,
    title_ar: item.titleAr,
    client_name: item.clientName,
    year: item.year,
    aspect_ratio: (item.aspectRatio as any) || "16:9",
    thumbnail_url: item.thumbnailUrl,
    preview_video_url: item.previewVideoUrl || undefined,
    full_video_url: item.fullVideoUrl || undefined,
    gallery_urls: item.galleryUrls || [],
    description_en: item.descriptionEn || undefined,
    description_ar: item.descriptionAr || undefined,
    credits: (item.credits as any) || {},
    is_featured: item.isFeatured,
    display_order: item.displayOrder,
    created_at: item.createdAt.toISOString(),
  };
}

export async function getPortfolioCategories(): Promise<PortfolioCategory[]> {
  try {
    const cats = await db.portfolioCategory.findMany({
      orderBy: { displayOrder: "asc" },
    });
    return cats.map(mapCategory);
  } catch (e) {
    console.error("Error fetching portfolio categories:", e);
    return [];
  }
}

export async function createPortfolioCategory(data: {
  slug: string;
  name_en: string;
  name_ar: string;
  display_order?: number;
}): Promise<PortfolioCategory> {
  const created = await db.portfolioCategory.create({
    data: {
      slug: data.slug,
      nameEn: data.name_en,
      nameAr: data.name_ar,
      displayOrder: data.display_order ?? 0,
    },
  });
  return mapCategory(created);
}

export async function updatePortfolioCategory(
  id: string,
  data: Partial<PortfolioCategory>,
): Promise<PortfolioCategory | null> {
  try {
    const updateData: any = {};
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.name_en !== undefined) updateData.nameEn = data.name_en;
    if (data.name_ar !== undefined) updateData.nameAr = data.name_ar;
    if (data.display_order !== undefined)
      updateData.displayOrder = data.display_order;

    const updated = await db.portfolioCategory.update({
      where: { id },
      data: updateData,
    });
    return mapCategory(updated);
  } catch (e) {
    console.error(`Error updating portfolio category ${id}:`, e);
    return null;
  }
}

export async function deletePortfolioCategory(id: string): Promise<boolean> {
  try {
    await db.portfolioCategory.delete({ where: { id } });
    return true;
  } catch (e) {
    console.error(`Error deleting portfolio category ${id}:`, e);
    return false;
  }
}

export async function getPortfolioItems(
  categorySlug?: string,
): Promise<PortfolioItem[]> {
  try {
    const whereCondition: any = {};
    if (categorySlug && categorySlug !== "all") {
      const cat = await db.portfolioCategory.findUnique({
        where: { slug: categorySlug },
      });
      if (cat) {
        whereCondition.categoryId = cat.id;
      }
    }

    const items = await db.portfolioItem.findMany({
      where: whereCondition,
      include: { category: true },
      orderBy: { displayOrder: "asc" },
    });
    return items.map(mapItem);
  } catch (e) {
    console.error("Error fetching portfolio items:", e);
    return [];
  }
}

export async function getPortfolioItemBySlug(
  slug: string,
): Promise<PortfolioItem | null> {
  try {
    const item = await db.portfolioItem.findUnique({
      where: { slug },
      include: { category: true },
    });
    return item ? mapItem(item) : null;
  } catch (e) {
    console.error(`Error fetching portfolio item ${slug}:`, e);
    return null;
  }
}

export async function createPortfolioItem(data: {
  category_id?: string;
  slug: string;
  title_en: string;
  title_ar: string;
  client_name: string;
  year: number;
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
  const created = await db.portfolioItem.create({
    data: {
      categoryId: data.category_id || null,
      slug: data.slug,
      titleEn: data.title_en,
      titleAr: data.title_ar,
      clientName: data.client_name,
      year: data.year,
      aspectRatio: data.aspect_ratio || "16:9",
      thumbnailUrl: data.thumbnail_url,
      previewVideoUrl: data.preview_video_url || null,
      fullVideoUrl: data.full_video_url || null,
      galleryUrls: data.gallery_urls || [],
      descriptionEn: data.description_en || null,
      descriptionAr: data.description_ar || null,
      credits: data.credits || {},
      isFeatured: data.is_featured ?? false,
      displayOrder: data.display_order ?? 0,
    },
  });
  return mapItem(created);
}

export async function updatePortfolioItem(
  id: string,
  data: Partial<PortfolioItem>,
): Promise<PortfolioItem | null> {
  try {
    const updateData: any = {};
    if (data.category_id !== undefined)
      updateData.categoryId = data.category_id;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.title_en !== undefined) updateData.titleEn = data.title_en;
    if (data.title_ar !== undefined) updateData.titleAr = data.title_ar;
    if (data.client_name !== undefined)
      updateData.clientName = data.client_name;
    if (data.year !== undefined) updateData.year = data.year;
    if (data.aspect_ratio !== undefined)
      updateData.aspectRatio = data.aspect_ratio;
    if (data.thumbnail_url !== undefined)
      updateData.thumbnailUrl = data.thumbnail_url;
    if (data.preview_video_url !== undefined)
      updateData.previewVideoUrl = data.preview_video_url;
    if (data.full_video_url !== undefined)
      updateData.fullVideoUrl = data.full_video_url;
    if (data.gallery_urls !== undefined)
      updateData.galleryUrls = data.gallery_urls;
    if (data.description_en !== undefined)
      updateData.descriptionEn = data.description_en;
    if (data.description_ar !== undefined)
      updateData.descriptionAr = data.description_ar;
    if (data.credits !== undefined) updateData.credits = data.credits;
    if (data.is_featured !== undefined)
      updateData.isFeatured = data.is_featured;
    if (data.display_order !== undefined)
      updateData.displayOrder = data.display_order;

    const updated = await db.portfolioItem.update({
      where: { id },
      data: updateData,
    });
    return mapItem(updated);
  } catch (e) {
    console.error(`Error updating portfolio item ${id}:`, e);
    return null;
  }
}

export async function deletePortfolioItem(id: string): Promise<boolean> {
  try {
    await db.portfolioItem.delete({ where: { id } });
    return true;
  } catch (e) {
    console.error(`Error deleting portfolio item ${id}:`, e);
    return false;
  }
}
