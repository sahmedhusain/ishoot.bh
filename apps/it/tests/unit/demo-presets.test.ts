import { describe, expect, test } from "vitest";
import { DEMO_PRESETS, demoPreset } from "../../../../company/seed/demo-presets";
import { ACTIVITY_PRESETS, BUSINESS_ACTIVITIES } from "@platform/database/website-presets";
import { DEFAULT_FEATURE_MODULES } from "@platform/database/constants/features";
import { STYLE_PRESETS } from "@platform/database/constants/theme";
import { validateWebsiteConfig } from "@platform/database/website-config";
import { ACTIVITY_SAMPLES } from "@platform/database/samples/activity-samples";

describe("company demo presets", () => {
  test("every business preset has valid content, settings and recommended modules", () => {
    expect(DEMO_PRESETS).toEqual([...BUSINESS_ACTIVITIES, "all"]);
    for (const activity of BUSINESS_ACTIVITIES) {
      const demo = demoPreset(activity);
      const expected = ACTIVITY_PRESETS[activity];
      expect(demo.activity).toBe(activity);
      expect(demo.style).toBe(expected.stylePreset);
      expect(demo.website.collection?.slug).toBe(expected.collection.slug);
      expect(demo.website.heroStyle).toBe(expected.heroStyle);
      expect(demo.website.inquiry).toEqual(expected.inquiry);
      expect(demo.website.sections.filter((section) => section.visible).map((section) => section.id)).toEqual(expected.sections);
      expect(() => validateWebsiteConfig(demo.website)).not.toThrow();
      for (const [key, enabled] of Object.entries(expected.modules)) expect(demo.modules.find((module) => module.moduleKey === key)?.isEnabled).toBe(enabled);
      expect(ACTIVITY_SAMPLES[activity].items.length).toBeGreaterThanOrEqual(4);
      expect(ACTIVITY_SAMPLES[activity].services.length).toBeGreaterThanOrEqual(3);
      expect(ACTIVITY_SAMPLES[activity].items.every((item) => item.title.every(Boolean) && item.subtitle.every(Boolean))).toBe(true);
    }
  });

  test("combined demo enables every module, section, page and activity", () => {
    const demo = demoPreset("all");
    expect(demo.activities).toEqual(BUSINESS_ACTIVITIES);
    expect(demo.modules.map((module) => module.moduleKey)).toEqual(DEFAULT_FEATURE_MODULES.map((module) => module.moduleKey));
    expect(demo.modules.every((module) => module.isEnabled)).toBe(true);
    expect(demo.website.sections.every((section) => section.visible)).toBe(true);
    expect(demo.website.pages?.every((page) => page.visible)).toBe(true);
    expect(Object.values(demo.website.inquiry!).every(Boolean)).toBe(true);
    expect(() => validateWebsiteConfig(demo.website)).not.toThrow();
  });

  test("all visual styles can be selected without changing the business preset", () => {
    for (const style of STYLE_PRESETS) {
      const demo = demoPreset("products", style.id);
      expect(demo.style).toBe(style.id);
      expect(demo.theme.primary).toBe(style.theme.primary);
      expect(demo.website.purpose).toBe("products");
    }
    expect(() => demoPreset("typo")).toThrow("Unknown demo preset");
    expect(() => demoPreset("all", "typo")).toThrow("Unknown demo style");
  });
});
