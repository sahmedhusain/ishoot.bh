import { describe, expect, test } from "vitest";
import {
  getTranslations,
  getWebsiteTranslations,
  websiteActivityCopy,
} from "@platform/locales";
import {
  mirrorBilingual,
  normalizeLanguages,
  normalizePrimaryLanguage,
  pickText,
} from "@platform/database/constants/languages";
import { STYLE_PRESETS } from "@platform/database/constants/theme";
import { DEFAULT_FEATURE_MODULES } from "@platform/database/constants/features";
import {
  ACTIVITY_PRESETS,
  BUSINESS_ACTIVITIES,
  RESERVED_COLLECTION_SLUGS,
} from "@platform/database/website-presets";
import {
  defaultWebsiteConfig,
  resolveWebsiteConfig,
  validateWebsiteConfig,
  websiteConfigForActivity,
  websiteSections,
} from "@platform/database/website-config";
import {
  collectionHref,
  formatPrice,
  siteCopyOverrides,
} from "../../lib/site-copy";

describe("content languages", () => {
  test("languages are normalised to a non-empty canonical list", () => {
    expect(normalizeLanguages(["en", "en", "fr"])).toEqual(["en"]);
    expect(normalizeLanguages(["en", "ar"])).toEqual(["ar", "en"]);
    expect(normalizeLanguages([])).toEqual(["ar", "en"]);
    expect(normalizeLanguages("ar")).toEqual(["ar", "en"]);
    expect(normalizePrimaryLanguage("ar", ["en"])).toBe("en");
    expect(normalizePrimaryLanguage("en", ["ar", "en"])).toBe("en");
  });

  test("one language fills both sides of every pair, nested too", () => {
    const input = {
      nameEn: "Acme",
      nameAr: "",
      address_en: "Road 1",
      items: [{ titleEn: "A" }],
      count: 3,
    };
    expect(mirrorBilingual(input, ["en"])).toEqual({
      nameEn: "Acme",
      nameAr: "Acme",
      address_en: "Road 1",
      address_ar: "Road 1",
      items: [{ titleEn: "A", titleAr: "A" }],
      count: 3,
    });
    expect(mirrorBilingual({ nameAr: "أكمي", nameEn: "old" }, ["ar"])).toEqual({
      nameAr: "أكمي",
      nameEn: "أكمي",
    });
  });

  test("both languages leave the pairs alone", () => {
    const input = { nameEn: "Acme", nameAr: "" };
    expect(mirrorBilingual(input, ["ar", "en"])).toBe(input);
  });

  test("text falls back to the other language when a side is empty", () => {
    expect(pickText("Hello", "", "ar")).toBe("Hello");
    expect(pickText("Hello", "مرحبا", "ar")).toBe("مرحبا");
    expect(pickText(null, undefined, "en")).toBe("");
  });
});

