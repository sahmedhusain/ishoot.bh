import { isLocale } from "@platform/locales/registry";
import { validateWebsitePromotions, type WebsitePromotion } from "./constants/website-promotions";
import { validateWebsiteDocuments, type WebsiteDocument } from "./constants/website-documents";
import { defaultWebsiteCommerce, validateWebsiteCommerce, type WebsiteCommerce } from "./constants/website-commerce";
import { defaultWebsiteDesign, validateWebsiteDesign, type WebsiteDesign } from "./constants/website-design";
import {
  serverTemplates,
  formatMessage,
  serverMessages,
  getWebsiteTranslations,
} from "@platform/locales";

import websiteDefaultCopy from "./website-default-copy.json";
import {
  COLLECTION_LAYOUTS,
  HERO_STYLES,
  RESERVED_COLLECTION_SLUGS,
  activityPreset,
  isBusinessActivity,
  type BusinessActivity,
  type CollectionLayout,
  type HeroStyle,
  type InquiryOptions,
} from "./website-presets";

export const websiteSections = [
  "about",
  "clients",
  "services",
  "portfolio",
  "stats",
  "reviews",
  "faq",
  "cta",
] as const;
export type WebsiteSection = (typeof websiteSections)[number];

export const websitePages = ["works", "about", "contact"] as const;
export type WebsitePage = (typeof websitePages)[number];

export interface WebsitePillar {
  titleEn: string;
  titleAr: string;
  textEn: string;
  textAr: string;
}

/** The website's catalogue (projects, products, menu…): its route, card layout and names. */
export interface WebsiteCollection {
  slug: string;
  layout: CollectionLayout;
  navEn: string;
  navAr: string;
  titleEn: string;
  titleAr: string;
  subtitleEn: string;
  subtitleAr: string;
}

/** Where the website lists articles ("news", "blog", "updates"…) and what the menu calls them. */
export interface WebsiteArticles {
  slug: string;
  navEn: string;
  navAr: string;
}

/** One menu link: a page (by id), the catalogue, the articles list, or another website. */
export interface WebsiteMenuItem {
  kind: "page" | "catalogue" | "articles" | "external";
  pageId?: string;
  url?: string;
  /** The company's own wording; empty uses the page's or section's name. */
  labelEn: string;
  labelAr: string;
}

export interface WebsiteMenus {
  header: WebsiteMenuItem[];
  footer: WebsiteMenuItem[];
}

/**
 * Site-wide tracking and code. Analytics are known tags filled from an id (run on the page, built by the website);
 * free-form code runs in a hidden sandboxed frame, like custom-code blocks (docs/SECURITY.md).
 */
export interface WebsiteCode {
  googleAnalyticsId: string;
  metaPixelId: string;
  tiktokPixelId: string;
  headHtml: string;
  bodyHtml: string;
}

export interface WebsiteSeo {
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
}

export interface WebsiteConfig {
  /** The company activity the website was set up for (website-presets.ts); neutral when missing. */
  purpose?: BusinessActivity;
  interfaceLanguages?: string[];
  primaryInterfaceLanguage?: string;
  interfaceCopy?: Record<string, Record<string, unknown>>;
  heroStyle?: HeroStyle;
  collection?: WebsiteCollection;
  inquiry?: InquiryOptions;
  seo?: WebsiteSeo;
  /** The company's equipment list on the About page. */
  showEquipment?: boolean;
  /** Retired; legacy snapshots may contain it, but it always resolves to false. */
  whatsappButton?: boolean;
  design?: WebsiteDesign;
  commerce?: WebsiteCommerce;
  documents?: WebsiteDocument[];
  promotions?: WebsitePromotion[];
  aboutImageUrl?: string;
  pillars?: WebsitePillar[];
  sections: { id: WebsiteSection; visible: boolean }[];
  pages?: { id: WebsitePage; visible: boolean }[];
  articles?: WebsiteArticles;
  /** Missing: built from the pages' header and footer flags. */
  menus?: WebsiteMenus;
  code?: WebsiteCode;
  contactTitleEn: string;
  contactTitleAr: string;
  contactIntroEn: string;
  contactIntroAr: string;
  hoursEn: string;
  hoursAr: string;
  responseEn: string;
  responseAr: string;
}

