import { domainOrigin } from "@platform/database/constants/domains";
import { getPublicCompanySettings } from "./company";

export async function publicSiteUrl(): Promise<URL> {
  const company = await getPublicCompanySettings();
  const storeDomain = (company as { store_domain?: string | null }).store_domain;
  const value =
    process.env.STORE_URL ||
    process.env.NEXT_PUBLIC_STORE_URL ||
    domainOrigin(storeDomain) ||
    process.env.WEB_URL ||
    domainOrigin(company.website_domain) ||
    company.website;
  if (value) {
    const url = new URL(value);
    if (
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    )
      return url;
  }
  if (
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PHASE === "phase-production-build"
  )
    return new URL("http://localhost:3003");
  throw new Error("Public store URL is not configured");
}

export const publicStoreUrl = publicSiteUrl;
