"use server";
import { mirrorBilingual } from "@platform/database/constants/languages";
import { getCompanySettings } from "@platform/database";
import { serverMessages } from "@platform/locales";
import { ROUTES } from "../../constants/routes";
import { measureOperation } from "@platform/database";
import { runAtomicMutation } from "@platform/database";
import { validateActionArguments } from "../../lib/action-input";

import {
  createBanner,
  updateBanner,
  deleteBanner,
  createClientLogo,
  updateClientLogo,
  deleteClientLogo,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  createActivityLog,
  StudioEquipment,
  PortfolioItem,
} from "@platform/database";
import { safeWebsiteUrl } from "@platform/database/website-config";
import { revalidatePath } from "next/cache";
// The public site only caches the *published* website snapshot (tags "website"/"company"), and its
// pages render dynamically. Collection edits here change the draft, so they refresh the admin
// Website page (which reports unpublished changes) and reach the public site on the next publish.
// Reviews and equipment are read live by the public pages and need no invalidation.
import { requirePermission } from "../../lib/auth";
import { requireFeatureEnabled } from "@platform/database";

export async function toggleBannerStatusAction(id: string, isActive: boolean) {
  return measureOperation("action:toggleBannerStatusAction", async () => {
    await requireFeatureEnabled("cms");
    const user = await requirePermission("banners", "write");
    validateActionArguments("toggleBannerStatusAction", { id, isActive });
    await runAtomicMutation(async () => {
      if (!(await updateBanner(id, { is_active: isActive })))
        throw new Error(serverMessages.couldNotUpdateBanner);
      await createActivityLog({
        user_id: user.id,
        action: "update",
        entity_type: "banner",
        entity_id: id,
        details: { is_active: isActive },
      });
      return {};
    });

    revalidatePath(ROUTES.cms.banners);
    revalidatePath(ROUTES.cms.website);
    return { success: true };
  });
}

export async function deleteBannerAction(id: string) {
  return measureOperation("action:deleteBannerAction", async () => {
    await requireFeatureEnabled("cms");
    const user = await requirePermission("banners", "delete");
    validateActionArguments("deleteBannerAction", { id });
    await runAtomicMutation(async () => {
      if (!(await deleteBanner(id)))
        throw new Error(serverMessages.couldNotDeleteBanner);
      await createActivityLog({
        user_id: user.id,
        action: "delete",
        entity_type: "banner",
        entity_id: id,
      });
      return {};
    });

    revalidatePath(ROUTES.cms.banners);
    revalidatePath(ROUTES.cms.website);
    return { success: true };
  });
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
  return measureOperation("action:createBannerAction", async () => {
    await requireFeatureEnabled("cms");
    const user = await requirePermission("banners", "write");
    validateActionArguments("createBannerAction", { data });
    data = await mirrorToContentLanguages(data);
    validateBannerData(data);
    const { banner } = await runAtomicMutation(async () => {
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
      return { banner };
    });

    revalidatePath(ROUTES.cms.banners);
    revalidatePath(ROUTES.cms.website);
    return { success: true, banner };
  });
}

export async function deleteClientLogoAction(id: string) {
  return measureOperation("action:deleteClientLogoAction", async () => {
    await requireFeatureEnabled("cms");
    const user = await requirePermission("clients", "delete");
    validateActionArguments("deleteClientLogoAction", { id });
    await runAtomicMutation(async () => {
      await deleteClientLogo(id);
      await createActivityLog({
        user_id: user.id,
        action: "delete",
        entity_type: "client",
        entity_id: id,
      });
      return {};
    });

    revalidatePath(ROUTES.cms.clients);
    revalidatePath(ROUTES.cms.website);
    return { success: true };
  });
}

