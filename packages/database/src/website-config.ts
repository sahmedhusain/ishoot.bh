import { serverTemplates, formatMessage, serverMessages, getWebsiteTranslations } from "@platform/locales";

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

export interface WebsitePillar {titleEn:string;titleAr:string;textEn:string;textAr:string;}

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

export interface WebsiteSeo {
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
}

export interface WebsiteConfig {
  /** The company activity the website was set up for (website-presets.ts); media when missing. */
  purpose?: BusinessActivity;
  heroStyle?: HeroStyle;
  collection?: WebsiteCollection;
  inquiry?: InquiryOptions;
  seo?: WebsiteSeo;
  /** The studio equipment list on the About page. */
  showEquipment?: boolean;
  /** A floating WhatsApp button when the company has a WhatsApp number. */
  whatsappButton?: boolean;
  aboutImageUrl?: string;
  pillars?: WebsitePillar[];
  sections: { id: WebsiteSection; visible: boolean }[];
  pages?: { id: WebsitePage; visible: boolean }[];
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
  Required<Pick<WebsiteConfig, "purpose" | "heroStyle" | "collection" | "inquiry" | "seo" | "showEquipment" | "whatsappButton" | "pages">>;

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
export function collectionForActivity(activity: BusinessActivity): WebsiteCollection {
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
export function websiteConfigForActivity(activity: BusinessActivity, base: WebsiteConfig = defaultWebsiteConfig): WebsiteConfig {
  const preset = activityPreset(activity);
  const shown = new Set<WebsiteSection>(preset.sections);
  const order = [...preset.sections, ...websiteSections.filter((id) => !shown.has(id))];
  return {
    ...base,
    purpose: activity,
    heroStyle: preset.heroStyle,
    collection: collectionForActivity(activity),
    inquiry: { ...preset.inquiry },
    showEquipment: preset.showEquipment,
    whatsappButton: base.whatsappButton ?? true,
    sections: order.map((id) => ({ id, visible: shown.has(id) })),
    pages: websitePages.map((id) => ({ id, visible: preset.pages[id] })),
  };
}

/** Fills settings older drafts do not have from the preset of their activity (media when none is set). */
export function resolveWebsiteConfig(config: WebsiteConfig): ResolvedWebsiteConfig {
  const purpose = config.purpose ?? "media";
  const preset = activityPreset(purpose);
  return {
    ...config,
    purpose,
    heroStyle: config.heroStyle ?? preset.heroStyle,
    collection: config.collection ?? collectionForActivity(purpose),
    inquiry: config.inquiry ?? { ...preset.inquiry },
    seo: config.seo ?? { titleEn: "", titleAr: "", descriptionEn: "", descriptionAr: "" },
    showEquipment: config.showEquipment ?? preset.showEquipment,
    whatsappButton: config.whatsappButton ?? true,
    pages: config.pages ?? defaultWebsitePages,
  };
}

const COLLECTION_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function text(value: unknown, key: string, max: number) {
  if (typeof value !== "string" || value.length > max) throw new Error(formatMessage(serverTemplates.invalid0, { 0: key }));
  return value.trim();
}

function textGroup<K extends string>(value: unknown, keys: readonly K[], name: string, max: number): Record<K, string> {
  if (!value || typeof value !== "object") throw new Error(formatMessage(serverTemplates.invalid0, { 0: name }));
  const data = value as Record<string, unknown>;
  return Object.fromEntries(keys.map((key) => [key, text(data[key] ?? "", `${name}.${key}`, max)])) as Record<K, string>;
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

  const result = {
    sections: data.sections.map((s) => ({ id: s.id, visible: s.visible })),
    pages,
  } as WebsiteConfig;
  for (const key of Object.keys(websiteDefaultCopy) as (keyof typeof websiteDefaultCopy)[]) {
    if (typeof data[key] !== "string" || (data[key] as string).length > 1500)
      throw new Error(formatMessage(serverTemplates.invalid0, { 0: key }));
    result[key] = (data[key] as string).trim();
  }
  if (data.aboutImageUrl !== undefined) { if (typeof data.aboutImageUrl !== "string" || data.aboutImageUrl.length > 2000 || (data.aboutImageUrl && !safeWebsiteUrl(data.aboutImageUrl))) throw new Error(serverMessages.invalidAboutImage); result.aboutImageUrl = data.aboutImageUrl; }
  if (data.pillars !== undefined) {
    if(!Array.isArray(data.pillars) || data.pillars.length > 12) throw new Error(serverMessages.invalidStudioHistory);
    result.pillars = data.pillars.map((p:any) => { const entry = {} as WebsitePillar; for(const key of ["titleEn","titleAr","textEn","textAr"] as const){if(typeof p?.[key] !== "string" || p[key].length > 1500) throw new Error(serverMessages.invalidStudioHistoryText);entry[key]=p[key].trim();}return entry;});
  }
  if (data.purpose !== undefined) {
    if (!isBusinessActivity(data.purpose)) throw new Error(formatMessage(serverTemplates.invalid0, { 0: "purpose" }));
    result.purpose = data.purpose;
  }
  if (data.heroStyle !== undefined) {
    if (!HERO_STYLES.includes(data.heroStyle as HeroStyle)) throw new Error(formatMessage(serverTemplates.invalid0, { 0: "heroStyle" }));
    result.heroStyle = data.heroStyle as HeroStyle;
  }
  if (data.collection !== undefined) {
    const raw = data.collection as Record<string, unknown> | null;
    const names = textGroup(raw, ["navEn", "navAr", "titleEn", "titleAr", "subtitleEn", "subtitleAr"] as const, "collection", 300);
    const slug = text(raw?.slug, "collection.slug", 40).toLowerCase();
    if (!COLLECTION_SLUG.test(slug) || RESERVED_COLLECTION_SLUGS.includes(slug)) throw new Error(serverMessages.invalidCollectionAddress);
    if (!COLLECTION_LAYOUTS.includes(raw?.layout as CollectionLayout)) throw new Error(formatMessage(serverTemplates.invalid0, { 0: "collection.layout" }));
    if (!names.navEn || !names.navAr) throw new Error(serverMessages.collectionNameRequired);
    result.collection = { slug, layout: raw!.layout as CollectionLayout, ...names };
  }
  if (data.inquiry !== undefined) {
    const raw = (data.inquiry ?? {}) as Record<string, unknown>;
    const keys = ["budget", "timeline", "location", "reference"] as const;
    if (keys.some((key) => typeof raw[key] !== "boolean")) throw new Error(formatMessage(serverTemplates.invalid0, { 0: "inquiry" }));
    result.inquiry = Object.fromEntries(keys.map((key) => [key, raw[key]])) as unknown as InquiryOptions;
  }
  if (data.seo !== undefined) result.seo = textGroup(data.seo, ["titleEn", "titleAr", "descriptionEn", "descriptionAr"] as const, "seo", 300);
  for (const key of ["showEquipment", "whatsappButton"] as const) {
    if (data[key] === undefined) continue;
    if (typeof data[key] !== "boolean") throw new Error(formatMessage(serverTemplates.invalid0, { 0: key }));
    result[key] = data[key] as boolean;
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
