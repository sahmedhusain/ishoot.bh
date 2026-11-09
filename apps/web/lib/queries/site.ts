import { getSite, setSiteDomains, type Site } from "@platform/api-client";
import { EMPTY_WEBSITE_CODE, type WebsiteCode } from "../website-config";

const cacheMs = () => {
  const raw = process.env.SYSTEM_SITE_CACHE_MS;
  if (!raw) return 5000;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 5000;
};
let cached: { until: number; site: Promise<Site> } | undefined;

export function getSiteSettings(): Promise<Site> {
  const now = Date.now();
  if (!cached || now >= cached.until) {
    const pending = getSite();
    cached = { until: now + cacheMs(), site: pending };
    pending.catch(() => {
      if (cached?.site === pending) cached = undefined;
    });
  }
  return cached.site;
}

export async function getSiteCode(): Promise<WebsiteCode> {
  return { ...EMPTY_WEBSITE_CODE, ...(await getSiteSettings()).code };
}

export async function saveSiteDomains(
  input: { websiteDomain: string; adminDomain: string },
  actorId: string,
) {
  const saved = await setSiteDomains(input, actorId);
  cached = undefined;
  return saved;
}
