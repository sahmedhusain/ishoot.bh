import { serverMessages } from "@platform/locales";
import { getCompanySettings } from "./company-settings";
import { db, runAtomicMutation } from "../atomic";
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

export async function getPublicServices(): Promise<PublicService[]> {
  return db.service.findMany({
    where: { isActive: true, isPublic: true },
    orderBy: [{ displayOrder: "asc" }, { nameEn: "asc" }],
    select: {
      id: true,
      nameEn: true,
      nameAr: true,
      descriptionEn: true,
      descriptionAr: true,
      imageUrl: true,
    },
  });
}
export async function collectWebsiteDraft(config: WebsiteConfig) {
  // Pages are created from the settings the first time; outside the snapshot transaction so they are kept.
  await listCmsPages().catch(() => undefined);
  return runAtomicMutation(async () => {
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
    ]);
    // Query failures propagate; no redundant full-table count probes are needed.
    return {
      config: validateWebsiteConfig(config),
      brandTheme: branding.theme as typeof branding.theme | undefined,
      brandAssets: { logo_url: branding.logo_url, dark_logo_url: branding.dark_logo_url, icon_url: branding.icon_url, dark_icon_url: branding.dark_icon_url } as Pick<typeof branding, "logo_url" | "dark_logo_url" | "icon_url" | "dark_icon_url"> | undefined,
      banners,
      portfolio,
      categories: categories as typeof categories | undefined,
      clients,
      faqs,
      stats,
      services,
      pages,
      articles,
    };
  });
}
export type WebsiteSnapshot = Awaited<ReturnType<typeof collectWebsiteDraft>>;
export async function getWebsiteEditor() {
  const existing = await db.websiteContent.findUnique({
    where: { id: "main" },
  });
  if (existing) return existing;

  return db.websiteContent.upsert({
    where: { id: "main" },
    update: {},
    create: {
      id: "main",
      draft: JSON.parse(JSON.stringify(defaultWebsiteConfig)),
      // Starter copy is a draft; only an explicit publication may make it public.
    },
  });
}
export async function getWebsiteSnapshot(
  preview = false,
): Promise<WebsiteSnapshot> {
  const content = await db.websiteContent.findUnique({ where: { id: "main" } });
  if (!preview && content?.published)
    return content.published as unknown as WebsiteSnapshot;
  if (!preview || !content)
    throw new Error(serverMessages.websiteSetupIsIncompleteSaveAndPublish);
  return collectWebsiteDraft(validateWebsiteConfig(content.draft));
}

/** Snapshot sections an editor can change outside the Website page. */
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

// Postgres jsonb does not keep key order, so compare with keys sorted.
const stableJson = (value: unknown): string =>
  JSON.stringify(value, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v).sort(([a], [b]) => a.localeCompare(b)),
        )
      : v,
  );

/**
 * Which parts of the public website differ from what is live. Derived by comparing the current
 * draft with the published snapshot, so it can never drift from reality.
 */
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
