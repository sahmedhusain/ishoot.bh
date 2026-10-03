import { db } from "../db";
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
  const [banners, portfolio, clients, faqs, stats, services] =
    await Promise.all([
      getActiveBanners(),
      getPortfolioItems(),
      getActiveClientLogos(),
      getFaqs(false),
      getStatistics(),
      getPublicServices(),
    ]);
  // Failed source queries must not replace a live website with an empty snapshot.
  const [bannerCount, portfolioCount, clientCount, faqCount, statCount] =
    await Promise.all([
      db.heroBanner.count({ where: { isActive: true } }),
      db.portfolioItem.count(),
      db.clientLogo.count({ where: { isActive: true } }),
      db.faq.count({ where: { isPublished: true } }),
      db.statistic.count(),
    ]);
  if (
    [
      bannerCount !== banners.length,
      portfolioCount !== portfolio.length,
      clientCount !== clients.length,
      faqCount !== faqs.length,
      statCount !== stats.length,
    ].some(Boolean)
  )
    throw new Error("Content could not be loaded completely. Try again.");
  return {
    config: validateWebsiteConfig(config),
    banners,
    portfolio,
    clients,
    faqs,
    stats,
    services,
  };
}
export type WebsiteSnapshot = Awaited<ReturnType<typeof collectWebsiteDraft>>;
export async function getWebsiteEditor() {
  const existing = await db.websiteContent.findUnique({
    where: { id: "main" },
  });
  if (existing) return existing;
  const snapshot = await collectWebsiteDraft(defaultWebsiteConfig);
  return db.websiteContent.upsert({
    where: { id: "main" },
    update: {},
    create: {
      id: "main",
      draft: JSON.parse(JSON.stringify(defaultWebsiteConfig)),
      published: JSON.parse(JSON.stringify(snapshot)),
      publishedAt: new Date(),
    },
  });
}
export async function getWebsiteSnapshot(
  preview = false,
): Promise<WebsiteSnapshot> {
  const content = await db.websiteContent.findUnique({ where: { id: "main" } });
  if (!preview && content?.published)
    return content.published as unknown as WebsiteSnapshot;
  return collectWebsiteDraft(
    preview && content
      ? validateWebsiteConfig(content.draft)
      : defaultWebsiteConfig,
  );
}
