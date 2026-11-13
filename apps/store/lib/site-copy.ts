import {
  getCurrencyDecimals,
  getCurrencyLabel,
} from "@platform/config/currency";
import type { WebsiteCopyOverlay } from "@platform/locales";
import type { Locale } from "@platform/locales/registry";
import type {
  BusinessActivity,
  CollectionLayout,
  HeroStyle,
  InquiryOptions,
} from "@platform/database/website-presets";
import type {
  WebsiteArticles,
  WebsiteCollection,
} from "@platform/database/website-config";

export interface SiteInfo {
  activity: BusinessActivity;
  languages: Locale[];
  primaryLanguage: Locale;
  interfaceCopy?: Record<string, Record<string, unknown>>;
  collection: WebsiteCollection;
  articles: WebsiteArticles;
  heroStyle: HeroStyle;
  inquiry: InquiryOptions;
  whatsappButton: boolean;
  commerce?: import("@platform/database/constants/website-commerce").WebsiteCommerce;
  showEquipment: boolean;
  footerInvitation?: boolean;
  currency: string;
  companyNameEn?: string;
  companyNameAr?: string;
}

export function siteCopyOverrides(
  site: Pick<SiteInfo, "collection"> & Partial<Pick<SiteInfo, "articles">>,
  locale: string,
): WebsiteCopyOverlay {
  const ar = locale === "ar";
  const { collection } = site;
  return {
    nav: {
      works: ar ? collection.navAr : collection.navEn,
      ...(site.articles
        ? { articles: ar ? site.articles.navAr : site.articles.navEn }
        : {}),
    },
    portfolio: {
      title: ar ? collection.titleAr : collection.titleEn,
      subtitle: ar ? collection.subtitleAr : collection.subtitleEn,
    },
  };
}

export function collectionHref(
  site: Pick<SiteInfo, "collection">,
  locale: string,
  slug?: string,
) {
  return `/${locale}/${site.collection.slug}${slug ? `/${encodeURIComponent(slug)}` : ""}`;
}

export function formatPrice(amount: number, currency: string, locale: string) {
  const decimals = getCurrencyDecimals(currency);
  const fraction = Number.isInteger(amount) ? 0 : decimals;
  const number = new Intl.NumberFormat(
    locale === "ar" ? "ar-u-nu-latn" : "en",
    { minimumFractionDigits: fraction, maximumFractionDigits: decimals },
  ).format(amount);
  const label = getCurrencyLabel(currency, locale === "ar", false);
  return locale === "ar" ? `${number} ${label}` : `${label} ${number}`;
}

export function collectionGridClass(layout: CollectionLayout) {
  return layout === "product" || layout === "listing" ? "grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3" : "grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-2";
}
