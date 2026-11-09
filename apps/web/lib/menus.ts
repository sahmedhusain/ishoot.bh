import type { WebsiteSnapshot } from "@platform/database";
import type {
  ResolvedWebsiteConfig,
  WebsiteMenuItem,
} from "@platform/database/website-config";
import { getWebsiteTranslations, type Locale } from "@platform/locales";
import { collectionHref, siteCopyOverrides, type SiteInfo } from "./site-copy";

export interface MenuLink {
  id: string;
  href: string;
  label: string;
  external?: boolean;
}

const now = () => Date.now();

export function siteMenus(
  website: WebsiteSnapshot | null,
  config: ResolvedWebsiteConfig,
  info: SiteInfo,
  locale: string,
): { header: MenuLink[]; footer: MenuLink[] } | null {
  if (!website?.pages?.length) return null;
  const t = getWebsiteTranslations(
    locale as Locale,
    info.activity,
    siteCopyOverrides(info, locale),
  );
  const ar = locale === "ar";
  const visible = website.pages.filter((page) => page.is_visible);
  const pageLink = (id: string, label?: string): MenuLink | null => {
    const page = visible.find((p) => p.id === id);
    if (!page) return null;
    return {
      id: page.id,
      href: page.slug ? `/${locale}/${page.slug}` : `/${locale}`,
      label:
        label ||
        (ar ? page.title_ar || page.title_en : page.title_en || page.title_ar),
    };
  };
  const worksVisible =
    config.pages.find((page) => page.id === "works")?.visible !== false &&
    website.portfolio.length > 0;
  const hasArticles = (website.articles ?? []).some(
    (article) => !article.publish_at || Date.parse(article.publish_at) <= now(),
  );
  const catalogue = (label?: string): MenuLink => ({
    id: "catalogue",
    href: collectionHref(info, locale),
    label: label || t.nav.works,
  });
  const articles = (label?: string): MenuLink => ({
    id: "articles",
    href: `/${locale}/${info.articles.slug}`,
    label: label || t.nav.articles,
  });
  const home = website.pages.find((page) => page.page_type === "home");

  if (config.menus) {
    const build = (items: WebsiteMenuItem[]) =>
      items
        .map((item, index): MenuLink | null => {
          const label =
            (ar
              ? item.labelAr || item.labelEn
              : item.labelEn || item.labelAr) || undefined;
          if (item.kind === "page")
            return item.pageId ? pageLink(item.pageId, label) : null;
          if (item.kind === "catalogue")
            return worksVisible ? catalogue(label) : null;
          if (item.kind === "articles")
            return hasArticles ? articles(label) : null;
          return item.url && label
            ? {
                id: `external-${index}`,
                href: item.url,
                label,
                external: /^https?:/.test(item.url),
              }
            : null;
        })
        .filter((link): link is MenuLink => !!link);
    return {
      header: build(config.menus.header),
      footer: build(config.menus.footer),
    };
  }
  const start = home ? [pageLink(home.id, t.nav.home)!] : [];
  const extras = [
    ...(worksVisible ? [catalogue()] : []),
    ...(hasArticles ? [articles()] : []),
  ];
  const marked = (key: "in_header" | "in_footer") =>
    visible.filter((page) => page[key]).map((page) => pageLink(page.id)!);
  return {
    header: [...start, ...extras, ...marked("in_header")],
    footer: [...start, ...extras, ...marked("in_footer")],
  };
}
