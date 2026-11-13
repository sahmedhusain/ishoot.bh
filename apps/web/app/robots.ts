import type { MetadataRoute } from "next";
import { publicSiteUrl } from "../lib/site-url";
export const dynamic = "force-dynamic";
export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = (await publicSiteUrl()).href.replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/*/unsubscribe"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
