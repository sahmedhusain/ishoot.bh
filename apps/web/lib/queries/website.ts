import { cache } from "react";
import { serverMessages } from "@platform/locales";
import { getContentSnapshot } from "@platform/api-client";
import { getCompanySettings } from "./company-settings";
import {
  defaultWebsiteConfig,
  validateWebsiteConfig,
  type WebsiteConfig,
  type PublicService,
} from "../website-config";
import { getActiveBanners } from "./banners";
import { getPortfolioItems, getPortfolioCategories } from "./portfolio";
import { getActiveClientLogos } from "./clients";
import { getFaqs } from "./faqs";
import { getStatistics } from "./stats";
import { listCmsPages } from "./cms-pages";
import { getPublishedArticles } from "./cms-articles";
import { getAllServices } from "./services";
import { getSocialLinks } from "./social-links";

export async function getPublicServices(): Promise<PublicService[]> {
  const all = await getAllServices({ includeInactive: false });
  return all
    .filter((s: any) => s.is_public !== false)
    .map((s: any) => ({
      id: s.id,
      nameEn: s.name_en ?? s.nameEn ?? "",
      nameAr: s.name_ar ?? s.nameAr ?? "",
      descriptionEn: (s.description_en ?? s.descriptionEn) || null,
      descriptionAr: (s.description_ar ?? s.descriptionAr) || null,
      imageUrl: (s.image_url ?? s.imageUrl) || null,
    }));
}

export async function collectWebsiteDraft(config: WebsiteConfig) {
  const [
    banners,
    portfolio,
    clients,
    faqs,
    stats,
    services,
    pages,
    articles,
    branding,
    categories,
    socialLinks,
  ] = await Promise.all([
    getActiveBanners(),
    getPortfolioItems(),
    getActiveClientLogos(),
    getFaqs(false),
    getStatistics(),
    getPublicServices(),
    listCmsPages(),
    getPublishedArticles(),
    getCompanySettings(),
    getPortfolioCategories(),
    getSocialLinks(true),
  ]);

  return {
    config: validateWebsiteConfig(config),
    brandTheme: branding.theme as typeof branding.theme | undefined,
    brandAssets: {
      logo_url: branding.logo_url,
      dark_logo_url: branding.dark_logo_url,
      icon_url: branding.icon_url,
      dark_icon_url: branding.dark_icon_url,
    } as
      | Pick<
          typeof branding,
          "logo_url" | "dark_logo_url" | "icon_url" | "dark_icon_url"
        >
      | undefined,
    banners,
    portfolio,
    categories: categories as typeof categories | undefined,
    clients,
    faqs,
    stats,
    services,
    pages,
    articles,
    socialLinks,
  };
}

export type WebsiteSnapshot = Awaited<ReturnType<typeof collectWebsiteDraft>>;

export async function getWebsiteEditor() {
  const snap = await getContentSnapshot("main").catch(() => null);
  const rawDraft = snap?.draft as Record<string, any> | undefined;
  const draftConfig =
    rawDraft?.config ??
    (rawDraft?.sections ? rawDraft : JSON.parse(JSON.stringify(defaultWebsiteConfig)));
  return {
    id: snap?.id ?? "main",
    draft: draftConfig,
    published: snap?.published ?? null,
    previous: (snap as any)?.previous ?? null,
    revision: snap?.revision ?? 1,
    publishedAt: snap?.publishedAt ? new Date(snap.publishedAt) : null,
    updatedAt: snap?.updatedAt ? new Date(snap.updatedAt) : new Date(),
  };
}

export const getWebsiteSnapshot = cache(
  async (preview = false): Promise<WebsiteSnapshot> => {
    const snap = await getContentSnapshot("main").catch(() => null);
    if (!preview && snap?.published)
      return snap.published as unknown as WebsiteSnapshot;
    if (!preview || !snap)
      throw new Error(serverMessages.websiteSetupIsIncompleteSaveAndPublish);
    const rawDraft = snap.draft as Record<string, any> | undefined;
    const draftConfig = rawDraft?.config ?? rawDraft;
    return collectWebsiteDraft(validateWebsiteConfig(draftConfig));
  },
);

export const WEBSITE_SNAPSHOT_SECTIONS = [
  "config",
  "brandTheme",
  "brandAssets",
  "banners",
  "portfolio",
  "categories",
  "clients",
  "faqs",
  "stats",
  "services",
  "pages",
  "articles",
] as const;
export type WebsiteSnapshotSection = (typeof WEBSITE_SNAPSHOT_SECTIONS)[number];

const stableJson = (value: unknown): string =>
  JSON.stringify(value, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v).sort(([a], [b]) => a.localeCompare(b)),
        )
      : v,
  );

export async function getWebsitePublicationStatus(): Promise<{
  isPublished: boolean;
  changedSections: WebsiteSnapshotSection[];
}> {
  const content = await getWebsiteEditor();
  const published = content.published as Record<string, unknown> | null;
  if (!published)
    return {
      isPublished: false,
      changedSections: [...WEBSITE_SNAPSHOT_SECTIONS],
    };
  const draft = JSON.parse(
    JSON.stringify(
      await collectWebsiteDraft(validateWebsiteConfig(content.draft)),
    ),
  );
  return {
    isPublished: true,
    changedSections: WEBSITE_SNAPSHOT_SECTIONS.filter(
      (section) =>
        stableJson(draft[section] ?? null) !==
        stableJson(published[section] ?? null),
    ),
  };
}
