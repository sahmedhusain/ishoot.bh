import type { MetadataRoute } from "next";
import { getSite } from "../lib/site";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { company, info } = await getSite();
  const name =
    info.primaryLanguage === "ar"
      ? company.company_name_ar || company.company_name_en
      : company.company_name_en;
  return {
    id: "/",
    name,
    short_name: name,
    start_url: `/${info.primaryLanguage}`,
    scope: "/",
    display: "browser",
    lang: info.primaryLanguage,
    theme_color: company.theme.primary,
    icons: company.icon_url ? [{ src: company.icon_url, sizes: "any" }] : [],
  };
}
