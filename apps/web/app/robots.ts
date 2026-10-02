import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const base = (process.env.WEB_URL || "https://ishoot.bh").replace(/\/$/, "");
  return { rules: { userAgent: "*", allow: "/", disallow: "/api/" }, sitemap: `${base}/sitemap.xml` };
}
