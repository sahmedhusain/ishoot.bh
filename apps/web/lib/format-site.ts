import type { HeroBanner, PortfolioItem } from "@platform/database/types";
import type { PublicService } from "@platform/database/website-config";

const DEFAULT_BANNER_MEDIA = [
  "/api/files/media/banners/banner-01.png",
  "/api/files/media/banners/banner-02.png",
  "/api/files/media/banners/banner-03.png",
];

/**
 * Resolve `{companyName}`, `{year}`, and `{currency}` placeholders in a template string
 * without touching plural/argument placeholders such as `{count}` or `{author}`.
 */
export function resolveCompanyPlaceholders(
  value: string,
  replacements: { companyName?: string; year?: string | number; currency?: string },
): string {
  if (!value || !value.includes("{")) return value;
  return value
    .replace(/\{companyName\}/g, replacements.companyName ?? "")
    .replace(/\{year\}/g, replacements.year != null ? String(replacements.year) : String(new Date().getFullYear()))
    .replace(/\{currency\}/g, replacements.currency ?? "USD")
    .replace(/\.{2}(?!\.)/g, ".");
}

/**
 * Recursively resolve common corporate placeholders inside translation objects
 * while leaving item-specific templates like `{count}` intact.
 */
export function resolveTranslationsTree<T>(
  input: T,
  replacements: { companyName?: string; year?: string | number; currency?: string },
): T {
  if (typeof input === "string") {
    return resolveCompanyPlaceholders(input, replacements) as unknown as T;
  }
  if (Array.isArray(input)) {
    return input.map((item) => resolveTranslationsTree(item, replacements)) as unknown as T;
  }
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      out[k] = resolveTranslationsTree(v, replacements);
    }
    return out as T;
  }
  return input;
}

/**
 * Format singular/plural search & filter result counts cleanly in EN & AR.
 */
export function formatResultCount(
  count: number,
  locale: string,
  pluralTemplate?: string,
): string {
  if (locale === "ar") {
    if (count === 1) return "نتيجة واحدة";
    if (count === 2) return "نتيجتان";
    return (pluralTemplate || "{count} نتيجة").replace(/\{count\}/g, String(count));
  }
  if (count === 1) return "1 result";
  return (pluralTemplate || "{count} results").replace(/\{count\}/g, String(count));
}

/**
 * Remove duplicate trailing sentence punctuation after company legal suffixes like W.L.L.
 */
export function cleanSentenceEnd(text: string): string {
  return text.replace(/\.{2}(?!\.)/g, ".").trim();
}

/**
 * Deterministic corporate banner image URL fallback when a portfolio item or banner
 * has no custom image URL.
 */
export function fallbackBannerMediaUrl(index = 0): string {
  const safe = Math.abs(index) % DEFAULT_BANNER_MEDIA.length;
  return DEFAULT_BANNER_MEDIA[safe];
}

/**
 * Synthesize high-impact fallback hero slides when `cms.hero_banner` is empty
 * by drawing from live services, portfolio items, and company metadata.
 */
export function synthesizeHeroBanners({
  banners,
  companyNameEn,
  companyNameAr,
  taglineEn,
  taglineAr,
  services,
  portfolio,
  collectionSlug,
}: {
  banners?: HeroBanner[] | null;
  companyNameEn: string;
  companyNameAr?: string;
  taglineEn?: string;
  taglineAr?: string;
  services?: PublicService[];
  portfolio?: PortfolioItem[];
  collectionSlug: string;
}): HeroBanner[] {
  const active = (banners ?? []).filter((b) => b && (b.is_active ?? true));
  if (active.length > 0) {
    return active.map((b, i) => ({
      ...b,
      media_url: b.media_url || fallbackBannerMediaUrl(i),
      poster_url: b.poster_url || b.media_url || fallbackBannerMediaUrl(i),
    }));
  }

  const derived: HeroBanner[] = [];
  const svcList = services ?? [];
  for (let i = 0; i < Math.min(3, svcList.length); i++) {
    const svc = svcList[i];
    derived.push({
      id: `synth-svc-${svc.id || i}`,
      title_en: svc.nameEn || companyNameEn,
      title_ar: svc.nameAr || companyNameAr || companyNameEn,
      subtitle_en: svc.descriptionEn || taglineEn || companyNameEn,
      subtitle_ar: svc.descriptionAr || taglineAr || companyNameAr || companyNameEn,
      media_type: "image",
      media_url: svc.imageUrl || fallbackBannerMediaUrl(i),
      poster_url: svc.imageUrl || fallbackBannerMediaUrl(i),
      cta_label_en: "Request Executive Consultation",
      cta_label_ar: "اطلب استشارة تنفيذية",
      cta_link: "/contact?intent=quote_request",
      display_order: i + 1,
      is_active: true,
      created_at: "",
    });
  }

  if (derived.length === 0) {
    const portList = portfolio ?? [];
    for (let i = 0; i < Math.min(3, Math.max(1, portList.length)); i++) {
      const item = portList[i];
      derived.push({
        id: `synth-hero-${i + 1}`,
        title_en: item?.title_en || companyNameEn,
        title_ar: item?.title_ar || companyNameAr || companyNameEn,
        subtitle_en: item?.subtitle_en || taglineEn || "",
        subtitle_ar: item?.subtitle_ar || taglineAr || "",
        media_type: "image",
        media_url: item?.thumbnail_url || fallbackBannerMediaUrl(i),
        poster_url: item?.thumbnail_url || fallbackBannerMediaUrl(i),
        cta_label_en: "Explore Our Work",
        cta_label_ar: "استعرض أبرز الأعمال",
        cta_link: `/${collectionSlug}`,
        display_order: i + 1,
        is_active: true,
        created_at: "",
      });
    }
  }

  return derived;
}
