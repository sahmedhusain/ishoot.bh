import type { MetadataRoute } from "next";
import { publicSiteUrl } from "../lib/site-url";
export const dynamic = "force-dynamic";
export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = (await publicSiteUrl()).href.replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", ...["cart", "checkout", "account", "pay", "track", "unsubscribe"].map((page) => `/*/${page}`)],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
