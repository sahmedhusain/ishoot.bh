import { deepMerge } from "@platform/locales/merge";
import { normalizeTheme } from "@platform/database/constants/theme";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { isLocale, getWebsiteTranslations, type Locale } from "@platform/locales";
import { isFeatureEnabled } from "@platform/database";
import {
  defaultWebsiteConfig,
  resolveWebsiteConfig,
} from "@platform/database/website-config";
import { getPublicCompanySettings } from "./company";
import { getWebsite } from "./website";
import { siteCopyOverrides, type SiteInfo } from "./site-copy";

const websiteModuleEnabled = unstable_cache(
  () => isFeatureEnabled("cms"),
  ["website-module"],
  { revalidate: 60, tags: ["company", "website"] },
);

export const getSite = cache(async () => {
  const [settings, website, enabled] = await Promise.all([
    getPublicCompanySettings(),
    getWebsite().catch(() => null),
    websiteModuleEnabled().catch(() => false),
  ]);
  const company = { ...settings, ...(website?.brandAssets ?? {}), theme: website?.brandTheme ? normalizeTheme(website.brandTheme) : settings.theme };
  const config = resolveWebsiteConfig(website?.config ?? defaultWebsiteConfig, company.theme.websiteMode);
  const languages = config.interfaceLanguages?.filter(isLocale).length ? config.interfaceLanguages.filter(isLocale) : company.content_languages;
  const preferred = config.primaryInterfaceLanguage ?? company.primary_language;
  const primaryLanguage = isLocale(preferred) && languages.includes(preferred as never) ? preferred : languages[0];
  const info: SiteInfo = {
    activity: config.purpose,
    languages,
    primaryLanguage,
    interfaceCopy: config.interfaceCopy,
    collection: config.collection,
    articles: config.articles,
    heroStyle: config.heroStyle,
    inquiry: config.inquiry,
    whatsappButton: false,
    commerce: config.commerce,
    showEquipment: config.showEquipment,
    footerInvitation: config.sections.find(section => section.id === "cta")?.visible ?? true,
    currency: company.default_currency,
    companyNameEn: company.company_name_en,
    companyNameAr: company.company_name_ar,
  };
  return { company, website, config, info, enabled };
});

export async function siteTranslations(locale: string) {
  const { info } = await getSite();
  return getWebsiteTranslations(
    locale as Locale,
    info.activity,
    deepMerge(siteCopyOverrides(info, locale), info.interfaceCopy?.[locale] as never),
  );
}

export async function requireSiteLanguage(locale: string) {
  const { info } = await getSite();
  if ((info.languages as string[]).includes(locale)) return;
  const path = (await headers()).get("x-pathname") ?? `/${locale}`;
  redirect(
    path.replace(new RegExp(`^/${locale}(?=/|$)`), `/${info.primaryLanguage}`),
  );
}