export async function createClientLogoAction(data: {
  client_name: string;
  logo_svg_url: string;
  website_url?: string;
  display_order?: number;
}) {
  return measureOperation("action:createClientLogoAction", async () => {
    await requireFeatureEnabled("cms");
    const user = await requirePermission("clients", "write");
    validateActionArguments("createClientLogoAction", { data });
    const fields = clientLogoFields(data);
    const { logo } = await runAtomicMutation(async () => {
      const logo = await createClientLogo({
        ...data,
        client_name: fields.client_name!,
        logo_svg_url: fields.logo_svg_url!,
        website_url: fields.website_url || undefined,
        is_active: true,
      });
      await createActivityLog({
        user_id: user.id,
        action: "create",
        entity_type: "client",
        entity_id: logo.id,
        details: { client_name: data.client_name },
      });
      return { logo };
    });

    revalidatePath(ROUTES.cms.clients);
    revalidatePath(ROUTES.cms.website);
    return { success: true, logo };
  });
}

function clientLogoFields(data: {
  client_name?: string;
  logo_svg_url?: string;
  website_url?: string;
}) {
  const clientName = data.client_name?.trim();
  if (
    data.client_name !== undefined &&
    (!clientName || clientName.length > 120)
  )
    throw new Error(serverMessages.clientNameIsRequired);
  const logoUrl =
    data.logo_svg_url !== undefined
      ? safeWebsiteUrl(data.logo_svg_url.trim())
      : undefined;
  if (data.logo_svg_url !== undefined && (!logoUrl || logoUrl.length > 2000))
    throw new Error(serverMessages.useAnHttpsLogoUrlOrA);
  const websiteUrl =
    data.website_url !== undefined
      ? data.website_url.trim()
        ? safeWebsiteUrl(data.website_url.trim())
        : ""
      : undefined;
  if (data.website_url?.trim() && !websiteUrl)
    throw new Error(serverMessages.invalidWebsiteUrl);
  return {
    client_name: clientName,
    logo_svg_url: logoUrl,
    website_url: websiteUrl,
  };
}

export async function updateClientLogoAction(
  id: string,
  data: { client_name?: string; logo_svg_url?: string; website_url?: string },
) {
  return measureOperation("action:updateClientLogoAction", async () => {
    await requireFeatureEnabled("cms");
    const user = await requirePermission("clients", "write");
    validateActionArguments("updateClientLogoAction", { id, data });
    const fields = clientLogoFields(data);
    const { logo } = await runAtomicMutation(async () => {
      const logo = await updateClientLogo(id, {
        ...(fields.client_name !== undefined && {
          client_name: fields.client_name,
        }),
        ...(fields.logo_svg_url !== undefined && {
          logo_svg_url: fields.logo_svg_url,
        }),
        ...(fields.website_url !== undefined && {
          website_url: fields.website_url,
        }),
      });
      if (!logo) throw new Error(serverMessages.clientLogoNotFound);
      await createActivityLog({
        user_id: user.id,
        action: "update",
        entity_type: "client",
        entity_id: id,
        details: { client_name: logo.client_name },
      });
      return { logo };
    });

    revalidatePath(ROUTES.cms.clients);
    revalidatePath(ROUTES.cms.website);
    return { success: true, logo };
  });
}

export async function deleteEquipmentAction(id: string) {
  return measureOperation("action:deleteEquipmentAction", async () => {
    await requireFeatureEnabled("cms");
    const user = await requirePermission("equipment", "delete");
    validateActionArguments("deleteEquipmentAction", { id });
    await runAtomicMutation(async () => {
      await deleteEquipment(id);
      await createActivityLog({
        user_id: user.id,
        action: "delete",
        entity_type: "equipment",
        entity_id: id,
      });
      return {};
    });

    revalidatePath(ROUTES.cms.equipment);
    return { success: true };
  });
}

export async function createEquipmentAction(data: {
  category: StudioEquipment["category"];
  model_name: string;
  name_ar?: string;
  brand?: string;
  specification?: string;
  quantity?: number;
}) {
  return measureOperation("action:createEquipmentAction", async () => {
    await requireFeatureEnabled("cms");
    const user = await requirePermission("equipment", "write");
    validateActionArguments("createEquipmentAction", { data });
    const { item } = await runAtomicMutation(async () => {
      const item = await createEquipment(data);
      await createActivityLog({
        user_id: user.id,
        action: "create",
        entity_type: "equipment",
        entity_id: item.id,
        details: { model_name: data.model_name },
      });
      return { item };
    });

    revalidatePath(ROUTES.cms.equipment);
    return { success: true, item };
  });
}

