import { cache } from "react";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getWebsiteTranslations, type Locale } from "@platform/locales";
import { isFeatureEnabled } from "@platform/database";
import {
  defaultWebsiteConfig,
  resolveWebsiteConfig,
} from "@platform/database/website-config";
import { getPublicCompanySettings } from "./company";
import { getWebsite } from "./website";
import { siteCopyOverrides, type SiteInfo } from "./site-copy";

// Switching the website module off in the admin takes effect within a minute.
const websiteModuleEnabled = unstable_cache(
  () => isFeatureEnabled("cms"),
  ["website-module"],
  { revalidate: 60, tags: ["company", "website"] },
);

/** The company, its published website and the site profile every page renders from. */
export const getSite = cache(async () => {
  const [company, website, enabled] = await Promise.all([
    getPublicCompanySettings(),
    getWebsite().catch(() => null),
    websiteModuleEnabled().catch(() => true),
  ]);
  const config = resolveWebsiteConfig(website?.config ?? defaultWebsiteConfig);
  const info: SiteInfo = {
    activity: config.purpose,
    languages: company.content_languages,
    primaryLanguage: company.primary_language,
    collection: config.collection,
    articles: config.articles,
    heroStyle: config.heroStyle,
    inquiry: config.inquiry,
    whatsappButton: config.whatsappButton,
    showEquipment: config.showEquipment,
    currency: company.default_currency,
  };
  return { company, website, config, info, enabled };
});

/** Website copy for this company's activity and catalogue names. */
export async function siteTranslations(locale: string) {
  const { info } = await getSite();
  return getWebsiteTranslations(
    locale as Locale,
    info.activity,
    siteCopyOverrides(info, locale),
  );
}

/** A language the company does not write in is sent to the same page in its main language. */
export async function requireSiteLanguage(locale: string) {
  const { info } = await getSite();
  if ((info.languages as string[]).includes(locale)) return;
  const path = (await headers()).get("x-pathname") ?? `/${locale}`;
  redirect(
    path.replace(new RegExp(`^/${locale}(?=/|$)`), `/${info.primaryLanguage}`),
  );
}
