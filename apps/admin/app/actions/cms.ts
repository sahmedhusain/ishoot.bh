'use server';

import {
  createBanner,
  updateBanner,
  deleteBanner,
  createClientLogo,
  deleteClientLogo,
  createEquipment,
  deleteEquipment,
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  HeroBanner,
  ClientLogo,
  StudioEquipment,
  PortfolioItem,
} from '@ishoot/database';
import { revalidatePath } from 'next/cache';

// --- Hero Banners ---
export async function toggleBannerStatusAction(id: string, isActive: boolean) {
  await updateBanner(id, { is_active: isActive });
  revalidatePath('/dashboard/cms/banners');
  return { success: true };
}

export async function deleteBannerAction(id: string) {
  await deleteBanner(id);
  revalidatePath('/dashboard/cms/banners');
  return { success: true };
}

export async function createBannerAction(data: {
  title_en: string;
  title_ar: string;
  subtitle_en?: string;
  subtitle_ar?: string;
  media_type: 'video' | 'image';
  media_url: string;
  poster_url?: string;
  cta_label_en?: string;
  cta_label_ar?: string;
  cta_link?: string;
  display_order?: number;
}) {
  const banner = await createBanner({
    ...data,
    display_order: data.display_order ?? 0,
    is_active: true,
  });
  revalidatePath('/dashboard/cms/banners');
  return { success: true, banner };
}

// --- Client Logos ---
export async function deleteClientLogoAction(id: string) {
  await deleteClientLogo(id);
  revalidatePath('/dashboard/cms/clients');
  return { success: true };
}

export async function createClientLogoAction(data: {
  client_name: string;
  logo_svg_url: string;
  website_url?: string;
  display_order?: number;
}) {
  const logo = await createClientLogo({
    ...data,
    is_active: true,
  });
  revalidatePath('/dashboard/cms/clients');
  return { success: true, logo };
}

// --- Studio Equipment ---
export async function deleteEquipmentAction(id: string) {
  await deleteEquipment(id);
  revalidatePath('/dashboard/cms/equipment');
  return { success: true };
}

export async function createEquipmentAction(data: {
  category: StudioEquipment['category'];
  model_name: string;
  name_ar?: string;
  brand?: string;
  specification?: string;
  daily_rate_bhd?: number;
  quantity?: number;
}) {
  const item = await createEquipment(data);
  revalidatePath('/dashboard/cms/equipment');
  return { success: true, item };
}

// --- Portfolio Projects ---
export async function togglePortfolioFeaturedAction(id: string, isFeatured: boolean) {
  await updatePortfolioItem(id, { is_featured: isFeatured });
  revalidatePath('/dashboard/cms/portfolio');
  return { success: true };
}

export async function deletePortfolioItemAction(id: string) {
  await deletePortfolioItem(id);
  revalidatePath('/dashboard/cms/portfolio');
  return { success: true };
}

export async function createPortfolioItemAction(data: {
  category_id?: string;
  slug: string;
  title_en: string;
  title_ar: string;
  client_name: string;
  year: number;
  aspect_ratio?: string;
  thumbnail_url: string;
  preview_video_url?: string;
  is_featured?: boolean;
}) {
  const project = await createPortfolioItem({
    ...data,
    aspect_ratio: data.aspect_ratio || '16:9',
  });
  revalidatePath('/dashboard/cms/portfolio');
  return { success: true, project };
}
