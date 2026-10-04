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
  if (!preview || !content) throw new Error("Website setup is incomplete. Save and publish website content in the admin app.");
  return collectWebsiteDraft(validateWebsiteConfig(content.draft));
}
