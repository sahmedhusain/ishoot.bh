"use server";

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
  createActivityLog,
  HeroBanner,
  ClientLogo,
  StudioEquipment,
  PortfolioItem,
} from "@ishoot/database";
import { revalidatePath } from "next/cache";
import { requirePermission } from "../../lib/auth";
import { revalidatePublicSite } from "../../lib/revalidate-web";

export async function toggleBannerStatusAction(id: string, isActive: boolean) {
  const user = await requirePermission("banners", "write");
  await updateBanner(id, { is_active: isActive });

  await createActivityLog({
    user_id: user.id,
    action: "update",
    entity_type: "banner",
    entity_id: id,
    details: { is_active: isActive },
  });

  revalidatePath("/dashboard/cms/banners");
  await revalidatePublicSite(["banners"], ["/"]);
  return { success: true };
}

export async function deleteBannerAction(id: string) {
  const user = await requirePermission("banners", "delete");
  await deleteBanner(id);

  await createActivityLog({
    user_id: user.id,
    action: "delete",
    entity_type: "banner",
    entity_id: id,
  });

  revalidatePath("/dashboard/cms/banners");
  await revalidatePublicSite(["banners"], ["/"]);
  return { success: true };
}

export async function createBannerAction(data: {
  title_en: string;
  title_ar: string;
  subtitle_en?: string;
  subtitle_ar?: string;
  media_type: "video" | "image";
  media_url: string;
  poster_url?: string;
  cta_label_en?: string;
  cta_label_ar?: string;
  cta_link?: string;
  display_order?: number;
}) {
  const user = await requirePermission("banners", "write");
  const banner = await createBanner({
    ...data,
    display_order: data.display_order ?? 0,
    is_active: true,
  });

  await createActivityLog({
    user_id: user.id,
    action: "create",
    entity_type: "banner",
    entity_id: banner.id,
    details: { title_en: data.title_en },
  });

  revalidatePath("/dashboard/cms/banners");
  await revalidatePublicSite(["banners"], ["/"]);
  return { success: true, banner };
}

export async function deleteClientLogoAction(id: string) {
  const user = await requirePermission("clients", "delete");
  await deleteClientLogo(id);

  await createActivityLog({
    user_id: user.id,
    action: "delete",
    entity_type: "client",
    entity_id: id,
  });

  revalidatePath("/dashboard/cms/clients");
  await revalidatePublicSite(["clients"], ["/"]);
  return { success: true };
}

export async function createClientLogoAction(data: {
  client_name: string;
  logo_svg_url: string;
  website_url?: string;
  display_order?: number;
}) {
  const user = await requirePermission("clients", "write");
  const logo = await createClientLogo({
    ...data,
    is_active: true,
  });

  await createActivityLog({
    user_id: user.id,
    action: "create",
    entity_type: "client",
    entity_id: logo.id,
    details: { client_name: data.client_name },
  });

  revalidatePath("/dashboard/cms/clients");
  await revalidatePublicSite(["clients"], ["/"]);
  return { success: true, logo };
}

export async function deleteEquipmentAction(id: string) {
  const user = await requirePermission("equipment", "delete");
  await deleteEquipment(id);

  await createActivityLog({
    user_id: user.id,
    action: "delete",
    entity_type: "equipment",
    entity_id: id,
  });

  revalidatePath("/dashboard/cms/equipment");
  await revalidatePublicSite(["equipment"], ["/equipment", "/"]);
  return { success: true };
}

export async function createEquipmentAction(data: {
  category: StudioEquipment["category"];
  model_name: string;
  name_ar?: string;
  brand?: string;
  specification?: string;
  daily_rate_bhd?: number;
  quantity?: number;
}) {
  const user = await requirePermission("equipment", "write");
  const item = await createEquipment(data);

  await createActivityLog({
    user_id: user.id,
    action: "create",
    entity_type: "equipment",
    entity_id: item.id,
    details: { model_name: data.model_name },
  });

  revalidatePath("/dashboard/cms/equipment");
  await revalidatePublicSite(["equipment"], ["/equipment", "/"]);
  return { success: true, item };
}

export async function togglePortfolioFeaturedAction(
  id: string,
  isFeatured: boolean,
) {
  const user = await requirePermission("portfolio", "write");
  await updatePortfolioItem(id, { is_featured: isFeatured });

  await createActivityLog({
    user_id: user.id,
    action: "update",
    entity_type: "portfolio",
    entity_id: id,
    details: { is_featured: isFeatured },
  });

  revalidatePath("/dashboard/cms/portfolio");
  await revalidatePublicSite(["portfolio"], ["/works", "/"]);
  return { success: true };
}

export async function deletePortfolioItemAction(id: string) {
  const user = await requirePermission("portfolio", "delete");
  await deletePortfolioItem(id);

  await createActivityLog({
    user_id: user.id,
    action: "delete",
    entity_type: "portfolio",
    entity_id: id,
  });

  revalidatePath("/dashboard/cms/portfolio");
  await revalidatePublicSite(["portfolio"], ["/works", "/"]);
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
  const user = await requirePermission("portfolio", "write");
  const project = await createPortfolioItem({
    ...data,
    aspect_ratio: data.aspect_ratio || "16:9",
  });

  await createActivityLog({
    user_id: user.id,
    action: "create",
    entity_type: "portfolio",
    entity_id: project.id,
    details: { title_en: data.title_en, slug: data.slug },
  });

  revalidatePath("/dashboard/cms/portfolio");
  await revalidatePublicSite(["portfolio"], ["/works", "/"]);
  return { success: true, project };
}
