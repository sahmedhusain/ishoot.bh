import type { Metadata } from "next";
import { formatMessage } from "@platform/locales";
import { getCachedCompanySettings } from "./cached-queries";
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
