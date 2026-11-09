import type { Metadata } from "next";
import { cookies } from "next/headers";
import { formatMessage, getAdminTranslations, isLocale } from "@platform/locales";
import { getCachedCompanySettings } from "./cached-queries";
import type { PageKey } from "./page-registry";
import { adminTranslations } from "./translations-bilingual";

export async function companyMetadata(pageTitle?: string): Promise<Metadata> {
  const copy = adminTranslations.ar.copy;
  const company = await getCachedCompanySettings().catch(() => null);
  const companyName = company?.company_name_ar || copy.genericCompany;
  return {
    title: pageTitle
      ? formatMessage(copy.pageTitle, { title: pageTitle, companyName })
      : formatMessage(copy.portalTitle, { companyName }),
    description: formatMessage(copy.portalDescription, { companyName }),
    ...(company?.icon_url ? { icons: { icon: company.icon_url } } : {}),
  };
}

export async function pageMetadata(page: PageKey): Promise<Metadata> {
  const company = await getCachedCompanySettings().catch(() => null);
  const saved = (await cookies()).get("platform_admin_locale")?.value;
  const locale = isLocale(saved) ? saved : company?.primary_language ?? "ar";
  const t = getAdminTranslations(locale, company?.business_activity);
  const companyName =
    (locale === "ar" ? company?.company_name_ar : company?.company_name_en) ||
    company?.company_name_en ||
    company?.company_name_ar ||
    t.copy.genericCompany;
  return {
    title: formatMessage(t.copy.pageTitle, { title: t.pages[(page || "home") as keyof typeof t.pages].title, companyName }),
    description: formatMessage(t.copy.portalDescription, { companyName }),
    ...(company?.icon_url ? { icons: { icon: company.icon_url } } : {}),
  };
}