/** A website config with every optional setting filled in, as the public website reads it. */
export type ResolvedWebsiteConfig = WebsiteConfig &
  Required<
    Pick<
      WebsiteConfig,
      | "design"
      | "commerce"
      | "purpose"
      | "heroStyle"
      | "collection"
      | "inquiry"
      | "seo"
      | "showEquipment"
      | "whatsappButton"
      | "pages"
      | "articles"
      | "code"
    >
  >;

export const EMPTY_WEBSITE_CODE: WebsiteCode = {
  googleAnalyticsId: "",
  metaPixelId: "",
  tiktokPixelId: "",
  headHtml: "",
  bodyHtml: "",
};

/** The articles address an activity starts with, named from the website copy. */
export function articlesForActivity(
  activity: BusinessActivity,
): WebsiteArticles {
  const en = getWebsiteTranslations("en", activity);
  const ar = getWebsiteTranslations("ar", activity);
  return {
    slug: en.articles.slug,
    navEn: en.nav.articles,
    navAr: ar.nav.articles,
  };
}

export const defaultWebsitePages: { id: WebsitePage; visible: boolean }[] = [
  { id: "works", visible: true },
  { id: "about", visible: true },
  { id: "contact", visible: true },
];
export const defaultWebsiteConfig: WebsiteConfig = {
  sections: websiteSections.map((id) => ({ id, visible: true })),
  pages: defaultWebsitePages,
  ...websiteDefaultCopy,
};

/** The catalogue names an activity's website starts with, in both languages. */
export function collectionForActivity(
  activity: BusinessActivity,
): WebsiteCollection {
  const preset = activityPreset(activity);
  const en = getWebsiteTranslations("en", activity);
  const ar = getWebsiteTranslations("ar", activity);
  return {
    slug: preset.collection.slug,
    layout: preset.collection.layout,
    navEn: en.nav.works,
    navAr: ar.nav.works,
    titleEn: en.portfolio.title,
    titleAr: ar.portfolio.title,
    subtitleEn: en.portfolio.subtitle,
    subtitleAr: ar.portfolio.subtitle,
  };
}

/** The recommended website for an activity: pages, section order, catalogue, hero and enquiry questions. */
export function websiteConfigForActivity(
  activity: BusinessActivity,
  base: WebsiteConfig = defaultWebsiteConfig,
): WebsiteConfig {
  const preset = activityPreset(activity);
  const shown = new Set<WebsiteSection>(preset.sections);
  const order = [
    ...preset.sections,
    ...websiteSections.filter((id) => !shown.has(id)),
  ];
  return {
    ...base,
    purpose: activity,
    heroStyle: preset.heroStyle,
    collection: collectionForActivity(activity),
    inquiry: { ...preset.inquiry },
    showEquipment: preset.showEquipment,
    whatsappButton: false,
    sections: order.map((id) => ({ id, visible: shown.has(id) })),
    pages: websitePages.map((id) => ({ id, visible: preset.pages[id] })),
  };
}

/** Fills settings older drafts do not have from the preset of their activity (neutral when none is set). */
export function resolveWebsiteConfig(
  config: WebsiteConfig,
  legacyMode: "light" | "dark" = "dark",
): ResolvedWebsiteConfig {
  const purpose = config.purpose ?? "other";
  const preset = activityPreset(purpose);
  return {
    ...config,
    purpose,
    heroStyle: config.heroStyle ?? preset.heroStyle,
    collection: config.collection ?? collectionForActivity(purpose),
    inquiry: config.inquiry ?? { ...preset.inquiry },
    seo: config.seo ?? {
      titleEn: "",
      titleAr: "",
      descriptionEn: "",
      descriptionAr: "",
    },
    showEquipment: config.showEquipment ?? preset.showEquipment,
    whatsappButton: false,
    design: config.design ?? defaultWebsiteDesign(legacyMode),
    commerce: config.commerce ?? defaultWebsiteCommerce(),
    pages: config.pages ?? defaultWebsitePages,
    articles: config.articles ?? articlesForActivity(purpose),
    code: config.code ?? EMPTY_WEBSITE_CODE,
  };
}