export async function updateEquipmentAction(
  id: string,
  data: {
    category: StudioEquipment["category"];
    model_name: string;
    name_ar?: string;
    brand?: string;
    specification?: string;
    quantity?: number;
  },
) {
  return measureOperation("action:updateEquipmentAction", async () => {
    await requireFeatureEnabled("cms");
    const user = await requirePermission("equipment", "write");
    validateActionArguments("updateEquipmentAction", { id, data });
    if (!data.model_name?.trim())
      throw new Error(serverMessages.modelNameIsRequired);
    const { item } = await runAtomicMutation(async () => {
      const item = await updateEquipment(id, {
        category: data.category,
        model_name: data.model_name.trim(),
        name_ar: data.name_ar?.trim() || data.model_name.trim(),
        brand: data.brand ?? "",
        specification: data.specification ?? "",
        quantity: Math.max(1, Math.trunc(data.quantity ?? 1)),
      });
      if (!item) throw new Error(serverMessages.equipmentNotFound);
      await createActivityLog({
        user_id: user.id,
        action: "update",
        entity_type: "equipment",
        entity_id: id,
        details: { model_name: item.model_name },
      });
      return { item };
    });

    revalidatePath(ROUTES.cms.equipment);
    return { success: true, item };
  });
}

export async function togglePortfolioFeaturedAction(
  id: string,
  isFeatured: boolean,
) {
  return measureOperation("action:togglePortfolioFeaturedAction", async () => {
    await requireFeatureEnabled("cms");
    const user = await requirePermission("portfolio", "write");
    validateActionArguments("togglePortfolioFeaturedAction", {
      id,
      isFeatured,
    });
    await runAtomicMutation(async () => {
      if (!(await updatePortfolioItem(id, { is_featured: isFeatured })))
        throw new Error(serverMessages.couldNotUpdateProject);
      await createActivityLog({
        user_id: user.id,
        action: "update",
        entity_type: "portfolio",
        entity_id: id,
        details: { is_featured: isFeatured },
      });
      return {};
    });

    revalidatePath(ROUTES.cms.portfolio);
    revalidatePath(ROUTES.cms.website);
    return { success: true };
  });
}

export async function deletePortfolioItemAction(id: string) {
  return measureOperation("action:deletePortfolioItemAction", async () => {
    await requireFeatureEnabled("cms");
    const user = await requirePermission("portfolio", "delete");
    validateActionArguments("deletePortfolioItemAction", { id });
    await runAtomicMutation(async () => {
      if (!(await deletePortfolioItem(id)))
        throw new Error(serverMessages.couldNotDeleteProject);
      await createActivityLog({
        user_id: user.id,
        action: "delete",
        entity_type: "portfolio",
        entity_id: id,
      });
      return {};
    });

    revalidatePath(ROUTES.cms.portfolio);
    revalidatePath(ROUTES.cms.website);
    return { success: true };
  });
}

export async function createPortfolioItemAction(input: {
  category_id?: string;
  slug: string;
  title_en: string;
  title_ar: string;
  /** Media projects and case studies; optional for products, listings, menu items… */
  client_name?: string;
  year?: number;
  subtitle_en?: string;
  subtitle_ar?: string;
  price?: number;
  price_note_en?: string;
  price_note_ar?: string;
  location?: string;
  external_url?: string;
  attributes?: {
    labelEn: string;
    labelAr: string;
    valueEn: string;
    valueAr: string;
  }[];
  aspect_ratio?: string;
  thumbnail_url: string;
  preview_video_url?: string;
  is_featured?: boolean;
  full_video_url?: string;
  description_en?: string;
  description_ar?: string;
  gallery_urls?: string[];
  display_order?: number;
}) {
  return measureOperation("action:createPortfolioItemAction", async () => {
    await requireFeatureEnabled("cms");
    const user = await requirePermission("portfolio", "write");
    validateActionArguments("createPortfolioItemAction", { input });
    const data = await preparePortfolioData(input);
    const { project } = await runAtomicMutation(async () => {
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
      return { project };
    });

    revalidatePath(ROUTES.cms.portfolio);
    revalidatePath(ROUTES.cms.website);
    return { success: true, project };
  });
}

