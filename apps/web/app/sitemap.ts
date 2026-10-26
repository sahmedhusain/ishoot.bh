export const dynamic = "force-dynamic";
import type { MetadataRoute } from "next";
import {
  getWebsiteSnapshot,
  getCompanySettings,
  isFeatureEnabled,
} from "@platform/database";
import { resolveWebsiteConfig } from "@platform/database/website-config";
import { publicSiteUrl } from "../lib/site-url";

/** Every public page, in the languages the company writes in, at the catalogue's own address. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (await publicSiteUrl()).href.replace(/\/$/, "");
  const [website, company, enabled] = await Promise.all([
    getWebsiteSnapshot(),
    getCompanySettings(),
    isFeatureEnabled("cms"),
  ]);
  if (!enabled) return [];
  const config = resolveWebsiteConfig(website.config);
  const builtIn = (type: string) =>
    website.pages?.find((page) => page.page_type === type);
  const visible = (id: string) =>
    (builtIn(id)?.is_visible ?? true) &&
    config.pages.find((page) => page.id === id)?.visible !== false;
  const catalogue = `/${config.collection.slug}`;
  const paths = [
    "",
    ...(visible("about") ? ["/about"] : []),
    ...(visible("contact") ? ["/contact"] : []),
    ...(visible("works")
      ? [
          catalogue,
          ...website.portfolio.map(
            (item) => `${catalogue}/${encodeURIComponent(item.slug)}`,
          ),
        ]
      : []),
    ...(website.pages ?? [])
      .filter((page) => page.page_type === "custom" && page.is_visible)
      .map((page) => `/${page.slug}`),
    ...(() => {
      const live = (website.articles ?? []).filter(
        (article) =>
          !article.publish_at || Date.parse(article.publish_at) <= Date.now(),
      );
      const base = `/${config.articles.slug}`;
      return live.length
        ? [
            base,
            ...live.map(
              (article) => `${base}/${encodeURIComponent(article.slug)}`,
            ),
          ]
        : [];
    })(),
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
