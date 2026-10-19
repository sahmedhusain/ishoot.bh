export const dynamic = "force-dynamic";
import type { MetadataRoute } from "next";
import { getWebsiteSnapshot } from "@ishoot/database";
import { publicSiteUrl } from "../lib/site-url";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (await publicSiteUrl()).href.replace(/\/$/, "");
  const works = (await getWebsiteSnapshot()).portfolio;
  return [
    "",
    "/about",
    "/contact",
    "/works",
    ...works.map((work) => `/works/${encodeURIComponent(work.slug)}`),
  ].flatMap((path) =>
    ["en", "ar"].map((locale) => ({
      url: `${base}/${locale}${path}`,
      alternates: {
        languages: { en: `${base}/en${path}`, ar: `${base}/ar${path}` },
      },
    })),
  );
}