import {
  updateReview,
  deleteReview,
  createFaq,
  updateFaq,
  deleteFaq,
  createStatistic,
  updateStatistic,
  deleteStatistic,
} from "@platform/database";

export async function toggleReviewApprovalAction(
  id: string,
  isApproved: boolean,
) {
  return measureOperation("action:toggleReviewApprovalAction", async () => {
    await requireFeatureEnabled("cms");
    const user = await requirePermission("reviews", "write");
    validateActionArguments("toggleReviewApprovalAction", { id, isApproved });
    const review = await runAtomicMutation(async () => {
      const review = await updateReview(id, { isApproved });
      await createActivityLog({
        user_id: user.id,
        action: "update",
        entity_type: "review",
        entity_id: review.id,
      });
      return review;
    });
    revalidatePath(ROUTES.cms.reviews);
    return { success: true, review };
  });
}

export async function deleteReviewAction(id: string) {
  return measureOperation("action:deleteReviewAction", async () => {
    await requireFeatureEnabled("cms");
    const user = await requirePermission("reviews", "delete");
    validateActionArguments("deleteReviewAction", { id });
    await runAtomicMutation(async () => {
      await deleteReview(id);
      await createActivityLog({
        user_id: user.id,
        action: "delete",
        entity_type: "review",
        entity_id: id,
      });
    });
    revalidatePath(ROUTES.cms.reviews);
    return { success: true };
  });
}

export async function createFaqAction(data: Parameters<typeof createFaq>[0]) {
  return measureOperation("action:createFaqAction", async () => {
    await requireFeatureEnabled("cms");
    const user = await requirePermission("faqs", "write");
    validateActionArguments("createFaqAction", { data });
    data = await mirrorToContentLanguages(data);
    const faq = await runAtomicMutation(async () => {
      const faq = await createFaq(data);
      await createActivityLog({
        user_id: user.id,
        action: "create",
        entity_type: "faq",
        entity_id: faq.id,
      });
      return faq;
    });
    revalidatePath(ROUTES.cms.website);
    revalidatePath(ROUTES.cms.faqs);
    return { success: true, faq };
  });
}

export async function updateFaqAction(
  id: string,
  data: Partial<Parameters<typeof createFaq>[0]>,
) {
  return measureOperation("action:updateFaqAction", async () => {
    await requireFeatureEnabled("cms");
    const user = await requirePermission("faqs", "write");
    validateActionArguments("updateFaqAction", { id, data });
    data = await mirrorToContentLanguages(data);
    const faq = await runAtomicMutation(async () => {
      const faq = await updateFaq(id, data);
      await createActivityLog({
        user_id: user.id,
        action: "update",
        entity_type: "faq",
        entity_id: faq.id,
      });
      return faq;
    });
    revalidatePath(ROUTES.cms.website);
    revalidatePath(ROUTES.cms.faqs);
    return { success: true, faq };
  });
}

export async function deleteFaqAction(id: string) {
  return measureOperation("action:deleteFaqAction", async () => {
    await requireFeatureEnabled("cms");
    const user = await requirePermission("faqs", "delete");
    validateActionArguments("deleteFaqAction", { id });
    await runAtomicMutation(async () => {
      await deleteFaq(id);
      await createActivityLog({
        user_id: user.id,
        action: "delete",
        entity_type: "faq",
        entity_id: id,
      });
    });
    revalidatePath(ROUTES.cms.website);
    revalidatePath(ROUTES.cms.faqs);
    return { success: true };
  });
}

export async function createStatisticAction(
  data: Parameters<typeof createStatistic>[0],
) {
  return measureOperation("action:createStatisticAction", async () => {
    await requireFeatureEnabled("cms");
    const user = await requirePermission("stats", "write");
    validateActionArguments("createStatisticAction", { data });
    data = await mirrorToContentLanguages(data);
    validateStatisticData(data);
    const stat = await runAtomicMutation(async () => {
      const stat = await createStatistic(data);
      await createActivityLog({
        user_id: user.id,
        action: "create",
        entity_type: "statistic",
        entity_id: stat.id,
      });
      return stat;
    });
    revalidatePath(ROUTES.cms.website);
    revalidatePath(ROUTES.cms.stats);
    return { success: true, stat };
  });
}

