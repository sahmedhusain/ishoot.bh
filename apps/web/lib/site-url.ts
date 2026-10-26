import { domainOrigin } from "@platform/database/constants/domains";
import { getPublicCompanySettings } from "./company";

/** Deployment URL takes precedence; then the website domain from the settings, then the company website field. */
export async function publicSiteUrl(): Promise<URL> {
  const company = await getPublicCompanySettings();
  const value =
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
  if (process.env.NODE_ENV !== "production")
    return new URL("http://localhost:3000");
  throw new Error("Public website URL is not configured");
}
