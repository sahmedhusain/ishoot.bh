// The website's domains and site-wide analytics and code. The system service owns them (backend/services/system) and
// IT changes them. Reads are cached briefly in each server process (SYSTEM_SITE_CACHE_MS, default 5 s), so a change made
// elsewhere reaches every server within that time; a change made here is seen at once.
import { getSite, setSiteDomains, type Site } from "@platform/api-client";
import { EMPTY_WEBSITE_CODE, type WebsiteCode } from "../website-config";

const cacheMs = () => {
  const n = Number(process.env.SYSTEM_SITE_CACHE_MS);
  return Number.isFinite(n) && n >= 0 ? n : 5000;
};
let cached: { until: number; site: Promise<Site> } | undefined;

/** The website's and the admin's domains (empty when unset) and the site-wide code. */
export function getSiteSettings(): Promise<Site> {
  const now = Date.now();
  if (!cached || now >= cached.until) {
    const pending = getSite();
    cached = { until: now + cacheMs(), site: pending };
    // A failed read is never cached.
    pending.catch(() => {
      if (cached?.site === pending) cached = undefined;
    });
  }
  return cached.site;
}

/** The site-wide analytics ids and custom code the public website runs. */
export async function getSiteCode(): Promise<WebsiteCode> {
  return { ...EMPTY_WEBSITE_CODE, ...(await getSiteSettings()).code };
}

/** Sets both domains for the person making the change (the setup wizard); an empty one is cleared. */
export async function saveSiteDomains(
  input: { websiteDomain: string; adminDomain: string },
  actorId: string,
) {
  const saved = await setSiteDomains(input, actorId);
  cached = undefined;
  return saved;
}