export async function updateStatisticAction(
  id: string,
  data: Partial<Parameters<typeof createStatistic>[0]>,
) {
  return measureOperation("action:updateStatisticAction", async () => {
    await requireFeatureEnabled("cms");
    const user = await requirePermission("stats", "write");
    validateActionArguments("updateStatisticAction", { id, data });
    data = await mirrorToContentLanguages(data);
    validateStatisticData(data);
    const stat = await runAtomicMutation(async () => {
      const stat = await updateStatistic(id, data);
      await createActivityLog({
        user_id: user.id,
        action: "update",
        entity_type: "statistic",
        entity_id: stat.id,
      });
      return stat;
    });
    revalidatePath(ROUTES.cms.website);
    revalidatePath(ROUTES.cms.stats);
    return { success: true, stat };
  });
}

export async function deleteStatisticAction(id: string) {
  return measureOperation("action:deleteStatisticAction", async () => {
    await requireFeatureEnabled("cms");
    const user = await requirePermission("stats", "delete");
    validateActionArguments("deleteStatisticAction", { id });
    await runAtomicMutation(async () => {
      await deleteStatistic(id);
      await createActivityLog({
        user_id: user.id,
        action: "delete",
        entity_type: "statistic",
        entity_id: id,
      });
    });
    revalidatePath(ROUTES.cms.website);
    revalidatePath(ROUTES.cms.stats);
    return { success: true };
  });
}