const COLLECTION_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function text(value: unknown, key: string, max: number) {
  if (typeof value !== "string" || value.length > max)
    throw new Error(formatMessage(serverTemplates.invalid0, { 0: key }));
  return value.trim();
}

function textGroup<K extends string>(
  value: unknown,
  keys: readonly K[],
  name: string,
  max: number,
): Record<K, string> {
  if (!value || typeof value !== "object")
    throw new Error(formatMessage(serverTemplates.invalid0, { 0: name }));
  const data = value as Record<string, unknown>;
  return Object.fromEntries(
    keys.map((key) => [key, text(data[key] ?? "", `${name}.${key}`, max)]),
  ) as Record<K, string>;
}

export function validateWebsiteConfig(value: unknown): WebsiteConfig {
  if (!value || typeof value !== "object")
    throw new Error(serverMessages.invalidWebsiteContent);
  const data = value as Record<string, unknown>;
  if (
    !Array.isArray(data.sections) ||
    data.sections.length !== websiteSections.length ||
    data.sections.some((s) => !s || typeof s !== "object") ||
    new Set(data.sections.map((s) => s.id)).size !== websiteSections.length ||
    data.sections.some(
      (s) => !websiteSections.includes(s.id) || typeof s.visible !== "boolean",
    )
  )
    throw new Error(serverMessages.invalidSectionOrder);

  const defaultPages: { id: WebsitePage; visible: boolean }[] = [
    { id: "works", visible: true },
    { id: "about", visible: true },
    { id: "contact", visible: true },
  ];

  let pages = defaultPages;
  if (Array.isArray(data.pages)) {
    pages = defaultPages.map((dp) => {
      const found = (
        data.pages as Array<{ id?: unknown; visible?: unknown }>
      ).find((p) => p && p.id === dp.id);
      return {
        id: dp.id,
        visible: typeof found?.visible === "boolean" ? found.visible : true,
      };
    });
  }

  if (data.interfaceLanguages !== undefined && (!Array.isArray(data.interfaceLanguages) || !data.interfaceLanguages.length || data.interfaceLanguages.some((language) => !isLocale(language)) || new Set(data.interfaceLanguages).size !== data.interfaceLanguages.length)) throw new Error(serverMessages.contentLanguagesInvalid);
  if (data.primaryInterfaceLanguage !== undefined && (!isLocale(data.primaryInterfaceLanguage) || !(data.interfaceLanguages as string[] | undefined)?.includes(data.primaryInterfaceLanguage))) throw new Error(serverMessages.contentLanguagesInvalid);
  const interfaceCopy: Record<string, Record<string, unknown>> = {};
  if (data.interfaceCopy !== undefined) {
    if (!data.interfaceCopy || typeof data.interfaceCopy !== "object" || Array.isArray(data.interfaceCopy)) throw new Error(serverMessages.invalidWebsiteContent);
    const validateCopy = (node: unknown, reference: unknown): boolean => {
      if (typeof reference === "string") return typeof node === "string" && node.length <= 1500;
      if (Array.isArray(reference)) return Array.isArray(node) && node.length <= 100 && node.every((entry) => typeof entry === "string" && entry.length <= 1500);
      return !!node && typeof node === "object" && !Array.isArray(node) && Object.entries(node).every(([key, child]) => !["__proto__", "prototype", "constructor", "admin"].includes(key) && !!reference && typeof reference === "object" && Object.prototype.hasOwnProperty.call(reference, key) && validateCopy(child, (reference as Record<string, unknown>)[key]));
    };
    const reference = getWebsiteTranslations("en");
    for (const [language, copy] of Object.entries(data.interfaceCopy)) {
      if (!isLocale(language) || !validateCopy(copy, reference)) throw new Error(serverMessages.invalidWebsiteContent);
      interfaceCopy[language] = copy as Record<string, unknown>;
    }
  }
  const result = {
    sections: data.sections.map((s) => ({ id: s.id, visible: s.visible })),
    pages,
    ...(data.interfaceLanguages !== undefined ? { interfaceLanguages: data.interfaceLanguages as string[] } : {}),
    ...(data.primaryInterfaceLanguage !== undefined ? { primaryInterfaceLanguage: data.primaryInterfaceLanguage as string } : {}),
    ...(data.interfaceCopy !== undefined ? { interfaceCopy } : {}),
  } as WebsiteConfig;
  for (const key of Object.keys(
    websiteDefaultCopy,
  ) as (keyof typeof websiteDefaultCopy)[]) {
    if (typeof data[key] !== "string" || (data[key] as string).length > 1500)
      throw new Error(formatMessage(serverTemplates.invalid0, { 0: key }));
    result[key] = (data[key] as string).trim();
  }
  if (data.aboutImageUrl !== undefined) {
    if (
      typeof data.aboutImageUrl !== "string" ||
      data.aboutImageUrl.length > 2000 ||
      (data.aboutImageUrl && !safeWebsiteUrl(data.aboutImageUrl))
    )
      throw new Error(serverMessages.invalidAboutImage);
    result.aboutImageUrl = data.aboutImageUrl;
  }
  if (data.pillars !== undefined) {
    if (!Array.isArray(data.pillars) || data.pillars.length > 12)
      throw new Error(serverMessages.invalidStudioHistory);
    result.pillars = data.pillars.map((p: any) => {
      const entry = {} as WebsitePillar;
      for (const key of ["titleEn", "titleAr", "textEn", "textAr"] as const) {
        if (typeof p?.[key] !== "string" || p[key].length > 1500)
          throw new Error(serverMessages.invalidStudioHistoryText);
        entry[key] = p[key].trim();
      }
      return entry;
    });
  }
  if (data.purpose !== undefined) {
    if (!isBusinessActivity(data.purpose))
      throw new Error(
        formatMessage(serverTemplates.invalid0, { 0: "purpose" }),
      );
    result.purpose = data.purpose;
  }
  if (data.heroStyle !== undefined) {
    if (!HERO_STYLES.includes(data.heroStyle as HeroStyle))
      throw new Error(
        formatMessage(serverTemplates.invalid0, { 0: "heroStyle" }),
      );
    result.heroStyle = data.heroStyle as HeroStyle;
  }
  if (data.collection !== undefined) {
    const raw = data.collection as Record<string, unknown> | null;
    const names = textGroup(
      raw,
      [
        "navEn",
        "navAr",
        "titleEn",
        "titleAr",
        "subtitleEn",
        "subtitleAr",
      ] as const,
      "collection",
      300,
    );
    const slug = text(raw?.slug, "collection.slug", 40).toLowerCase();
    if (!COLLECTION_SLUG.test(slug) || RESERVED_COLLECTION_SLUGS.includes(slug))
      throw new Error(serverMessages.invalidCollectionAddress);
    if (!COLLECTION_LAYOUTS.includes(raw?.layout as CollectionLayout))
      throw new Error(
        formatMessage(serverTemplates.invalid0, { 0: "collection.layout" }),
      );
    if (!names.navEn || !names.navAr)
      throw new Error(serverMessages.collectionNameRequired);
    result.collection = {
      slug,
      layout: raw!.layout as CollectionLayout,
      ...names,
    };
  }
  if (data.inquiry !== undefined) {
    const raw = (data.inquiry ?? {}) as Record<string, unknown>;
    const keys = ["budget", "timeline", "location", "reference"] as const;
    if (keys.some((key) => typeof raw[key] !== "boolean"))
      throw new Error(
        formatMessage(serverTemplates.invalid0, { 0: "inquiry" }),
      );
    result.inquiry = Object.fromEntries(
      keys.map((key) => [key, raw[key]]),
    ) as unknown as InquiryOptions;
  }
  if (data.seo !== undefined)
    result.seo = textGroup(
      data.seo,
      ["titleEn", "titleAr", "descriptionEn", "descriptionAr"] as const,
      "seo",
      300,
    );
  if (data.promotions !== undefined) result.promotions = validateWebsitePromotions(data.promotions);
  if (data.documents !== undefined) result.documents = validateWebsiteDocuments(data.documents);
  if (data.commerce !== undefined) result.commerce = validateWebsiteCommerce(data.commerce);
  if (data.design !== undefined) result.design = validateWebsiteDesign(data.design);
  if (data.whatsappButton !== undefined) result.whatsappButton = false;
  for (const key of ["showEquipment"] as const) {
    if (data[key] === undefined) continue;
    if (typeof data[key] !== "boolean")
      throw new Error(formatMessage(serverTemplates.invalid0, { 0: key }));
    result[key] = data[key] as boolean;
  }
  if (data.articles !== undefined) {
    const raw = data.articles as Record<string, unknown> | null;
    const names = textGroup(raw, ["navEn", "navAr"] as const, "articles", 120);
    const slug = text(raw?.slug, "articles.slug", 40).toLowerCase();
    if (
      !COLLECTION_SLUG.test(slug) ||
      RESERVED_COLLECTION_SLUGS.includes(slug) ||
      slug === result.collection?.slug
    )
      throw new Error(serverMessages.invalidCollectionAddress);
    result.articles = { slug, ...names };
  }
  if (data.menus !== undefined) {
    const raw = (data.menus ?? {}) as Record<string, unknown>;
    const menu = (value: unknown): WebsiteMenuItem[] => {
      if (!Array.isArray(value) || value.length > 20)
        throw new Error(
          formatMessage(serverTemplates.invalid0, { 0: "menus" }),
        );
      return value.map((item) => {
        const entry = (item ?? {}) as Record<string, unknown>;
        const kind = entry.kind as WebsiteMenuItem["kind"];
        if (!["page", "catalogue", "articles", "external"].includes(kind))
          throw new Error(
            formatMessage(serverTemplates.invalid0, { 0: "menus" }),
          );
        const labels = textGroup(
          entry,
          ["labelEn", "labelAr"] as const,
          "menus",
          80,
        );
        if (kind === "page")
          return {
            kind,
            pageId: text(entry.pageId, "menus.pageId", 60),
            ...labels,
          };
        if (kind === "external") {
          const url = safeWebsiteUrl(text(entry.url, "menus.url", 500));
          if (!url || !(labels.labelEn || labels.labelAr))
            throw new Error(
              formatMessage(serverTemplates.invalid0, { 0: "menus" }),
            );
          return { kind, url, ...labels };
        }
        return { kind, ...labels };
      });
    };
    result.menus = { header: menu(raw.header), footer: menu(raw.footer) };
  }
  if (data.code !== undefined) {
    const raw = (data.code ?? {}) as Record<string, unknown>;
    const id = (key: string, pattern: RegExp) => {
      const value = text(raw[key] ?? "", `code.${key}`, 40);
      if (value && !pattern.test(value))
        throw new Error(formatMessage(serverTemplates.invalid0, { 0: key }));
      return value;
    };
    result.code = {
      googleAnalyticsId: id("googleAnalyticsId", /^G-[A-Z0-9]{4,20}$/),
      metaPixelId: id("metaPixelId", /^\d{6,20}$/),
      tiktokPixelId: id("tiktokPixelId", /^[A-Z0-9]{8,30}$/),
      headHtml:
        typeof raw.headHtml === "string" ? raw.headHtml.slice(0, 50_000) : "",
      bodyHtml:
        typeof raw.bodyHtml === "string" ? raw.bodyHtml.slice(0, 50_000) : "",
    };
  }
  if (data.design !== undefined) {
    result.design = validateWebsiteDesign(data.design);
  }
  if (data.commerce !== undefined) {
    result.commerce = validateWebsiteCommerce(data.commerce);
  }
  if (data.promotions !== undefined) {
    result.promotions = validateWebsitePromotions(data.promotions);
  }
  if (data.documents !== undefined) {
    result.documents = validateWebsiteDocuments(data.documents);
  }
  if (!result.contactTitleEn || !result.contactTitleAr)
    throw new Error(serverMessages.contactTitlesAreRequiredInBothLanguages);
  return result;
}
export interface PublicService {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  imageUrl: string | null;
}
export function safeWebsiteUrl(value: string, fallback = ""): string {
  if (value.startsWith("/") && !value.startsWith("//") && !/[\\\s]/.test(value))
    return value;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") return url.href;
  } catch {}
  return fallback;
}