describe("activity presets", () => {
  test("every activity has a complete, valid preset", () => {
    const modules = new Set(DEFAULT_FEATURE_MODULES.map((m) => m.moduleKey));
    const styles = new Set(STYLE_PRESETS.map((s) => s.id));
    for (const activity of BUSINESS_ACTIVITIES) {
      const preset = ACTIVITY_PRESETS[activity];
      expect(styles.has(preset.stylePreset), activity).toBe(true);
      expect(RESERVED_COLLECTION_SLUGS).not.toContain(preset.collection.slug);
      expect(preset.sections).not.toContain("cta");
      for (const key of Object.keys(preset.modules))
        expect(modules.has(key as never), `${activity} ${key}`).toBe(true);
    }
  });

  test("the recommended config validates and keeps every section once", () => {
    for (const activity of BUSINESS_ACTIVITIES) {
      const config = websiteConfigForActivity(activity);
      expect(validateWebsiteConfig(JSON.parse(JSON.stringify(config)))).toEqual(
        config,
      );
      expect(config.sections.map((s) => s.id).sort()).toEqual(
        [...websiteSections].sort(),
      );
      expect(config.sections.filter((s) => s.visible).map((s) => s.id)).toEqual(
        [...ACTIVITY_PRESETS[activity].sections],
      );
    }
  });

  test("a non-media website never reads like a film studio", () => {
    for (const activity of BUSINESS_ACTIVITIES.filter((a) => a !== "media")) {
      for (const locale of ["en", "ar"] as const) {
        const t = getWebsiteTranslations(locale, activity);
        const shown = [
          t.portfolio.badge,
          t.portfolio.title,
          t.portfolio.subtitle,
          t.portfolio.viewProject,
          t.portfolio.filterAll,
          t.portfolio.allWork,
          t.portfolio.backToWorks,
          t.portfolio.productionOverview,
          t.nav.works,
          t.hero.caption,
          t.hero.explore,
          t.hero.ideaAction,
          t.about.title,
          t.about.headline,
          t.about.badge,
          t.about.pillars.badge,
          t.about.pillars.title,
          t.about.stats.badge,
          t.about.discoverStudio,
          t.about.behindTheScenes,
          t.about.studioImageAlt,
          t.services.badge,
          t.services.title,
          t.services.subtitle,
          t.faq.headline,
          t.faq.subtitle,
          t.reviews.headline,
          t.reviews.subtitle,
          t.reviews.modal.subtitle,
          t.reviews.modal.quotePlaceholder,
          t.footer.invitationTitle,
          t.footer.invitationAction,
          t.cta.requestTreatment,
          t.contact.intents,
          t.contact.messagePlaceholder,
          t.contact.shootLocation,
          t.contact.shootLocationPlaceholder,
          t.contact.projectRefPlaceholder,
          t.contact.directStudioLine,
        ];
        const words = JSON.stringify(shown);
        expect(words, `${activity} ${locale}`).not.toMatch(
          /cinema|film|shoot|production|سينما|سينمائي|تصوير|إنتاج/i,
        );
      }
    }
  });

  test("activity copy has the same keys in both languages", () => {
    const shape = (value: unknown): unknown =>
      value && typeof value === "object" && !Array.isArray(value)
        ? Object.fromEntries(
            Object.entries(value)
              .map(([k, v]) => [k, shape(v)])
              .sort(),
          )
        : typeof value;
    for (const activity of BUSINESS_ACTIVITIES)
      expect(shape(websiteActivityCopy("ar", activity)), activity).toEqual(
        shape(websiteActivityCopy("en", activity)),
      );
  });

  test("explicit media wording is separate from neutral defaults and company overrides win", () => {
    expect(getWebsiteTranslations("en", "media")).not.toEqual(
      getTranslations("en"),
    );
    expect(
      getWebsiteTranslations("en", "products", { nav: { works: "Shop" } }).nav
        .works,
    ).toBe("Shop");
    expect(
      getWebsiteTranslations("en", "products", { nav: { works: "" } }).nav
        .works,
    ).toBe("Products");
  });
});

describe("website config", () => {
  test("unspecified drafts resolve to a neutral website", () => {
    const resolved = resolveWebsiteConfig(defaultWebsiteConfig);
    expect(resolved.purpose).toBe("other");
    expect(resolved.collection.slug).toBe(ACTIVITY_PRESETS.other.collection.slug);
    expect(resolved.inquiry.budget).toBe(ACTIVITY_PRESETS.other.inquiry.budget);
    expect(resolved.showEquipment).toBe(false);
  });

  test("bad catalogue addresses and settings are rejected", () => {
    const config = websiteConfigForActivity("products");
    const withSlug = (slug: string) => ({
      ...config,
      collection: { ...config.collection!, slug },
    });
    expect(() => validateWebsiteConfig(withSlug("about"))).toThrow();
    expect(() => validateWebsiteConfig(withSlug("Our Products"))).toThrow();
    expect(() => validateWebsiteConfig(withSlug("-x"))).toThrow();
    expect(validateWebsiteConfig(withSlug("shop")).collection?.slug).toBe(
      "shop",
    );
    expect(() =>
      validateWebsiteConfig({ ...config, purpose: "casino" }),
    ).toThrow();
    expect(() =>
      validateWebsiteConfig({ ...config, heroStyle: "huge" }),
    ).toThrow();
    expect(() =>
      validateWebsiteConfig({ ...config, inquiry: { budget: "yes" } }),
    ).toThrow();
    expect(() =>
      validateWebsiteConfig({
        ...config,
        collection: { ...config.collection!, navEn: "" },
      }),
    ).toThrow();
  });
});

describe("website catalogue copy", () => {
  test("prices use the currency's decimals only when needed", () => {
    expect(formatPrice(289.5, "SAR", "en")).toBe("SAR 289.50");
    expect(formatPrice(145, "SAR", "en")).toBe("SAR 145");
    expect(formatPrice(12.5, "BHD", "en")).toBe("BHD 12.500");
    expect(formatPrice(12.5, "BHD", "ar")).toBe("12.500 د.ب");
  });

  test("the company's catalogue names and address replace the activity's", () => {
    const collection = {
      ...websiteConfigForActivity("products").collection!,
      slug: "shop",
      navEn: "Shop",
      titleAr: "متجرنا",
    };
    expect(siteCopyOverrides({ collection }, "en").nav?.works).toBe("Shop");
    expect(siteCopyOverrides({ collection }, "ar").portfolio?.title).toBe(
      "متجرنا",
    );
    expect(collectionHref({ collection }, "en", "oak desk")).toBe(
      "/en/shop/oak%20desk",
    );
  });
});