function validateStatisticData(
  data: Partial<Parameters<typeof createStatistic>[0]>,
) {
  for (const key of ["labelEn", "labelAr"] as const)
    if (
      key in data &&
      (typeof data[key] !== "string" ||
        !data[key]?.trim() ||
        data[key]!.length > 100)
    )
      throw new Error(serverMessages.bothLabelsAreRequiredMax100Characters);
  for (const key of ["subLabelEn", "subLabelAr", "icon"] as const)
    if ((data[key]?.length ?? 0) > 200)
      throw new Error(serverMessages.textIsTooLongMax200Characters);
  if (
    data.sortOrder !== undefined &&
    (!Number.isInteger(data.sortOrder) || Math.abs(data.sortOrder) > 10000)
  )
    throw new Error(serverMessages.invalidSortOrder);
  // Value, preset, founding year, rounding and suffix rules live in validateStatisticInput.
}
function validateBannerData(data: Parameters<typeof createBannerAction>[0]) {
  for (const value of [data.title_en, data.title_ar])
    if (typeof value !== "string" || !value.trim() || value.length > 500)
      throw new Error(serverMessages.bothTitlesAreRequiredMax500Characters);
  if (
    !["image", "video"].includes(data.media_type) ||
    !safeWebsiteUrl(data.media_url)
  )
    throw new Error(serverMessages.provideAValidImageOrVideoUrl);
  for (const value of [data.poster_url, data.cta_link])
    if (value && !safeWebsiteUrl(value))
      throw new Error(serverMessages.invalidWebsiteLink);
  if (
    data.display_order !== undefined &&
    (!Number.isInteger(data.display_order) ||
      Math.abs(data.display_order) > 10000)
  )
    throw new Error(serverMessages.invalidDisplayOrder);
}
/** For a company that writes in one language, fills both sides of every English/Arabic pair. */
async function mirrorToContentLanguages<T>(input: T): Promise<T> {
  const { content_languages } = await getCompanySettings();
  return mirrorBilingual(input, content_languages);
}
/** Checks a catalogue item and, for a company that writes in one language, fills both sides of every pair. */
async function preparePortfolioData(
  input: Parameters<typeof createPortfolioItemAction>[0],
) {
  const data = await mirrorToContentLanguages(input);
  validatePortfolioData(data);
  return {
    ...data,
    client_name: data.client_name?.trim() ?? "",
    attributes: (data.attributes ?? []).filter(
      (a) =>
        a.labelEn.trim() ||
        a.labelAr.trim() ||
        a.valueEn.trim() ||
        a.valueAr.trim(),
    ),
  };
}
function validatePortfolioData(
  data: Parameters<typeof createPortfolioItemAction>[0],
) {
  if (
    ![data.title_en, data.title_ar].every(
      (v) => typeof v === "string" && v.trim() && v.length <= 500,
    ) ||
    (data.client_name ?? "").length > 500
  )
    throw new Error(serverMessages.titlesAndClientNameAreRequired);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug) || data.slug.length > 150)
    throw new Error(
      "Use a unique slug with lowercase letters, numbers and hyphens",
    );
  if (
    data.year !== undefined &&
    data.year !== null &&
    (!Number.isInteger(data.year) || data.year < 1900 || data.year > 2100)
  )
    throw new Error(serverMessages.invalidYear);
  if (
    data.price !== undefined &&
    data.price !== null &&
    !(
      Number.isFinite(data.price) &&
      data.price >= 0 &&
      data.price <= 1_000_000_000
    )
  )
    throw new Error(serverMessages.invalidPrice);
  for (const value of [
    data.subtitle_en,
    data.subtitle_ar,
    data.price_note_en,
    data.price_note_ar,
    data.location,
  ])
    if (value && value.length > 300)
      throw new Error(serverMessages.invalidInput);
  if (
    data.external_url &&
    !/^https?:\/\//.test(safeWebsiteUrl(data.external_url))
  )
    throw new Error(serverMessages.invalidMediaUrl);
  if (
    data.attributes &&
    (data.attributes.length > 20 ||
      data.attributes.some((a) =>
        [a.labelEn, a.labelAr, a.valueEn, a.valueAr].some(
          (v) => typeof v !== "string" || v.length > 200,
        ),
      ))
  )
    throw new Error(serverMessages.invalidInput);
  if (!safeWebsiteUrl(data.thumbnail_url))
    throw new Error(serverMessages.thumbnailUrlIsRequired);
  for (const url of [
    data.preview_video_url,
    data.full_video_url,
    ...(data.gallery_urls || []),
  ])
    if (url && !safeWebsiteUrl(url))
      throw new Error(serverMessages.invalidMediaUrl);
  if (data.gallery_urls && data.gallery_urls.length > 30)
    throw new Error(serverMessages.maximum30GalleryImages);
  if (
    data.display_order !== undefined &&
    (!Number.isInteger(data.display_order) ||
      Math.abs(data.display_order) > 10000)
  )
    throw new Error(serverMessages.invalidDisplayOrder);
}
export async function updateBannerContentAction(
  id: string,
  data: Parameters<typeof createBannerAction>[0],
) {
  return measureOperation("action:updateBannerContentAction", async () => {
    await requireFeatureEnabled("cms");
    const user = await requirePermission("banners", "write");
    validateActionArguments("updateBannerContentAction", { id, data });
    data = await mirrorToContentLanguages(data);
    validateBannerData(data);
    const { banner } = await runAtomicMutation(async () => {
      const banner = await updateBanner(id, data);
      if (!banner) throw new Error(serverMessages.bannerCouldNotBeSaved);
      await createActivityLog({
        user_id: user.id,
        action: "update",
        entity_type: "banner",
        entity_id: id,
      });
      return { banner };
    });
    revalidatePath(ROUTES.cms.banners);
    revalidatePath(ROUTES.cms.website);
    return { success: true, banner };
  });
}
export async function updatePortfolioContentAction(
  id: string,
  input: Parameters<typeof createPortfolioItemAction>[0],
) {
  return measureOperation("action:updatePortfolioContentAction", async () => {
    await requireFeatureEnabled("cms");
    const user = await requirePermission("portfolio", "write");
    validateActionArguments("updatePortfolioContentAction", { id, input });
    const data = await preparePortfolioData(input);
    const { project } = await runAtomicMutation(async () => {
      const project = await updatePortfolioItem(id, {
        ...data,
        aspect_ratio: data.aspect_ratio as PortfolioItem["aspect_ratio"],
      });
      if (!project) throw new Error(serverMessages.projectCouldNotBeSaved);
      await createActivityLog({
        user_id: user.id,
        action: "update",
        entity_type: "portfolio",
        entity_id: id,
      });
      return { project };
    });
    revalidatePath(ROUTES.cms.portfolio);
    revalidatePath(ROUTES.cms.website);
    return { success: true, project };
  });
}
