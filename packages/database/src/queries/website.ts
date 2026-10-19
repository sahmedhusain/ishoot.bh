import { serverMessages } from "@ishoot/locales";
import { db, runAtomicMutation } from "../db";
import {
  defaultWebsiteConfig,
  validateWebsiteConfig,
  type WebsiteConfig,
  type PublicService,
} from "../website-config";
import { getActiveBanners } from "./banners";
import { getPortfolioItems } from "./portfolio";
import { getActiveClientLogos } from "./clients";
import { getFaqs } from "./faqs";
import { getStatistics } from "./stats";

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
  return runAtomicMutation(async () => {
  const [banners, portfolio, clients, faqs, stats, services] =
    await Promise.all([
      getActiveBanners(),
      getPortfolioItems(),
      getActiveClientLogos(),
      getFaqs(false),
      getStatistics(),
      getPublicServices(),
    ]);
  // Query failures propagate; no redundant full-table count probes are needed.
  return {
    config: validateWebsiteConfig(config),
    banners,
    portfolio,
    clients,
    faqs,
    stats,
    services,
  };
  }, "RepeatableRead");
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
  if (!preview || !content) throw new Error(serverMessages.websiteSetupIsIncompleteSaveAndPublish);
  return collectWebsiteDraft(validateWebsiteConfig(content.draft));
}

/** Snapshot sections an editor can change outside the Website page. */
export const WEBSITE_SNAPSHOT_SECTIONS = ["config", "banners", "portfolio", "clients", "faqs", "stats", "services"] as const;
export type WebsiteSnapshotSection = (typeof WEBSITE_SNAPSHOT_SECTIONS)[number];

// Postgres jsonb does not keep key order, so compare with keys sorted.
const stableJson = (value: unknown): string =>
  JSON.stringify(value, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
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
  if (!published) return { isPublished: false, changedSections: [...WEBSITE_SNAPSHOT_SECTIONS] };
  const draft = JSON.parse(JSON.stringify(await collectWebsiteDraft(validateWebsiteConfig(content.draft))));
  return {
    isPublished: true,
    changedSections: WEBSITE_SNAPSHOT_SECTIONS.filter(
      (section) => stableJson(draft[section] ?? null) !== stableJson(published[section] ?? null),
    ),
  };
}
