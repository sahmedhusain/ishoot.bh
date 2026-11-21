export const dynamic = "force-dynamic";
import type { MetadataRoute } from "next";
import {
  getWebsiteSnapshot,
  getCompanySettings,
  isFeatureEnabled,
} from "@platform/database";
import { getStoreCatalog } from "@platform/database/queries/store";
import { resolveWebsiteConfig } from "@platform/database/website-config";
import { publicSiteUrl } from "../lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (await publicSiteUrl()).href.replace(/\/$/, "");
  const [website, company, storeFeature] = await Promise.all([
    getWebsiteSnapshot(),
    getCompanySettings(),
    isFeatureEnabled("store"),
  ]);
  const config = resolveWebsiteConfig(website.config);
  if (!storeFeature || !config.commerce.capabilities.shop) return [];
  const { items, categories } = await getStoreCatalog(
    website.portfolio ?? [],
    website.categories ?? [],
  );
  const paths = [
    "",
    "/products",
    "/offers",
    "/branches",
    ...categories
      .filter((category) => category.slug)
      .map((category) => `/categories/${encodeURIComponent(category.slug)}`),
    ...items
      .filter((item) => item.slug)
      .map((item) => `/products/${encodeURIComponent(item.slug)}`),
  ];
  const languages = company.content_languages;
  return paths.flatMap((path) =>
    languages.map((locale) => ({
      url: `${base}/${locale}${path}`,
      alternates: {
        languages: Object.fromEntries(
          languages.map((language) => [language, `${base}/${language}${path}`]),
        ),
      },
    })),
  );
}
