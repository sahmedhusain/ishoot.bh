import {
  getCurrencyDecimals,
  getCurrencyLabel,
} from "@platform/config/currency";
import type { WebsiteCopyOverlay } from "@platform/locales";
import type { ContentLanguage } from "@platform/database/constants/languages";
import type {
  BusinessActivity,
  HeroStyle,
  InquiryOptions,
} from "@platform/database/website-presets";
import type {
  WebsiteArticles,
  WebsiteCollection,
} from "@platform/database/website-config";

/** What every page needs to know about this company's website (from the published config and company settings). */
export interface SiteInfo {
  activity: BusinessActivity;
  languages: ContentLanguage[];
  primaryLanguage: ContentLanguage;
  collection: WebsiteCollection;
  articles: WebsiteArticles;
  heroStyle: HeroStyle;
  inquiry: InquiryOptions;
  whatsappButton: boolean;
  showEquipment: boolean;
  currency: string;
}

/** The company's own catalogue names, layered over the activity's wording. */
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

/** A catalogue price in the company currency, e.g. "BHD 12.500" / "12.500 د.ب". */
export function formatPrice(amount: number, currency: string, locale: string) {
  // Whole prices stay short (SAR 145); others show the currency's decimals (SAR 289.50, BHD 12.500).
  const decimals = getCurrencyDecimals(currency);
  const fraction = Number.isInteger(amount) ? 0 : decimals;
  const number = new Intl.NumberFormat(
    locale === "ar" ? "ar-u-nu-latn" : "en",
    { minimumFractionDigits: fraction, maximumFractionDigits: decimals },
  ).format(amount);
  const label = getCurrencyLabel(currency, locale === "ar", false);
  return locale === "ar" ? `${number} ${label}` : `${label} ${number}`;
}
